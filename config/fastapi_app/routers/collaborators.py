"""Collaborators router."""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Prefetch
from uuid import UUID
from celery import current_app

from notes.models import Note, NoteCollaborator
from notes.tasks import send_note_invite_email
from fastapi_app.schemas.collaborators import (
    CollaboratorInviteRequest,
    CollaboratorPermissionUpdate,
    NoteCollaboratorResponse,
    CollaboratorsListResponse,
    NoteOwner,
    InvitationResponse,
    ErrorResponse,
)
from fastapi_app.utils.auth import get_current_user

User = get_user_model()
router = APIRouter(prefix="/api", tags=["collaborators"])


@router.get(
    "/notes/{note_id}/collaborators",
    response_model=CollaboratorsListResponse,
    status_code=status.HTTP_200_OK,
    responses={
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    }
)
def get_note_collaborators(
    note_id: UUID,
    current_user = Depends(get_current_user)
):
    
    try:
        note = Note.objects.select_related('created_by').get(id=note_id)
    except Note.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Check if user can view this note
    if note.created_by_id != current_user.id:
        # Check if user is a collaborator with accepted status
        collab = NoteCollaborator.objects.filter(
            note=note,
            user=current_user,
            status=NoteCollaborator.Status.ACCEPTED
        ).first()
        if not collab:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this note"
            )
    
    # Get all accepted collaborators
    collaborators = (
        NoteCollaborator.objects.filter(
            note=note
        ).exclude(
            status=NoteCollaborator.Status.DECLINED
        ).select_related('user', 'invited_by').order_by('-created_at')
    )
    
    collab_list = [
        NoteCollaboratorResponse(
            id=str(c.id),
            user={
                "id": str(c.user.id),
                "username": c.user.username,
                "email": c.user.email or ""
            },
            permission=c.permission,
            status=c.status,
            invited_by={
                "id": str(c.invited_by.id),
                "username": c.invited_by.username,
                "email": c.invited_by.email or ""
            },
            created_at=c.created_at,
            responded_at=c.responded_at
        )
        for c in collaborators
    ]
    
    return CollaboratorsListResponse(
        owner={
            "id": str(note.created_by.id),
            "username": note.created_by.username,
            "email": note.created_by.email or ""
        },
        collaborators=collab_list
    )


@router.post(
    "/notes/{note_id}/collaborators",
    response_model=NoteCollaboratorResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    }
)
def add_collaborator(
    note_id: UUID,
    data: CollaboratorInviteRequest,
    current_user = Depends(get_current_user)
):
    try:
        note = Note.objects.select_related('created_by').get(id=note_id)
    except Note.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Check if user is the owner
    if note.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can invite collaborators"
        )
    
    # Find user by email
    email = data.email.strip().lower()
    user = User.objects.filter(email__iexact=email, is_verified=True).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verified user found with that email"
        )
    
    # Check if trying to add self
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add yourself as a collaborator"
        )
    
    # Check if already a collaborator
    collab = NoteCollaborator.objects.filter(note=note, user=user).first()
    created = False
    
    if not collab:
        collab = NoteCollaborator(
            note=note,
            user=user,
            invited_by=current_user,
            permission=data.permission
        )
        created = True
    else:
        collab.invited_by = current_user
        collab.permission = data.permission
        if collab.status != NoteCollaborator.Status.ACCEPTED:
            collab.status = NoteCollaborator.Status.PENDING
            collab.responded_at = None
    collab.save()
    try:
        if (user.email or "").strip():
            send_note_invite_email.delay(
                user.email,
                note.title,
                current_user.username,
                data.permission
            )
    except Exception:
        pass
    
    response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    
    return NoteCollaboratorResponse(
        id=str(collab.id),
        user={
            "id": str(collab.user.id),
            "username": collab.user.username,
            "email": collab.user.email or ""
        },
        permission=collab.permission,
        status=collab.status,
        invited_by={
            "id": str(collab.invited_by.id),
            "username": collab.invited_by.username,
            "email": collab.invited_by.email or ""
        },
        created_at=collab.created_at,
        responded_at=collab.responded_at
    )


@router.patch(
    "/notes/{note_id}/collaborators/{user_id}",
    response_model=NoteCollaboratorResponse,
    status_code=status.HTTP_200_OK,
    responses={
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    }
)
def update_collaborator_permission(
    note_id: UUID,
    user_id: UUID,
    data: CollaboratorPermissionUpdate,
    current_user = Depends(get_current_user)
):
    
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Check if user is the owner
    if note.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can manage collaborators"
        )
    
    try:
        collab = NoteCollaborator.objects.select_related(
            'user', 'invited_by'
        ).get(note=note, user_id=user_id)
    except NoteCollaborator.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found"
        )
    
    collab.permission = data.permission
    collab.save(update_fields=['permission'])
    
    return NoteCollaboratorResponse(
        id=str(collab.id),
        user={
            "id": str(collab.user.id),
            "username": collab.user.username,
            "email": collab.user.email or ""
        },
        permission=collab.permission,
        status=collab.status,
        invited_by={
            "id": str(collab.invited_by.id),
            "username": collab.invited_by.username,
            "email": collab.invited_by.email or ""
        },
        created_at=collab.created_at,
        responded_at=collab.responded_at
    )


@router.delete(
    "/notes/{note_id}/collaborators/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    }
)
def remove_collaborator(
    note_id: UUID,
    user_id: UUID,
    current_user = Depends(get_current_user)
):
    try:
        note = Note.objects.get(id=note_id)
    except Note.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # Check if user is the owner
    if note.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can manage collaborators"
        )
    
    try:
        collab = NoteCollaborator.objects.get(note=note, user_id=user_id)
    except NoteCollaborator.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found"
        )
    
    collab.delete()


@router.get(
    "/invitations",
    response_model=List[InvitationResponse],
    status_code=status.HTTP_200_OK
)
def get_pending_invitations(current_user = Depends(get_current_user)):
    
    invitations = (
        NoteCollaborator.objects.filter(
            user=current_user,
            status=NoteCollaborator.Status.PENDING
        ).select_related('note', 'invited_by').order_by('-created_at')
    )
    
    invite_list = [
        InvitationResponse(
            id=str(inv.id),
            note={
                "id": str(inv.note.id),
                "title": inv.note.title
            },
            permission=inv.permission,
            created_at=inv.created_at,
            from_user={
                "id": str(inv.invited_by.id),
                "username": inv.invited_by.username
            }
        )
        for inv in invitations
    ]
    
    return invite_list


@router.post(
    "/invitations/{invite_id}/accept",
    response_model=InvitationResponse,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"model": ErrorResponse},
    }
)
def accept_invitation(
    invite_id: UUID,
    current_user = Depends(get_current_user)
):
    
    try:
        invitation = NoteCollaborator.objects.select_related(
            'note', 'invited_by'
        ).get(
            id=invite_id,
            user=current_user,
            status=NoteCollaborator.Status.PENDING
        )
    except NoteCollaborator.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    invitation.status = NoteCollaborator.Status.ACCEPTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['status', 'responded_at'])
    
    return InvitationResponse(
        id=str(invitation.id),
        note={
            "id": str(invitation.note.id),
            "title": invitation.note.title
        },
        permission=invitation.permission,
        created_at=invitation.created_at,
        from_user={
            "id": str(invitation.invited_by.id),
            "username": invitation.invited_by.username
        }
    )


@router.post(
    "/invitations/{invite_id}/decline",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": ErrorResponse},
    }
)
def decline_invitation(
    invite_id: UUID,
    current_user = Depends(get_current_user)
):
    
    try:
        invitation = NoteCollaborator.objects.get(
            id=invite_id,
            user=current_user,
            status=NoteCollaborator.Status.PENDING
        )
    except NoteCollaborator.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    invitation.status = NoteCollaborator.Status.DECLINED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=['status', 'responded_at'])

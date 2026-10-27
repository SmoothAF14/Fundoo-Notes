from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.vary import vary_on_headers
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import OpenApiResponse, extend_schema

from .models import Note, NoteCollaborator
from .serializers import (
    visible_email,
    CollaboratorPermissionUpdateSerializer,
    CollaboratorUpsertSerializer,
    InvitationSerializer,
    NoteCollaboratorSerializer,
    NoteDetailResponseSerializer,
    NoteListItemSerializer,
    NotesListResponseSerializer,
    NoteSerializer,
)
from .tasks import send_note_invite_email, send_note_reminder


User = get_user_model()


def _get_collaboration(note: Note, user) -> NoteCollaborator | None:
    return (
        NoteCollaborator.objects.filter(
            note=note,
            user=user,
            status=NoteCollaborator.Status.ACCEPTED,
        )
        .only('permission', 'status')
        .first()
    )


def _ensure_can_view(note: Note, user) -> None:
    if note.created_by_id == getattr(user, 'id', None):
        return
    # A trashed note is private to its owner until it is restored.
    if note.trashed or _get_collaboration(note, user) is None:
        raise PermissionError('Not permitted')


def _save_note(serializer, data, **extra):
    """Save, and when the reminder changed, reset its sent flag and schedule the email for that time."""
    if 'reminder_at' in data:
        extra['reminder_sent_at'] = None
    note = serializer.save(**extra)
    if 'reminder_at' in data and note.reminder_at and note.reminder_at > timezone.now():
        when = note.reminder_at
        transaction.on_commit(lambda: send_note_reminder.apply_async(args=[str(note.id), when.isoformat()], eta=when))
    return note


# Fields an edit collaborator may change; labels, pin, colour, archive, reminder and trash are the owner's.
COLLABORATOR_FIELDS = {'title', 'content'}


def _check_trash_rules(note: Note, user, data) -> None:
    """Owner-only settings stay owner-only, and a trashed note can't be edited until restored."""
    from rest_framework.exceptions import PermissionDenied, ValidationError

    if note.created_by_id != getattr(user, 'id', None) and set(data.keys()) - COLLABORATOR_FIELDS:
        raise PermissionDenied('Only the owner can change labels, colour, pin, archive, reminders or trash')
    if note.trashed and set(data.keys()) - {'trashed'}:
        raise ValidationError({'detail': 'Restore this note from the trash before editing it.'})


def _ensure_can_edit(note: Note, user) -> None:
    if note.created_by_id == getattr(user, 'id', None):
        return
    collab = _get_collaboration(note, user)
    if not collab or collab.permission != NoteCollaborator.Permission.EDIT:
        raise PermissionError('Not permitted')


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class NotesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: NotesListResponseSerializer})
    def get(self, request):
        user = request.user
        notes = (
            Note.objects.filter(
                Q(created_by=user)
                | Q(
                    collaborations__user=user,
                    collaborations__status=NoteCollaborator.Status.ACCEPTED,
                    trashed_at__isnull=True,
                )
            )
            .distinct()
            .select_related('created_by')
            .prefetch_related(
                'labels',
                Prefetch(
                    'collaborations',
                    queryset=NoteCollaborator.objects.filter(
                        status=NoteCollaborator.Status.ACCEPTED,
                    ).select_related('user'),
                    to_attr='accepted_collabs',
                ),
                Prefetch(
                    'collaborations',
                    queryset=NoteCollaborator.objects.filter(
                        user=user,
                        status=NoteCollaborator.Status.ACCEPTED,
                    ),
                    to_attr='collab_for_user',
                ),
            )
        )
        payload = NoteListItemSerializer(notes, many=True, context={'request': request}).data
        return Response(
            {
                'message': 'Notes fetched',
                'payload': payload,
                'status_code': status.HTTP_200_OK,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(request=NoteSerializer, responses={201: NoteSerializer})
    def post(self, request):
        serializer = NoteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        _save_note(serializer, request.data, created_by=request.user, updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class NoteDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, id):
        user = request.user
        note = get_object_or_404(
            Note.objects.select_related('created_by').prefetch_related('labels'),
            id=id,
        )
        try:
            _ensure_can_view(note, user)
        except PermissionError:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('You do not have access to this note')
        return note

    @extend_schema(responses={200: NoteDetailResponseSerializer})
    def get(self, request, id):
        note = self.get_object(request, id)
        payload = NoteSerializer(note, context={'request': request}).data
        return Response(
            {
                'message': 'Note fetched',
                'payload': payload,
                'status_code': status.HTTP_200_OK,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(request=NoteSerializer, responses={200: NoteSerializer})
    def put(self, request, id):
        note = self.get_object(request, id)
        try:
            _ensure_can_edit(note, request.user)
        except PermissionError:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('You do not have permission to edit this note')
        _check_trash_rules(note, request.user, request.data)
        serializer = NoteSerializer(note, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        _save_note(serializer, request.data, created_by=note.created_by, updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=NoteSerializer, responses={200: NoteSerializer})
    def patch(self, request, id):
        note = self.get_object(request, id)
        try:
            _ensure_can_edit(note, request.user)
        except PermissionError:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('You do not have permission to edit this note')
        _check_trash_rules(note, request.user, request.data)
        serializer = NoteSerializer(
            note,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        _save_note(serializer, request.data, created_by=note.created_by, updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(request=None, responses={204: OpenApiResponse(description='Deleted')})
    def delete(self, request, id):
        note = self.get_object(request, id)
        if note.created_by_id != getattr(request.user, 'id', None):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('Only the owner can delete this note')
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class NoteCollaboratorsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_note(self, request, id) -> Note:
        note = get_object_or_404(Note.objects.select_related('created_by'), id=id)
        try:
            _ensure_can_view(note, request.user)
        except PermissionError:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('You do not have access to this note')
        return note

    @extend_schema(responses={200: NoteCollaboratorSerializer(many=True)})
    def get(self, request, id):
        note = self.get_note(request, id)
        qs = (
            NoteCollaborator.objects.filter(note=note).exclude(status=NoteCollaborator.Status.DECLINED)
            .select_related('user', 'invited_by')
            .order_by('-created_at')
        )
        viewer = request.user
        return Response(
            {
                'owner': {
                    'id': str(getattr(note.created_by, 'id', note.created_by_id)),
                    'username': note.created_by.username,
                    'email': visible_email(note.created_by, viewer, note),
                },
                'collaborators': NoteCollaboratorSerializer(qs, many=True, context={'viewer': viewer, 'note': note}).data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(request=CollaboratorUpsertSerializer, responses={201: NoteCollaboratorSerializer})
    def post(self, request, id):
        note = self.get_note(request, id)
        if note.created_by_id != getattr(request.user, 'id', None):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('Only the owner can invite collaborators')

        serializer = CollaboratorUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        permission = serializer.validated_data['permission']

        user = User.objects.filter(email__iexact=email, is_verified=True).first()
        if not user:
            return Response({'detail': 'No verified user found with that email'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(user, 'id', None) == getattr(request.user, 'id', None):
            return Response({'detail': 'You cannot add yourself as a collaborator'}, status=status.HTTP_400_BAD_REQUEST)

        collab = NoteCollaborator.objects.filter(note=note, user=user).first()
        created = False
        if not collab:
            collab = NoteCollaborator(note=note, user=user, invited_by=request.user)
            created = True

        collab.invited_by = request.user
        collab.permission = permission
        if collab.status != NoteCollaborator.Status.ACCEPTED:
            collab.status = NoteCollaborator.Status.PENDING
            collab.responded_at = None
        collab.save()

        try:
            if (user.email or '').strip():
                send_note_invite_email.delay(user.email, note.title, request.user.username, permission)
        except Exception:
            # Non-blocking
            pass

        return Response(NoteCollaboratorSerializer(collab).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class NoteCollaboratorDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_note_owner(self, request, id) -> Note:
        note = get_object_or_404(Note, id=id)
        if note.created_by_id != getattr(request.user, 'id', None):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('Only the owner can manage collaborators')
        return note

    @extend_schema(request=CollaboratorPermissionUpdateSerializer, responses={200: NoteCollaboratorSerializer})
    def patch(self, request, id, user_id):
        note = self.get_note_owner(request, id)
        collab = get_object_or_404(NoteCollaborator, note=note, user_id=user_id)
        serializer = CollaboratorPermissionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        collab.permission = serializer.validated_data['permission']
        collab.save(update_fields=['permission'])
        return Response(NoteCollaboratorSerializer(collab).data, status=status.HTTP_200_OK)

    @extend_schema(request=None, responses={204: OpenApiResponse(description='Removed')})
    def delete(self, request, id, user_id):
        note = self.get_note_owner(request, id)
        collab = get_object_or_404(NoteCollaborator, note=note, user_id=user_id)
        collab.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class PendingInvitationsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: InvitationSerializer(many=True)})
    def get(self, request):
        invites = (
            NoteCollaborator.objects.filter(user=request.user, status=NoteCollaborator.Status.PENDING)
            .select_related('note', 'invited_by')
            .order_by('-created_at')
        )
        return Response(InvitationSerializer(invites, many=True).data, status=status.HTTP_200_OK)


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class InvitationAcceptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: InvitationSerializer})
    def post(self, request, invite_id):
        inv = get_object_or_404(
            NoteCollaborator.objects.select_related('note', 'invited_by'),
            id=invite_id,
            user=request.user,
            status=NoteCollaborator.Status.PENDING,
        )
        inv.status = NoteCollaborator.Status.ACCEPTED
        inv.responded_at = timezone.now()
        inv.save(update_fields=['status', 'responded_at'])
        return Response(InvitationSerializer(inv).data, status=status.HTTP_200_OK)


@method_decorator(vary_on_headers('Authorization', 'Cookie'), name='dispatch')
class InvitationDeclineAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: OpenApiResponse(description='Declined')})
    def post(self, request, invite_id):
        inv = get_object_or_404(
            NoteCollaborator,
            id=invite_id,
            user=request.user,
            status=NoteCollaborator.Status.PENDING,
        )
        inv.status = NoteCollaborator.Status.DECLINED
        inv.responded_at = timezone.now()
        inv.save(update_fields=['status', 'responded_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)

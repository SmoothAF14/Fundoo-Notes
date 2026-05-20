"""Schemas for collaborator endpoints."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from fastapi_app.schemas.common import UserSummary, Permission, Status


class CollaboratorInviteRequest(BaseModel):
    """Request schema for inviting a collaborator."""
    email: EmailStr
    permission: Permission


class CollaboratorPermissionUpdate(BaseModel):
    """Request schema for updating collaborator permission."""
    permission: Permission


class NoteOwner(BaseModel):
    """Note owner information."""
    id: str
    username: str
    email: Optional[str] = ""


class NoteCollaboratorResponse(BaseModel):
    """Response schema for a collaborator."""
    id: str
    user: UserSummary
    permission: Permission
    status: Status
    invited_by: UserSummary
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CollaboratorsListResponse(BaseModel):
    """Response schema for getting collaborators of a note."""
    owner: NoteOwner
    collaborators: list[NoteCollaboratorResponse]


class NoteInfo(BaseModel):
    """Minimal note information for invitations."""
    id: str
    title: str


class InvitedByInfo(BaseModel):
    """Information about who invited."""
    id: str
    username: str


class InvitationResponse(BaseModel):
    """Response schema for an invitation."""
    id: str
    note: NoteInfo
    permission: Permission
    created_at: datetime
    from_user: InvitedByInfo

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    """Response schema for errors."""
    detail: str

"""Schemas for collaborator endpoints."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from fastapi_app.schemas.common import UserSummary, Permission, Status


class CollaboratorInviteRequest(BaseModel):
    email: EmailStr
    permission: Permission


class CollaboratorPermissionUpdate(BaseModel):
   permission: Permission


class NoteOwner(BaseModel):
    id: str
    username: str
    email: Optional[str] = ""


class NoteCollaboratorResponse(BaseModel):
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
    owner: NoteOwner
    collaborators: list[NoteCollaboratorResponse]


class NoteInfo(BaseModel):
    id: str
    title: str


class InvitedByInfo(BaseModel):
    id: str
    username: str


class InvitationResponse(BaseModel):
    id: str
    note: NoteInfo
    permission: Permission
    created_at: datetime
    from_user: InvitedByInfo

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    detail: str

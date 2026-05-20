"""Common schemas for FastAPI."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserSummary(BaseModel):
    """Summary of a user."""
    id: str
    username: str
    email: Optional[str] = ""

    class Config:
        from_attributes = True


class Permission(str, Enum):
    """Permission levels for collaborators."""
    VIEW = "view"
    EDIT = "edit"


class Status(str, Enum):
    """Status of a collaboration."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

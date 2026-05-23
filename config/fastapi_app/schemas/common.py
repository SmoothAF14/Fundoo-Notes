from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserSummary(BaseModel):
    
    id: str
    username: str
    email: Optional[str] = ""

    class Config:
        from_attributes = True


class Permission(str, Enum):
    
    VIEW = "view"
    EDIT = "edit"


class Status(str, Enum):
    
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

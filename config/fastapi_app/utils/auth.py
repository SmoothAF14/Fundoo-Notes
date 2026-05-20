"""Authentication utilities for FastAPI."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from django.contrib.auth import get_user_model

from users.jwt_utils import decode_access_token

User = get_user_model()
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get the current authenticated user from JWT token or Django session.
    
    Args:
        credentials: HTTP Bearer credentials containing the JWT token
        
    Returns:
        The authenticated User object
        
    Raises:
        HTTPException: If token is invalid or user is not found
    """
    token = credentials.credentials
    
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id") or payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Get user from database (run synchronously; FastAPI will execute in threadpool)
    try:
        user = User.objects.get(user_id=user_id)
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not verified"
            )
        return user
    except User.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

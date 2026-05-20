from __future__ import annotations

from datetime import timedelta

import jwt
from django.conf import settings
from django.utils import timezone


def _jwt_algorithm() -> str:
    return getattr(settings, 'JWT_ALGORITHM', 'HS256')


def _jwt_lifetime_seconds() -> int:
    return int(getattr(settings, 'JWT_ACCESS_TOKEN_LIFETIME_SECONDS', 7 * 24 * 60 * 60))


def create_access_token(user) -> str:
    now = timezone.now()
    expires_at = now + timedelta(seconds=_jwt_lifetime_seconds())
    payload = {
        'token_type': 'access',
        'sub': str(user.id),
        'user_id': str(user.id),
        'username': user.username,
        'email': (user.email or ''),
        'phone_number': getattr(user, 'phone_number', None),
        'is_verified': bool(getattr(user, 'is_verified', False)),
        'iat': int(now.timestamp()),
        'exp': int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=_jwt_algorithm())
    return token.decode('utf-8') if isinstance(token, bytes) else token


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[_jwt_algorithm()],
        options={'require': ['exp', 'iat', 'sub', 'user_id']},
    )
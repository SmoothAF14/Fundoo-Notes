"""The access token travels in an httpOnly cookie so page scripts (and any XSS) can't read it."""
from __future__ import annotations

from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.response import Response

from .jwt_utils import create_access_token

AUTH_COOKIE = 'fundoo_session'


def user_payload(user) -> dict:
    return {
        'id': str(user.id),
        'username': user.username,
        'email': user.email,
        'phone_number': user.phone_number,
    }


def signed_in_response(request, user, http_status=status.HTTP_200_OK) -> Response:
    response = Response(user_payload(user), status=http_status)
    response.set_cookie(
        AUTH_COOKIE,
        create_access_token(user),
        max_age=int(getattr(settings, 'JWT_ACCESS_TOKEN_LIFETIME_SECONDS', 7 * 24 * 60 * 60)),
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path='/',
    )
    # Make sure the browser has a CSRF cookie to echo back on writes.
    get_token(request)
    return response


def clear_auth_cookie(response: Response) -> Response:
    response.delete_cookie(AUTH_COOKIE, path='/', samesite='Lax')
    return response

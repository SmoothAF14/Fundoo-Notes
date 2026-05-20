from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .jwt_utils import decode_access_token


User = get_user_model()


class JWTAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if not header:
            return None

        if len(header) != 2:
            raise AuthenticationFailed('Invalid authorization header')

        scheme = header[0].decode('utf-8')
        token = header[1].decode('utf-8')

        if scheme.lower() != self.keyword.lower():
            return None

        try:
            payload = decode_access_token(token)
        except Exception as exc:
            raise AuthenticationFailed('Invalid token') from exc

        user_id = payload.get('user_id') or payload.get('sub')
        if not user_id:
            raise AuthenticationFailed('Invalid token')

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist as exc:
            raise AuthenticationFailed('User not found') from exc

        if not user.is_verified:
            raise AuthenticationFailed('User is not verified')

        return (user, payload)
from __future__ import annotations

import hmac

from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication, CSRFCheck, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from .auth_cookie import AUTH_COOKIE

from .jwt_utils import decode_access_token, password_fingerprint


User = get_user_model()


class JWTAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate_header(self, request):
        # Without this DRF downgrades auth failures to 403, hiding "session expired" from clients.
        return self.keyword

    def authenticate(self, request):
        header = get_authorization_header(request).split()
        if not header:
            token = request.COOKIES.get(AUTH_COOKIE)
            if not token:
                return None
            try:
                user, payload = self._authenticate_token(token)
            except AuthenticationFailed:
                # A stale cookie must not block signing in again: treat it as signed out.
                return None
            # Browsers send cookies automatically, so cookie-authenticated writes need CSRF proof.
            self._enforce_csrf(request)
            return (user, payload)

        if len(header) != 2:
            raise AuthenticationFailed('Invalid authorization header')

        try:
            scheme = header[0].decode('utf-8')
            token = header[1].decode('utf-8')
        except UnicodeDecodeError as exc:
            raise AuthenticationFailed('Invalid authorization header') from exc

        if scheme.lower() != self.keyword.lower():
            return None
        return self._authenticate_token(token)

    def _enforce_csrf(self, request):
        check = CSRFCheck(lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise PermissionDenied(f'CSRF Failed: {reason}')

    def _authenticate_token(self, token):
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

        if not user.is_active:
            raise AuthenticationFailed('User account is disabled')

        if payload.get('token_type') != 'access' or not hmac.compare_digest(
            str(payload.get('pwd', '')), password_fingerprint(user)
        ):
            raise AuthenticationFailed('Session expired. Please sign in again.')

        return (user, payload)
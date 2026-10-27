"""One-time codes stored on the user: one purpose per code, limited attempts, constant-time compare."""
from __future__ import annotations

import hmac
import secrets
from datetime import timedelta

from django.utils import timezone

OTP_TTL_SECONDS = 5 * 60
MAX_OTP_ATTEMPTS = 5

_OTP_FIELDS = ['otp', 'otp_created_at', 'otp_purpose', 'otp_attempts']


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def issue_user_otp(user, purpose: str) -> str:
    """Store a fresh code for `purpose` ('login' / 'reset'), replacing any previous one."""
    user.otp = new_code()
    user.otp_created_at = timezone.now()
    user.otp_purpose = purpose
    user.otp_attempts = 0
    user.save(update_fields=_OTP_FIELDS)
    return user.otp


def _clear(user) -> None:
    user.otp = None
    user.otp_created_at = None
    user.otp_purpose = None
    user.otp_attempts = 0
    user.save(update_fields=_OTP_FIELDS)


def consume_user_otp(user, purpose: str, entered: str) -> bool:
    """True (and the code is used up) only for a live code of this purpose. Wrong guesses count."""
    if not user or not user.otp or not user.otp_created_at or user.otp_purpose != purpose:
        return False
    if user.otp_created_at + timedelta(seconds=OTP_TTL_SECONDS) <= timezone.now():
        _clear(user)
        return False
    if hmac.compare_digest(user.otp, (entered or '').strip()):
        _clear(user)
        return True
    user.otp_attempts += 1
    if user.otp_attempts >= MAX_OTP_ATTEMPTS:
        _clear(user)
    else:
        user.save(update_fields=['otp_attempts'])
    return False


def check_pending_otp(pending: dict, entered: str) -> bool | None:
    """For cached sign-up codes: True on match, False on a wrong guess, None once attempts run out."""
    if hmac.compare_digest((pending.get('otp') or '').strip(), (entered or '').strip()):
        return True
    pending['attempts'] = pending.get('attempts', 0) + 1
    return None if pending['attempts'] >= MAX_OTP_ATTEMPTS else False

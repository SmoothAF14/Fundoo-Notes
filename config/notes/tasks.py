from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_note_invite_email(email: str, note_title: str, invited_by: str, permission: str) -> str:
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or getattr(settings, 'EMAIL_HOST_USER', '')
    permission_label = 'Can edit' if permission == 'edit' else 'Can view'

    send_mail(
        'Fundoo Notes - Collaboration Invite',
        (
            f"You were invited by {invited_by} to collaborate on the note '{note_title}'.\n\n"
            f"Access: {permission_label}\n\n"
            "Open Fundoo Notes to accept or decline the invitation."
        ),
        from_email,
        [email],
        fail_silently=False,
    )

    return 'Invite sent'

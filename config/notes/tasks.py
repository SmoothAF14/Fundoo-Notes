from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.dateparse import parse_datetime


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


@shared_task
def send_note_reminder(note_id: str, reminder_iso: str) -> str:
    """Scheduled with eta=reminder_at. Skips reminders that changed, were removed, trashed or already sent."""
    from .models import Note

    when = parse_datetime(reminder_iso)
    # Claim the reminder atomically so a redelivered task can't send it twice.
    claimed = Note.objects.filter(
        id=note_id, reminder_at=when, reminder_sent_at__isnull=True, trashed_at__isnull=True
    ).update(reminder_sent_at=timezone.now())
    if not claimed:
        return 'skipped'

    note = Note.objects.select_related('created_by').get(id=note_id)
    email = (note.created_by.email or '').strip()
    if not email:
        return 'no email'
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or getattr(settings, 'EMAIL_HOST_USER', '')
    send_mail(
        f'Reminder: {note.title}',
        f"{note.title}\n\n{note.content}\n\nOpen Fundoo Notes to see your reminders.",
        from_email,
        [email],
        fail_silently=False,
    )
    return 'sent'

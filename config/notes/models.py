import uuid
from django.db import models
from django.conf import settings


# Note Model
class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title = models.CharField(max_length=100)
    title_id = models.UUIDField(default=uuid.uuid4, editable=False)

    content = models.TextField()

    labels = models.ManyToManyField(
        'label.Label',
        related_name='notes',
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes'
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='notes_updated',
        null=True,
        blank=True,
    )

    archived = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class NoteCollaborator(models.Model):
    class Permission(models.TextChoices):
        VIEW = 'view', 'Can view'
        EDIT = 'edit', 'Can edit'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='collaborations',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_collaborations',
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_invitations_sent',
    )

    permission = models.CharField(
        max_length=10,
        choices=Permission.choices,
        default=Permission.VIEW,
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['note', 'user'], name='unique_note_collaborator'),
        ]
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['note', 'status']),
        ]

    def __str__(self) -> str:
        return f"{self.note_id} -> {self.user_id} ({self.permission}/{self.status})"
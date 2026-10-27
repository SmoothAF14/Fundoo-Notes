import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


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

    class Color(models.TextChoices):
        DEFAULT = '', 'Default'
        CLAY = 'clay', 'Clay'
        SAND = 'sand', 'Sand'
        MOSS = 'moss', 'Moss'
        SAGE = 'sage', 'Sage'
        TIDE = 'tide', 'Tide'
        DUSK = 'dusk', 'Dusk'
        PLUM = 'plum', 'Plum'
        ROSE = 'rose', 'Rose'

    archived = models.BooleanField(default=False)
    pinned = models.BooleanField(default=False)
    color = models.CharField(max_length=16, choices=Color.choices, default=Color.DEFAULT, blank=True)
    reminder_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    trashed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    @property
    def trashed(self) -> bool:
        return self.trashed_at is not None

    @trashed.setter
    def trashed(self, value: bool) -> None:
        if not value:
            self.trashed_at = None
        elif self.trashed_at is None:
            self.trashed_at = timezone.now()

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
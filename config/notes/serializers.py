from django.contrib.auth import get_user_model
from rest_framework import serializers

from label.models import Label

from .models import Note, NoteCollaborator


User = get_user_model()


def visible_email(subject, viewer, note) -> str:
    """Only the note's owner sees collaborators' emails; everyone sees their own."""
    viewer_id = getattr(viewer, 'id', None)
    if viewer_id is not None and (viewer_id == note.created_by_id or viewer_id == getattr(subject, 'id', None)):
        return subject.email or ''
    return ''


class UserSummarySerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)


class NoteCollaboratorSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    invited_by = serializers.SerializerMethodField()

    class Meta:
        model = NoteCollaborator
        fields = ['id', 'user', 'permission', 'status', 'invited_by', 'created_at', 'responded_at']

    def _person(self, obj: NoteCollaborator, u):
        viewer = self.context.get('viewer')
        # Without a viewer (e.g. the owner's own invite response) show emails as before.
        email = visible_email(u, viewer, self.context.get('note') or obj.note) if viewer is not None else (u.email or '')
        return {'id': str(getattr(u, 'id', u.pk)), 'username': u.username, 'email': email}

    def get_user(self, obj: NoteCollaborator):
        return self._person(obj, obj.user)

    def get_invited_by(self, obj: NoteCollaborator):
        return self._person(obj, obj.invited_by)


class CollaboratorUpsertSerializer(serializers.Serializer):
    email = serializers.EmailField()
    permission = serializers.ChoiceField(choices=NoteCollaborator.Permission.choices)


class CollaboratorPermissionUpdateSerializer(serializers.Serializer):
    permission = serializers.ChoiceField(choices=NoteCollaborator.Permission.choices)


class InvitationSerializer(serializers.ModelSerializer):
    note = serializers.SerializerMethodField()
    from_user = serializers.SerializerMethodField()

    class Meta:
        model = NoteCollaborator
        fields = ['id', 'note', 'permission', 'created_at', 'from_user']

    def get_note(self, obj: NoteCollaborator):
        n = obj.note
        return {'id': str(n.id), 'title': n.title}

    def get_from_user(self, obj: NoteCollaborator):
        u = obj.invited_by
        return {'id': str(getattr(u, 'id', u.pk)), 'username': u.username}


class NoteSerializer(serializers.ModelSerializer):
    created_by = serializers.UUIDField(source='created_by_id', read_only=True)
    owner_username = serializers.CharField(source='created_by.username', read_only=True)
    access = serializers.SerializerMethodField()
    shared_with = serializers.SerializerMethodField()
    labels = serializers.PrimaryKeyRelatedField(
        queryset=Label.objects.all(),
        many=True,
        required=False,
        help_text='List of label IDs (label_id) that belong to the authenticated user.',
    )
    trashed = serializers.BooleanField(required=False, help_text='Move to trash (true) or restore (false). Owner only.')

    class Meta:
        model = Note
        fields = [
            'id',
            'title',
            'content',
            'labels',
            'archived',
            'pinned',
            'color',
            'reminder_at',
            'trashed',
            'created_at',
            'updated_at',
            'created_by',
            'owner_username',
            'access',
            'shared_with',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_access(self, obj: Note) -> str:
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return 'none'

        if obj.created_by_id == getattr(user, 'id', None):
            return 'owner'

        # Optimized path for list views: prefetch may set `collab_for_user`.
        collabs = getattr(obj, 'collab_for_user', None)
        if collabs:
            c = collabs[0]
            return c.permission

        collab = (
            NoteCollaborator.objects.filter(
                note=obj,
                user=user,
                status=NoteCollaborator.Status.ACCEPTED,
            )
            .only('permission')
            .first()
        )
        return collab.permission if collab else 'none'

    def get_shared_with(self, obj: Note):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return []

        # Owner view: show all accepted collaborators (receiver + permission)
        if obj.created_by_id == getattr(user, 'id', None):
            accepted = getattr(obj, 'accepted_collabs', None)
            if accepted is None:
                accepted = (
                    NoteCollaborator.objects.filter(
                        note=obj,
                        status=NoteCollaborator.Status.ACCEPTED,
                    )
                    .select_related('user')
                    .only('permission', 'user__username')
                )
            return [{'username': c.user.username, 'permission': c.permission} for c in accepted]

        # Collaborator view: show the receiver (current user) + their permission
        permission = self.get_access(obj)
        if permission not in (NoteCollaborator.Permission.VIEW, NoteCollaborator.Permission.EDIT):
            return []
        return [{'username': user.username, 'permission': permission}]

    def validate_title(self, value: str) -> str:
        title = (value or '').strip()
        if not title:
            raise serializers.ValidationError('Title cannot be empty.')
        return title

    def validate_content(self, value: str) -> str:
        content = (value or '').strip()
        if not content:
            raise serializers.ValidationError('Content cannot be empty.')
        return content

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            self.fields['labels'].queryset = Label.objects.filter(created_by=request.user)


class NoteListItemSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    label_names = serializers.SerializerMethodField()
    collaborators = serializers.SerializerMethodField()
    access = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id',
            'owner',
            'title',
            'content',
            'labels',
            'label_names',
            'collaborators',
            'access',
            'archived',
            'pinned',
            'color',
            'reminder_at',
            'trashed',
            'created_at',
            'updated_at',
        ]

    def get_owner(self, obj: Note):
        u = obj.created_by
        viewer = getattr(self.context.get('request'), 'user', None)
        return {'name': u.username, 'email': visible_email(u, viewer, obj)}

    def get_label_names(self, obj: Note) -> str:
        # Join into a single string (matches requested sample shape).
        titles = [l.title for l in obj.labels.all()]
        return ', '.join(titles)

    def get_collaborators(self, obj: Note):
        accepted = getattr(obj, 'accepted_collabs', None)
        if accepted is None:
            accepted = (
                NoteCollaborator.objects.filter(
                    note=obj,
                    status=NoteCollaborator.Status.ACCEPTED,
                )
                .select_related('user')
                .only('permission', 'user__username', 'user__email')
            )
        viewer = getattr(self.context.get('request'), 'user', None)
        return [
            {
                'name': c.user.username,
                'email': visible_email(c.user, viewer, obj),
                'permission': c.permission,
            }
            for c in accepted
        ]

    def get_access(self, obj: Note) -> str:
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return 'none'

        if obj.created_by_id == getattr(user, 'id', None):
            return 'owner'

        # Optimized path for list views: prefetch may set `collab_for_user`.
        collabs = getattr(obj, 'collab_for_user', None)
        if collabs:
            return collabs[0].permission

        collab = (
            NoteCollaborator.objects.filter(
                note=obj,
                user=user,
                status=NoteCollaborator.Status.ACCEPTED,
            )
            .only('permission')
            .first()
        )
        return collab.permission if collab else 'none'


class NotesListResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    payload = NoteListItemSerializer(many=True)
    status_code = serializers.IntegerField()


class NoteDetailResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    payload = NoteSerializer()
    status_code = serializers.IntegerField()
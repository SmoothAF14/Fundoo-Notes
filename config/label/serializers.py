from __future__ import annotations

from rest_framework import serializers

from .models import Label


class LabelSerializer(serializers.ModelSerializer):
    created_by = serializers.UUIDField(source='created_by_id', read_only=True)

    class Meta:
        model = Label
        fields = ['label_id', 'title', 'created_at', 'created_by']
        read_only_fields = ['label_id', 'created_at', 'created_by']


class LabelCreateSerializer(serializers.Serializer):
    """Used for create and rename. Pass `user` (and `instance` when renaming) in context."""

    title = serializers.CharField(max_length=100)

    def validate_title(self, value: str) -> str:
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Title cannot be empty.')
        # Notes are filtered by label name, so names must be unique per user.
        existing = Label.objects.filter(created_by=self.context.get('user'), title__iexact=value)
        if self.context.get('instance') is not None:
            existing = existing.exclude(pk=self.context['instance'].pk)
        if existing.exists():
            raise serializers.ValidationError('A label with this name already exists.')
        return value

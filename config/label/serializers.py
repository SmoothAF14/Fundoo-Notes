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
    title = serializers.CharField(max_length=100)

    def validate_title(self, value: str) -> str:
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Title cannot be empty.')
        return value

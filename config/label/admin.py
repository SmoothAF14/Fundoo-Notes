from django.contrib import admin

from .models import Label


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
	list_display = ('title', 'created_by', 'created_at', 'label_id')
	search_fields = ('title',)
	ordering = ('-created_at',)

from django.db import models
from django.conf import settings


class Label(models.Model):
	label_id = models.AutoField(primary_key=True)
	title = models.CharField(max_length=100)
	created_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name='labels',
		null=True,
		blank=True,
	)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return self.title

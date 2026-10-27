import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
	user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
	otp = models.CharField(max_length=6, null=True, blank=True)
	otp_created_at = models.DateTimeField(null=True, blank=True)
	# Which flow the current code belongs to ('login' / 'reset'), so a code can't cross flows.
	otp_purpose = models.CharField(max_length=16, null=True, blank=True)
	otp_attempts = models.PositiveSmallIntegerField(default=0)
	is_verified = models.BooleanField(default=False)

	@property
	def id(self):  # Backwards-compatible alias for existing code/response payloads
		return self.user_id

	def __str__(self) -> str:
		return self.username


class OTP(models.Model):
	user = models.ForeignKey(
		CustomUser,
		on_delete=models.CASCADE,
		related_name='otp_records',
		related_query_name='otp_record',
	)
	otp = models.CharField(max_length=6)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return self.user.username


from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


@shared_task
def send_otp_email(email, otp):

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or getattr(settings, 'EMAIL_HOST_USER', '')

    send_mail(
        'Fundoo Notes OTP',
        f'Your OTP is: {otp}',
        from_email,
        [email],
        fail_silently=False,
    )

    return "OTP Sent"
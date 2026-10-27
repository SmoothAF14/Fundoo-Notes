from django.contrib import messages
from django.contrib.auth import get_user_model, login, logout
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.shortcuts import redirect, render
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from datetime import timedelta
import secrets

from .otp import consume_user_otp, issue_user_otp
from .tasks import send_otp_email


# Register View
def register(request):

    if request.method == "POST":

        username = request.POST['username'].strip()
        email = request.POST['email'].strip()
        password = request.POST['password']
        phone = request.POST.get('phone', '').strip() or None

        User = get_user_model()

        # Email check
        if not email:
            messages.error(request, "Email is required")
            return redirect('register')

        try:
            validate_email(email)
        except ValidationError:
            messages.error(request, "Enter a valid email address")
            return redirect('register')

        # Ensure unverified (old/incomplete) signups do not block re-registration.
        User.objects.filter(username=username, is_verified=False).delete()
        User.objects.filter(email=email, is_verified=False).delete()
        if phone:
            User.objects.filter(phone_number=phone, is_verified=False).delete()

        # Uniqueness checks against verified accounts only.
        if User.objects.filter(username=username, is_verified=True).exists():
            messages.error(request, "Username already exists")
            return redirect('register')

        if phone and User.objects.filter(phone_number=phone, is_verified=True).exists():
            messages.error(request, "Phone number already exists")
            return redirect('register')

        if User.objects.filter(email=email, is_verified=True).exists():
            messages.error(request, "Email already exists")
            return redirect('register')

        # Generate OTP
        otp = f"{secrets.randbelow(1_000_000):06d}"

        # Store pending registration data in the session.
        # Create the DB user only after OTP verification succeeds.
        request.session['pending_registration'] = {
            'username': username,
            'email': email,
            'password_hash': make_password(password),
            'phone_number': phone,
            'otp': otp,
            'otp_created_at': timezone.now().isoformat(),
        }
        request.session.modified = True

        # Send OTP email using Celery
        send_otp_email.delay(email, otp)

        messages.success(request, "OTP sent to your email")

        return redirect('verify_otp')

    return render(request, 'users/register.html')


# Login View
def login_view(request):

    if request.method == "POST":

        username = request.POST['username'].strip()
        password = request.POST['password']

        User = get_user_model()

        try:
            user = User.objects.get(username=username)

            # Check password manually
            if user.check_password(password):

                # Check if email verified
                if not user.is_verified:
                    messages.error(request, "Please verify your email first")
                    return redirect('login')

                if not (user.email or '').strip():
                    messages.error(request, "No email is set for this account")
                    return redirect('login')

                # Generate new OTP for login
                otp = issue_user_otp(user, 'login')

                # Store user id in session temporarily
                request.session['login_user_id'] = str(user.user_id)

                # Send OTP mail using Celery
                send_otp_email.delay(user.email, otp)

                messages.success(request, "OTP sent to your email")

                return redirect('login_otp_verify')

            else:
                messages.error(request, "Incorrect password")

        except User.DoesNotExist:
            messages.error(request, "User does not exist")

    return render(request, 'users/login.html')


# Logout View
def logout_view(request):

    logout(request)
    return redirect('login')


#OTP Verification View
def verify_otp(request):

    pending = request.session.get('pending_registration')
    if not pending:
        messages.error(request, "Session expired. Please register again.")
        return redirect('register')

    created_at_raw = pending.get('otp_created_at')
    created_at = parse_datetime(created_at_raw) if isinstance(created_at_raw, str) else None
    if created_at is None:
        request.session.pop('pending_registration', None)
        messages.error(request, "Session expired. Please register again.")
        return redirect('register')

    if timezone.is_naive(created_at):
        created_at = timezone.make_aware(created_at, timezone.get_current_timezone())

    expires_at = created_at + timedelta(minutes=5)
    remaining_seconds = max(0, int((expires_at - timezone.now()).total_seconds()))

    if remaining_seconds <= 0:
        request.session.pop('pending_registration', None)
        messages.error(request, "OTP expired. Please register again.")
        return redirect('register')

    if request.method == "POST":

        entered_otp = request.POST['otp'].strip()

        expected_otp = (pending.get('otp') or '').strip()
        if not expected_otp or expected_otp != entered_otp:
            messages.error(request, "Invalid OTP")
            return redirect('verify_otp')

        User = get_user_model()
        username = (pending.get('username') or '').strip()
        email = (pending.get('email') or '').strip()
        phone = pending.get('phone_number')

        # Re-check uniqueness against verified accounts before finalizing.
        if User.objects.filter(username=username, is_verified=True).exists():
            messages.error(request, "Username already exists")
            request.session.pop('pending_registration', None)
            return redirect('register')

        if email and User.objects.filter(email=email, is_verified=True).exists():
            messages.error(request, "Email already exists")
            request.session.pop('pending_registration', None)
            return redirect('register')

        if phone and User.objects.filter(phone_number=phone, is_verified=True).exists():
            messages.error(request, "Phone number already exists")
            request.session.pop('pending_registration', None)
            return redirect('register')

        user = User(
            username=username,
            email=email,
            phone_number=phone,
            is_verified=True,
        )
        user.password = pending.get('password_hash') or ''
        user.save()

        request.session.pop('pending_registration', None)
        messages.success(request, "Account verified successfully")
        return redirect('login')

    return render(request, 'users/verify_otp.html', {'otp_expires_in_seconds': remaining_seconds})


# Login OTP Verification View
def login_otp_verify(request):

    user_id = request.session.get('login_user_id')
    if not user_id:
        messages.error(request, "Session expired. Please login again.")
        return redirect('login')

    User = get_user_model()
    user = User.objects.filter(user_id=user_id).first()
    if not user:
        messages.error(request, "User not found. Please login again.")
        return redirect('login')

    if not user.otp_created_at:
        request.session.pop('login_user_id', None)
        messages.error(request, "Session expired. Please login again.")
        return redirect('login')

    expires_at = user.otp_created_at + timedelta(minutes=5)
    remaining_seconds = max(0, int((expires_at - timezone.now()).total_seconds()))

    if remaining_seconds <= 0:
        user.otp = None
        user.otp_created_at = None
        user.save(update_fields=["otp", "otp_created_at"])
        request.session.pop('login_user_id', None)
        messages.error(request, "OTP expired. Please login again.")
        return redirect('login')

    if request.method == "POST":

        entered_otp = request.POST['otp'].strip()

        if consume_user_otp(user, 'login', entered_otp):
            request.session.pop('login_user_id', None)
            login(request, user)
            return redirect('dashboard')

        messages.error(request, "Invalid OTP")

    return render(request, 'users/login_otp_verify.html', {'otp_expires_in_seconds': remaining_seconds})

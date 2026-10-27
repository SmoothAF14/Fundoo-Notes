from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import login as django_login
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import OpenApiResponse, extend_schema

from .serializers import LoginSerializer
from .auth_cookie import clear_auth_cookie, signed_in_response, user_payload
from .otp import OTP_TTL_SECONDS, check_pending_otp, consume_user_otp, issue_user_otp, new_code
from .tasks import send_otp_email


User = get_user_model()

INVALID_CODE = {"detail": "Invalid or expired code. Request a new one if needed."}




class OTPRequestResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    otp_expires_in_seconds = serializers.IntegerField()


class RegisterOtpRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True, allow_null=True)

    def validate_username(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required")
        return value

    def validate_phone_number(self, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    def validate(self, attrs):
        # Apply settings.AUTH_PASSWORD_VALIDATORS (length, common, numeric, similarity).
        candidate = User(username=attrs.get('username', ''), email=attrs.get('email', ''))
        try:
            validate_password(attrs['password'], user=candidate)
        except ValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs


class RegisterOtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)


class LoginOtpRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class LoginOtpVerifySerializer(serializers.Serializer):
    username = serializers.CharField()
    otp = serializers.CharField(max_length=6)


class AuthTokenResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(
        request=LoginSerializer,
        responses={200: OTPRequestResponseSerializer},
        description=(
            "Step 1 of OTP login. Validates username/password and sends an OTP to the user's email. "
            "Use /api/auth/login/verify-otp/ to submit the OTP and obtain an auth token."
        ),
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        if not user.is_verified:
            return Response({"detail": "Please verify your email first"}, status=status.HTTP_400_BAD_REQUEST)

        if not (user.email or '').strip():
            return Response({"detail": "No email is set for this account"}, status=status.HTTP_400_BAD_REQUEST)

        otp = issue_user_otp(user, 'login')
        send_otp_email.delay(user.email, otp)

        return Response(
            {"detail": "OTP sent to your email", "otp_expires_in_seconds": OTP_TTL_SECONDS},
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    # Allowed without a valid session so an expired cookie can still be cleared.
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: OpenApiResponse(description='Logged out')})
    def post(self, request):
        return clear_auth_cookie(Response(status=status.HTTP_204_NO_CONTENT))


class MeAPIView(APIView):
    """The signed-in user; the frontend calls it on load to confirm the session cookie is still valid."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: AuthTokenResponseSerializer})
    def get(self, request):
        return Response(user_payload(request.user))


def _cache_key_pending_registration(email: str) -> str:
    return f"fundoo:pending_registration:{email.strip().lower()}"


class RegisterRequestOtpAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=RegisterOtpRequestSerializer, responses={200: OTPRequestResponseSerializer})
    def post(self, request):
        serializer = RegisterOtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username'].strip()
        email = serializer.validated_data['email'].strip()
        password = serializer.validated_data['password']
        phone = serializer.validated_data.get('phone_number')

        if not email:
            raise serializers.ValidationError({"email": "Email is required"})

        try:
            validate_email(email)
        except ValidationError:
            raise serializers.ValidationError({"email": "Enter a valid email address"})

        # Match web behavior: allow re-register when an old unverified record exists.
        User.objects.filter(username=username, is_verified=False).delete()
        User.objects.filter(email=email, is_verified=False).delete()
        if phone:
            User.objects.filter(phone_number=phone, is_verified=False).delete()

        # Uniqueness checks against verified accounts only.
        if User.objects.filter(username=username, is_verified=True).exists():
            raise serializers.ValidationError({"username": "Username already exists"})
        if User.objects.filter(email=email, is_verified=True).exists():
            raise serializers.ValidationError({"email": "Email already exists"})
        if phone and User.objects.filter(phone_number=phone, is_verified=True).exists():
            raise serializers.ValidationError({"phone_number": "Phone number already exists"})

        otp = new_code()
        created_at = timezone.now()

        cache.set(
            _cache_key_pending_registration(email),
            {
                'username': username,
                'email': email,
                'password_hash': make_password(password),
                'phone_number': phone,
                'otp': otp,
                'otp_created_at': created_at.isoformat(),
            },
            timeout=OTP_TTL_SECONDS,
        )

        send_otp_email.delay(email, otp)

        return Response(
            {"detail": "OTP sent to your email", "otp_expires_in_seconds": OTP_TTL_SECONDS},
            status=status.HTTP_200_OK,
        )


class RegisterVerifyOtpAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=RegisterOtpVerifySerializer, responses={201: AuthTokenResponseSerializer})
    def post(self, request):
        serializer = RegisterOtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip()
        entered_otp = serializer.validated_data['otp'].strip()

        pending = cache.get(_cache_key_pending_registration(email))
        if not pending:
            return Response({"detail": "OTP expired. Please register again."}, status=status.HTTP_400_BAD_REQUEST)

        created_at_raw = pending.get('otp_created_at')
        created_at = parse_datetime(created_at_raw) if isinstance(created_at_raw, str) else None
        if created_at is None:
            cache.delete(_cache_key_pending_registration(email))
            return Response({"detail": "OTP expired. Please register again."}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.is_naive(created_at):
            created_at = timezone.make_aware(created_at, timezone.get_current_timezone())

        expires_at = created_at + timedelta(seconds=OTP_TTL_SECONDS)
        if expires_at <= timezone.now():
            cache.delete(_cache_key_pending_registration(email))
            return Response({"detail": "OTP expired. Please register again."}, status=status.HTTP_400_BAD_REQUEST)

        match = check_pending_otp(pending, entered_otp)
        if match is None:
            cache.delete(_cache_key_pending_registration(email))
            return Response({"detail": "Too many wrong codes. Please register again."}, status=status.HTTP_400_BAD_REQUEST)
        if not match:
            remaining = max(1, int((expires_at - timezone.now()).total_seconds()))
            cache.set(_cache_key_pending_registration(email), pending, timeout=remaining)
            return Response({"detail": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        username = (pending.get('username') or '').strip()
        phone = pending.get('phone_number')

        # Re-check uniqueness against verified accounts before finalizing.
        if User.objects.filter(username=username, is_verified=True).exists():
            cache.delete(_cache_key_pending_registration(email))
            return Response({"detail": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email, is_verified=True).exists():
            cache.delete(_cache_key_pending_registration(email))
            return Response({"detail": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)
        if phone and User.objects.filter(phone_number=phone, is_verified=True).exists():
            cache.delete(_cache_key_pending_registration(email))
            return Response({"detail": "Phone number already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user = User(
            username=username,
            email=email,
            phone_number=phone,
            is_verified=True,
        )
        user.password = pending.get('password_hash') or ''
        user.save()

        cache.delete(_cache_key_pending_registration(email))

        return signed_in_response(request, user, status.HTTP_201_CREATED)


class LoginRequestOtpAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=LoginOtpRequestSerializer, responses={200: OTPRequestResponseSerializer})
    def post(self, request):
        serializer = LoginOtpRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = (serializer.validated_data.get('username') or '').strip()
        password = serializer.validated_data.get('password') or ''

        user = User.objects.filter(username=username).first()
        if not user or not user.check_password(password):
            return Response({"detail": "Invalid username or password"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_verified:
            return Response({"detail": "Please verify your email first"}, status=status.HTTP_400_BAD_REQUEST)

        if not (user.email or '').strip():
            return Response({"detail": "No email is set for this account"}, status=status.HTTP_400_BAD_REQUEST)

        otp = issue_user_otp(user, 'login')
        send_otp_email.delay(user.email, otp)

        return Response(
            {"detail": "OTP sent to your email", "otp_expires_in_seconds": OTP_TTL_SECONDS},
            status=status.HTTP_200_OK,
        )


class LoginVerifyOtpAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=LoginOtpVerifySerializer, responses={200: AuthTokenResponseSerializer})
    def post(self, request):
        serializer = LoginOtpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = (serializer.validated_data.get('username') or '').strip()
        entered_otp = (serializer.validated_data.get('otp') or '').strip()

        # Same answer for unknown users, wrong, expired or used-up codes.
        user = User.objects.filter(username=username).first()
        if not consume_user_otp(user, 'login', entered_otp):
            return Response(INVALID_CODE, status=status.HTTP_400_BAD_REQUEST)

        # Optional: establish a browser session too
        django_login(request, user)
        return signed_in_response(request, user)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)


class PasswordResetRequestOtpAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=PasswordResetRequestSerializer, responses={200: OTPRequestResponseSerializer})
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()

        user = User.objects.filter(email__iexact=email, is_verified=True).first()
        if user:
            send_otp_email.delay(user.email, issue_user_otp(user, 'reset'))

        # Same answer either way, so this endpoint can't be used to discover accounts.
        return Response(
            {"detail": "If an account exists for that email, we sent a reset code.", "otp_expires_in_seconds": OTP_TTL_SECONDS},
            status=status.HTTP_200_OK,
        )


class PasswordResetAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=PasswordResetSerializer, responses={200: OpenApiResponse(description='Password changed')})
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()
        entered_otp = serializer.validated_data['otp'].strip()

        user = User.objects.filter(email__iexact=email, is_verified=True).first()
        new_password = serializer.validated_data['new_password']
        if user:
            try:
                validate_password(new_password, user=user)
            except ValidationError as exc:
                return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        if not consume_user_otp(user, 'reset', entered_otp):
            return Response(INVALID_CODE, status=status.HTTP_400_BAD_REQUEST)

        # Changing the password also invalidates every token issued before (see jwt_utils).
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password changed. You can sign in now."}, status=status.HTTP_200_OK)

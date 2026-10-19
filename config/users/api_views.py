from __future__ import annotations

from datetime import timedelta
from random import randint

from django.contrib.auth import login as django_login
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
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

from .serializers import LoginSerializer, RegisterSerializer
from .jwt_utils import create_access_token
from .tasks import send_otp_email


User = get_user_model()


OTP_TTL_SECONDS = 5 * 60


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
    token = serializers.CharField()


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    @extend_schema(request=RegisterSerializer, responses={201: AuthTokenResponseSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        token = create_access_token(user)

        return Response(
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "token": token,
            },
            status=status.HTTP_201_CREATED,
        )


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

        otp = str(randint(100000, 999999))
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save(update_fields=["otp", "otp_created_at"])

        send_otp_email.delay(user.email, otp)

        return Response(
            {"detail": "OTP sent to your email", "otp_expires_in_seconds": OTP_TTL_SECONDS},
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: OpenApiResponse(description='Logged out')})
    def post(self, request):
        # JWT logout is client-side: the frontend clears the token.
        return Response(status=status.HTTP_204_NO_CONTENT)


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

        otp = str(randint(100000, 999999))
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

        expected_otp = (pending.get('otp') or '').strip()
        if not expected_otp or expected_otp != entered_otp:
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

        token = create_access_token(user)
        return Response(
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "token": token,
            },
            status=status.HTTP_201_CREATED,
        )


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

        otp = str(randint(100000, 999999))
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save(update_fields=["otp", "otp_created_at"])

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

        user = User.objects.filter(username=username).first()
        if not user:
            return Response({"detail": "User not found"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.otp_created_at:
            return Response({"detail": "OTP expired. Please login again."}, status=status.HTTP_400_BAD_REQUEST)

        expires_at = user.otp_created_at + timedelta(seconds=OTP_TTL_SECONDS)
        if expires_at <= timezone.now():
            user.otp = None
            user.otp_created_at = None
            user.save(update_fields=["otp", "otp_created_at"])
            return Response({"detail": "OTP expired. Please login again."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.otp or user.otp != entered_otp:
            return Response({"detail": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)

        user.otp = None
        user.otp_created_at = None
        user.save(update_fields=["otp", "otp_created_at"])

        token = create_access_token(user)

        # Optional: establish a browser session too
        django_login(request, user)

        return Response(
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "phone_number": user.phone_number,
                "token": token,
            },
            status=status.HTTP_200_OK,
        )

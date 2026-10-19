from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.api_views import _cache_key_pending_registration
from users.jwt_utils import decode_access_token
from users.models import CustomUser


class RegisterVerifyOtpTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_valid_otp_creates_verified_user_and_returns_jwt(self):
        email = 'new@example.com'
        cache.set(
            _cache_key_pending_registration(email),
            {
                'email': email,
                'otp': '123456',
                'otp_created_at': timezone.now().isoformat(),
                'password_hash': make_password('S3cret-pass!'),
                'phone_number': None,
                'username': 'newuser',
            },
        )

        res = self.client.post('/api/auth/register/verify-otp/', {'email': email, 'otp': '123456'}, format='json')

        self.assertEqual(res.status_code, 201, res.content[:300])
        self.assertTrue(CustomUser.objects.get(username='newuser').is_verified)
        self.assertEqual(decode_access_token(res.json()['token'])['username'], 'newuser')


class RegisterApiTests(TestCase):
    def test_register_returns_jwt(self):
        res = APIClient().post(
            '/api/auth/register/',
            {'username': 'plain', 'email': 'plain@example.com', 'password': 'S3cret-pass!'},
            format='json',
        )

        self.assertEqual(res.status_code, 201, res.content[:300])
        self.assertEqual(decode_access_token(res.json()['token'])['username'], 'plain')

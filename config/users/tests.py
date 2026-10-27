from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.api_views import _cache_key_pending_registration
from users.jwt_utils import create_access_token, decode_access_token
from users.auth_cookie import AUTH_COOKIE
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
        self.assertNotIn('token', res.json())
        self.assertEqual(decode_access_token(res.cookies[AUTH_COOKIE].value)['username'], 'newuser')


class PasswordResetTests(TestCase):
    def setUp(self):
        cache.clear()
        # Never queue real emails to the live Celery worker from tests.
        patcher = patch('users.api_views.send_otp_email.delay')
        self.send_email = patcher.start()
        self.addCleanup(patcher.stop)
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='forgetful', email='forgetful@example.com', password='Old-pass-123!', is_verified=True
        )

    def test_request_gives_the_same_answer_for_unknown_emails(self):
        known = self.client.post('/api/auth/password/request-otp/', {'email': 'forgetful@example.com'}, format='json')
        unknown = self.client.post('/api/auth/password/request-otp/', {'email': 'nobody@example.com'}, format='json')
        self.assertEqual(known.status_code, 200)
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(known.json(), unknown.json())
        self.send_email.assert_called_once()

    def test_reset_with_valid_code_changes_password(self):
        self.client.post('/api/auth/password/request-otp/', {'email': 'forgetful@example.com'}, format='json')
        self.user.refresh_from_db()

        res = self.client.post(
            '/api/auth/password/reset/',
            {'email': 'forgetful@example.com', 'otp': self.user.otp, 'new_password': 'Brand-new-pass-456!'},
            format='json',
        )

        self.assertEqual(res.status_code, 200, res.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Brand-new-pass-456!'))
        self.assertIsNone(self.user.otp)

    def test_reset_with_wrong_code_fails(self):
        self.client.post('/api/auth/password/request-otp/', {'email': 'forgetful@example.com'}, format='json')
        res = self.client.post(
            '/api/auth/password/reset/',
            {'email': 'forgetful@example.com', 'otp': '000000' if self._otp() != '000000' else '111111', 'new_password': 'Brand-new-pass-456!'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Old-pass-123!'))

    def test_reset_rejects_weak_password(self):
        self.client.post('/api/auth/password/request-otp/', {'email': 'forgetful@example.com'}, format='json')
        res = self.client.post(
            '/api/auth/password/reset/',
            {'email': 'forgetful@example.com', 'otp': self._otp(), 'new_password': '123'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('new_password', res.json())

    def _otp(self):
        self.user.refresh_from_db()
        return self.user.otp


class RegisterRequestOtpTests(TestCase):
    def setUp(self):
        cache.clear()
        patcher = patch('users.api_views.send_otp_email.delay')
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_weak_password_is_rejected_with_a_field_error(self):
        res = APIClient().post(
            '/api/auth/register/request-otp/',
            {'username': 'weakling', 'email': 'weak@example.com', 'password': '1'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.json())


class OtpHardeningTests(TestCase):
    """Security-audit findings C1/H1/M1/M2/M4: brute force, cross-flow codes, token revocation."""

    def setUp(self):
        cache.clear()
        patcher = patch('users.api_views.send_otp_email.delay')
        self.send_email = patcher.start()
        self.addCleanup(patcher.stop)
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='victim', email='victim@example.com', password='Old-pass-123!', is_verified=True
        )

    def _reset_code(self):
        self.client.post('/api/auth/password/request-otp/', {'email': 'victim@example.com'}, format='json')
        self.user.refresh_from_db()
        return self.user.otp

    def _wrong(self, code):
        return '000000' if code != '000000' else '111111'

    def test_too_many_wrong_reset_codes_invalidate_the_code(self):
        code = self._reset_code()
        for _ in range(5):
            self.client.post('/api/auth/password/reset/', {'email': 'victim@example.com', 'otp': self._wrong(code), 'new_password': 'Brand-new-pass-456!'}, format='json')
        res = self.client.post('/api/auth/password/reset/', {'email': 'victim@example.com', 'otp': code, 'new_password': 'Brand-new-pass-456!'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Old-pass-123!'))

    def test_the_emailed_login_code_signs_the_user_in(self):
        res = self.client.post('/api/auth/login/request-otp/', {'username': 'victim', 'password': 'Old-pass-123!'}, format='json')
        self.assertEqual(res.status_code, 200)
        emailed_code = self.send_email.call_args.args[1]
        res = self.client.post('/api/auth/login/verify-otp/', {'username': 'victim', 'otp': emailed_code}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(decode_access_token(res.cookies[AUTH_COOKIE].value)['username'], 'victim')

    def test_the_emailed_login_code_still_works_after_one_typo(self):
        self.client.post('/api/auth/login/request-otp/', {'username': 'victim', 'password': 'Old-pass-123!'}, format='json')
        emailed_code = self.send_email.call_args.args[1]
        self.client.post('/api/auth/login/verify-otp/', {'username': 'victim', 'otp': self._wrong(emailed_code)}, format='json')
        res = self.client.post('/api/auth/login/verify-otp/', {'username': 'victim', 'otp': emailed_code}, format='json')
        self.assertEqual(res.status_code, 200, res.content)

    def test_the_emailed_reset_code_changes_the_password(self):
        self.client.post('/api/auth/password/request-otp/', {'email': 'victim@example.com'}, format='json')
        emailed_code = self.send_email.call_args.args[1]
        res = self.client.post(
            '/api/auth/password/reset/',
            {'email': 'victim@example.com', 'otp': emailed_code, 'new_password': 'Brand-new-pass-456!'},
            format='json',
        )
        self.assertEqual(res.status_code, 200, res.content)

    def test_reset_code_cannot_be_used_to_log_in(self):
        code = self._reset_code()
        res = self.client.post('/api/auth/login/verify-otp/', {'username': 'victim', 'otp': code}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_login_code_cannot_reset_the_password(self):
        self.client.post('/api/auth/login/request-otp/', {'username': 'victim', 'password': 'Old-pass-123!'}, format='json')
        self.user.refresh_from_db()
        res = self.client.post('/api/auth/password/reset/', {'email': 'victim@example.com', 'otp': self.user.otp, 'new_password': 'Brand-new-pass-456!'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_too_many_wrong_login_codes_invalidate_the_code(self):
        self.client.post('/api/auth/login/request-otp/', {'username': 'victim', 'password': 'Old-pass-123!'}, format='json')
        self.user.refresh_from_db()
        code = self.user.otp
        for _ in range(5):
            self.client.post('/api/auth/login/verify-otp/', {'username': 'victim', 'otp': self._wrong(code)}, format='json')
        res = self.client.post('/api/auth/login/verify-otp/', {'username': 'victim', 'otp': code}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_login_verify_does_not_reveal_unknown_usernames(self):
        self.client.post('/api/auth/login/request-otp/', {'username': 'victim', 'password': 'Old-pass-123!'}, format='json')
        unknown = self.client.post('/api/auth/login/verify-otp/', {'username': 'nobody', 'otp': '123456'}, format='json')
        wrong = self.client.post('/api/auth/login/verify-otp/', {'username': 'victim', 'otp': '000000' if self.user.otp != '000000' else '111111'}, format='json')
        self.assertEqual(unknown.json(), wrong.json())

    def test_tokens_issued_before_a_password_reset_stop_working(self):
        old_token = create_access_token(self.user)
        code = self._reset_code()
        self.client.post('/api/auth/password/reset/', {'email': 'victim@example.com', 'otp': code, 'new_password': 'Brand-new-pass-456!'}, format='json')
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Bearer {old_token}')
        self.assertEqual(api.get('/notes/api/notes/').status_code, 401)

    def test_deactivated_users_are_rejected(self):
        token = create_access_token(self.user)
        self.user.is_active = False
        self.user.save()
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(api.get('/notes/api/notes/').status_code, 401)

    def test_throttling_ignores_spoofable_forwarded_for_by_default(self):
        from django.conf import settings
        self.assertEqual(settings.REST_FRAMEWORK.get('NUM_PROXIES'), 0)


class JwtAuthenticationTests(TestCase):
    def test_invalid_token_is_401_not_403(self):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer not-a-real-token')
        res = client.get('/notes/api/notes/')
        self.assertEqual(res.status_code, 401)


class AuthCookieTests(TestCase):
    """The JWT lives in an httpOnly cookie (not readable by page scripts) with CSRF on writes."""

    def setUp(self):
        cache.clear()
        patcher = patch('users.api_views.send_otp_email.delay')
        self.send_email = patcher.start()
        self.addCleanup(patcher.stop)
        CustomUser.objects.create_user(username='cookie', email='cookie@example.com', password='Old-pass-123!', is_verified=True)
        self.client = APIClient(enforce_csrf_checks=True)

    def sign_in(self):
        self.client.post('/api/auth/login/request-otp/', {'username': 'cookie', 'password': 'Old-pass-123!'}, format='json')
        return self.client.post('/api/auth/login/verify-otp/', {'username': 'cookie', 'otp': self.send_email.call_args.args[1]}, format='json')

    def test_sign_in_sets_an_httponly_cookie_and_no_token_in_the_body(self):
        res = self.sign_in()
        self.assertEqual(res.status_code, 200, res.content)
        self.assertNotIn('token', res.json())
        cookie = res.cookies[AUTH_COOKIE]
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertIn('csrftoken', res.cookies)

    def test_the_cookie_authenticates_reads(self):
        self.sign_in()
        self.assertEqual(self.client.get('/notes/api/notes/').status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me/').json()['username'], 'cookie')

    def test_cookie_writes_need_the_csrf_header(self):
        self.sign_in()
        body = {'title': 'T', 'content': 'C'}
        self.assertEqual(self.client.post('/notes/api/notes/', body, format='json').status_code, 403)
        csrf = self.client.cookies['csrftoken'].value
        self.assertEqual(self.client.post('/notes/api/notes/', body, format='json', HTTP_X_CSRFTOKEN=csrf).status_code, 201)

    def test_logout_clears_the_cookie(self):
        self.sign_in()
        csrf = self.client.cookies['csrftoken'].value
        res = self.client.post('/api/auth/logout/', HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(res.cookies[AUTH_COOKIE].value, '')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_me_without_a_session_is_401(self):
        self.assertEqual(APIClient().get('/api/auth/me/').status_code, 401)

    def test_unverified_password_register_endpoint_is_gone(self):
        res = APIClient().post('/api/auth/register/', {'username': 'x', 'email': 'x@example.com', 'password': 'S3cret-pass!'}, format='json')
        self.assertEqual(res.status_code, 404)

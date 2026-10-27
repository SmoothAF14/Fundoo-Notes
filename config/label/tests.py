from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from users.jwt_utils import create_access_token
from users.models import CustomUser

from .models import Label


class LabelApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = CustomUser.objects.create_user(username='u', email='u@example.com', password='S3cret-pass!', is_verified=True)
        self.api = APIClient()
        self.api.credentials(HTTP_AUTHORIZATION=f'Bearer {create_access_token(self.user)}')
        self.label = Label.objects.create(title='Work', created_by=self.user)

    def test_rename_label(self):
        res = self.api.patch(f'/labels/api/labels/{self.label.label_id}/', {'title': 'Office'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.label.refresh_from_db()
        self.assertEqual(self.label.title, 'Office')

    def test_duplicate_title_is_rejected_on_create(self):
        res = self.api.post('/labels/api/labels/', {'title': ' work '}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('title', res.json())

    def test_duplicate_title_is_rejected_on_rename(self):
        other = Label.objects.create(title='Home', created_by=self.user)
        res = self.api.patch(f'/labels/api/labels/{other.label_id}/', {'title': 'WORK'}, format='json')
        self.assertEqual(res.status_code, 400)

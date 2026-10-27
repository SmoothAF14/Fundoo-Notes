from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from users.jwt_utils import create_access_token
from users.models import CustomUser

from .models import Note, NoteCollaborator
from .tasks import send_note_reminder


def make_user(username: str) -> CustomUser:
    return CustomUser.objects.create_user(
        username=username, email=f'{username}@example.com', password='S3cret-pass!', is_verified=True
    )


def client_for(user: CustomUser) -> APIClient:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {create_access_token(user)}')
    return client


class NoteKeepFeaturesTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('owner')
        self.api = client_for(self.owner)
        self.note = Note.objects.create(title='Groceries', content='Milk', created_by=self.owner)

    def list_item(self, client=None, note_id=None):
        res = (client or self.api).get('/notes/api/notes/')
        self.assertEqual(res.status_code, 200)
        items = {n['id']: n for n in res.json()['payload']}
        return items.get(str(note_id or self.note.id))

    def test_list_exposes_keep_fields(self):
        item = self.list_item()
        for field in ('archived', 'pinned', 'color', 'reminder_at', 'trashed', 'labels', 'created_at', 'updated_at'):
            self.assertIn(field, item)
        self.assertFalse(item['trashed'])

    def test_pin_color_and_reminder_can_be_patched(self):
        when = (timezone.now() + timedelta(days=1)).replace(microsecond=0)
        res = self.api.patch(
            f'/notes/api/notes/{self.note.id}/',
            {'pinned': True, 'color': 'sage', 'reminder_at': when.isoformat()},
            format='json',
        )
        self.assertEqual(res.status_code, 200, res.content)
        item = self.list_item()
        self.assertTrue(item['pinned'])
        self.assertEqual(item['color'], 'sage')
        self.assertIsNotNone(item['reminder_at'])

    def test_unknown_color_is_rejected(self):
        res = self.api.patch(f'/notes/api/notes/{self.note.id}/', {'color': 'neon'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_trash_and_restore(self):
        res = self.api.patch(f'/notes/api/notes/{self.note.id}/', {'trashed': True}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(self.list_item()['trashed'])

        res = self.api.patch(f'/notes/api/notes/{self.note.id}/', {'trashed': False}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertFalse(self.list_item()['trashed'])

    def test_trashed_note_cannot_be_edited_until_restored(self):
        self.api.patch(f'/notes/api/notes/{self.note.id}/', {'trashed': True}, format='json')
        res = self.api.patch(f'/notes/api/notes/{self.note.id}/', {'title': 'Changed'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.note.refresh_from_db()
        self.assertEqual(self.note.title, 'Groceries')

    def test_only_owner_can_trash(self):
        editor = make_user('editor')
        NoteCollaborator.objects.create(
            note=self.note, user=editor, invited_by=self.owner,
            permission=NoteCollaborator.Permission.EDIT, status=NoteCollaborator.Status.ACCEPTED,
        )
        res = client_for(editor).patch(f'/notes/api/notes/{self.note.id}/', {'trashed': True}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_edit_collaborators_can_change_text_but_not_owner_settings(self):
        editor = make_user('editor2')
        NoteCollaborator.objects.create(
            note=self.note, user=editor, invited_by=self.owner,
            permission=NoteCollaborator.Permission.EDIT, status=NoteCollaborator.Status.ACCEPTED,
        )
        api = client_for(editor)
        self.assertEqual(api.patch(f'/notes/api/notes/{self.note.id}/', {'title': 'Shared edit'}, format='json').status_code, 200)
        for change in ({'labels': []}, {'pinned': True}, {'color': 'sage'}, {'archived': True}, {'reminder_at': None}):
            res = api.patch(f'/notes/api/notes/{self.note.id}/', change, format='json')
            self.assertEqual(res.status_code, 403, change)

    def test_collaborators_do_not_see_trashed_notes(self):
        viewer = make_user('viewer')
        NoteCollaborator.objects.create(
            note=self.note, user=viewer, invited_by=self.owner,
            permission=NoteCollaborator.Permission.VIEW, status=NoteCollaborator.Status.ACCEPTED,
        )
        self.api.patch(f'/notes/api/notes/{self.note.id}/', {'trashed': True}, format='json')
        self.assertIsNone(self.list_item(client=client_for(viewer)))

    def test_delete_forever_still_works(self):
        res = self.api.delete(f'/notes/api/notes/{self.note.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Note.objects.filter(id=self.note.id).exists())


class ReminderEmailTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('remindme')
        self.api = client_for(self.owner)
        self.note = Note.objects.create(title='Call Ma', content='Sunday', created_by=self.owner)

    def test_setting_a_reminder_schedules_an_email_at_that_time(self):
        when = (timezone.now() + timedelta(hours=2)).replace(microsecond=0)
        with patch('notes.api_views.send_note_reminder.apply_async') as schedule, self.captureOnCommitCallbacks(execute=True):
            res = self.api.patch(f'/notes/api/notes/{self.note.id}/', {'reminder_at': when.isoformat()}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        kwargs = schedule.call_args.kwargs
        self.assertEqual(kwargs['args'][0], str(self.note.id))
        self.assertEqual(kwargs['eta'], when)

    def test_due_reminder_emails_the_owner_once(self):
        self.note.reminder_at = timezone.now() - timedelta(seconds=1)
        self.note.save()
        send_note_reminder(str(self.note.id), self.note.reminder_at.isoformat())
        send_note_reminder(str(self.note.id), self.note.reminder_at.isoformat())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['remindme@example.com'])
        self.assertIn('Call Ma', mail.outbox[0].subject)

    def test_changed_or_trashed_reminders_are_not_sent(self):
        old = timezone.now() - timedelta(minutes=1)
        self.note.reminder_at = timezone.now() + timedelta(days=1)
        self.note.save()
        send_note_reminder(str(self.note.id), old.isoformat())
        self.note.reminder_at = old
        self.note.trashed = True
        self.note.save()
        send_note_reminder(str(self.note.id), old.isoformat())
        self.assertEqual(len(mail.outbox), 0)


class CollaboratorPrivacyTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('privowner')
        self.viewer = make_user('privviewer')
        self.other = make_user('privother')
        self.note = Note.objects.create(title='Plan', content='x', created_by=self.owner)
        for u in (self.viewer, self.other):
            NoteCollaborator.objects.create(note=self.note, user=u, invited_by=self.owner, permission='view', status='accepted')

    def test_collaborators_cannot_see_other_peoples_emails(self):
        api = client_for(self.viewer)
        data = api.get(f'/notes/api/notes/{self.note.id}/collaborators/').json()
        emails = [data['owner']['email']] + [c['user']['email'] for c in data['collaborators']] + [c['invited_by']['email'] for c in data['collaborators']]
        self.assertEqual(set(emails) - {'', 'privviewer@example.com'}, set())
        listed = next(n for n in api.get('/notes/api/notes/').json()['payload'] if n['id'] == str(self.note.id))
        self.assertEqual(listed['owner']['email'], '')
        self.assertTrue(all(c['email'] in ('', 'privviewer@example.com') for c in listed['collaborators']))

    def test_the_owner_still_sees_emails(self):
        data = client_for(self.owner).get(f'/notes/api/notes/{self.note.id}/collaborators/').json()
        self.assertIn('privother@example.com', [c['user']['email'] for c in data['collaborators']])

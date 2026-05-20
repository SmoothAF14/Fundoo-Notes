from django.urls import path
from . import api_views, views

urlpatterns = [
    # UI views
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create/', views.create_note, name='create_note'),
    path('update/<uuid:id>/', views.update_note, name='update_note'),
    path('delete/<uuid:id>/', views.delete_note, name='delete_note'),
    # API views
    path('api/notes/', api_views.NotesAPIView.as_view(), name='notes_api'),
    path('api/notes/<uuid:id>/', api_views.NoteDetailAPIView.as_view(), name='note_detail_api'),
    path('api/notes/<uuid:id>/collaborators/', api_views.NoteCollaboratorsAPIView.as_view(), name='note_collaborators_api'),
    path(
        'api/notes/<uuid:id>/collaborators/<uuid:user_id>/',
        api_views.NoteCollaboratorDetailAPIView.as_view(),
        name='note_collaborator_detail_api',
    ),
    path('api/invitations/', api_views.PendingInvitationsAPIView.as_view(), name='pending_invitations_api'),
    path('api/invitations/<uuid:invite_id>/accept/', api_views.InvitationAcceptAPIView.as_view(), name='invite_accept_api'),
    path('api/invitations/<uuid:invite_id>/decline/', api_views.InvitationDeclineAPIView.as_view(), name='invite_decline_api'),
]
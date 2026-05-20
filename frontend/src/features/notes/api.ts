import { apiRequest } from '../../shared/api/http';
import type {
  Note,
  NoteCollaboratorsResponse,
  NoteDetailResponse,
  NotesListResponse,
  NotesListItem,
  PendingInvitation,
} from '../../shared/types';

export async function listNotes(token: string): Promise<NotesListItem[]> {
  const res = await apiRequest<NotesListResponse>('/notes/api/notes/', { method: 'GET', token });
  return res.payload;
}

export async function getNote(token: string, id: string): Promise<Note> {
  const res = await apiRequest<NoteDetailResponse>(`/notes/api/notes/${id}/`, { method: 'GET', token });
  return res.payload;
}

export async function createNote(
  token: string,
  payload: Pick<Note, 'title' | 'content' | 'labels' | 'archived'>
): Promise<Note> {
  return apiRequest('/notes/api/notes/', { method: 'POST', token, body: JSON.stringify(payload) });
}

export async function updateNote(
  token: string,
  id: string,
  payload: Pick<Note, 'title' | 'content' | 'labels' | 'archived'>
): Promise<Note> {
  return apiRequest(`/notes/api/notes/${id}/`, { method: 'PUT', token, body: JSON.stringify(payload) });
}

export async function deleteNote(token: string, id: string): Promise<void> {
  await apiRequest(`/notes/api/notes/${id}/`, { method: 'DELETE', token });
}

export async function listCollaborators(token: string, noteId: string): Promise<NoteCollaboratorsResponse> {
  return apiRequest(`/notes/api/notes/${noteId}/collaborators/`, { method: 'GET', token });
}

export async function inviteCollaborator(
  token: string,
  noteId: string,
  payload: { email: string; permission: 'view' | 'edit' }
): Promise<void> {
  await apiRequest(`/notes/api/notes/${noteId}/collaborators/`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateCollaboratorPermission(
  token: string,
  noteId: string,
  userId: string,
  permission: 'view' | 'edit'
): Promise<void> {
  await apiRequest(`/notes/api/notes/${noteId}/collaborators/${userId}/`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ permission }),
  });
}

export async function removeCollaborator(token: string, noteId: string, userId: string): Promise<void> {
  await apiRequest(`/notes/api/notes/${noteId}/collaborators/${userId}/`, { method: 'DELETE', token });
}

export async function listPendingInvitations(token: string): Promise<PendingInvitation[]> {
  return apiRequest('/notes/api/invitations/', { method: 'GET', token });
}

export async function acceptInvitation(token: string, inviteId: string): Promise<void> {
  await apiRequest(`/notes/api/invitations/${inviteId}/accept/`, { method: 'POST', token });
}

export async function declineInvitation(token: string, inviteId: string): Promise<void> {
  await apiRequest(`/notes/api/invitations/${inviteId}/decline/`, { method: 'POST', token });
}

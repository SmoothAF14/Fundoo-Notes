import { apiRequest } from '@/shared/api/http';
import type {
  Note,
  NoteCollaboratorsResponse,
  NoteDetailResponse,
  NotePatch,
  NotesListItem,
  NotesListResponse,
  PendingInvitation,
  Permission,
} from '@/shared/types';

export async function listNotes(): Promise<NotesListItem[]> {
  const res = await apiRequest<NotesListResponse>('/notes/api/notes/', { method: 'GET' });
  return res.payload;
}

export async function getNote(id: string): Promise<Note> {
  const res = await apiRequest<NoteDetailResponse>(`/notes/api/notes/${id}/`, { method: 'GET' });
  return res.payload;
}

export async function createNote(payload: NotePatch & { title: string; content: string }): Promise<Note> {
  return apiRequest('/notes/api/notes/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function patchNote(id: string, patch: NotePatch): Promise<Note> {
  return apiRequest(`/notes/api/notes/${id}/`, { method: 'PATCH', body: JSON.stringify(patch) });
}

/** Permanently deletes the note (owner only). Moving to trash is `patchNote(..., { trashed: true })`. */
export async function deleteNote(id: string): Promise<void> {
  await apiRequest(`/notes/api/notes/${id}/`, { method: 'DELETE' });
}

export async function listCollaborators(noteId: string): Promise<NoteCollaboratorsResponse> {
  return apiRequest(`/notes/api/notes/${noteId}/collaborators/`, { method: 'GET' });
}

export async function inviteCollaborator(noteId: string, payload: { email: string; permission: Permission }) {
  await apiRequest(`/notes/api/notes/${noteId}/collaborators/`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCollaboratorPermission(noteId: string, userId: string, permission: Permission) {
  await apiRequest(`/notes/api/notes/${noteId}/collaborators/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ permission }),
  });
}

export async function removeCollaborator(noteId: string, userId: string) {
  await apiRequest(`/notes/api/notes/${noteId}/collaborators/${userId}/`, { method: 'DELETE' });
}

export async function listPendingInvitations(): Promise<PendingInvitation[]> {
  return apiRequest('/notes/api/invitations/', { method: 'GET' });
}

export async function acceptInvitation(inviteId: string) {
  await apiRequest(`/notes/api/invitations/${inviteId}/accept/`, { method: 'POST' });
}

export async function declineInvitation(inviteId: string) {
  await apiRequest(`/notes/api/invitations/${inviteId}/decline/`, { method: 'POST' });
}

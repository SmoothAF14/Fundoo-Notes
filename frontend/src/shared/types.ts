export type UUID = string;

export type ID = string;

export type AuthUser = {
  id: UUID;
  username: string;
  email?: string;
  phone_number?: string | null;
};

export type AuthTokenResponse = AuthUser & {
  token: string;
};

export type Note = {
  id: UUID;
  title: string;
  content: string;
  labels: number[];
  archived: boolean;
  created_at: string;
  created_by: UUID;
  owner_username: string;
  access: 'owner' | 'view' | 'edit' | 'none';
  shared_with: { username: string; permission: 'view' | 'edit' }[];
};

export type NotesListItem = {
  id: ID;
  owner: { name: string; email: string };
  title: string;
  content: string;
  label_names: string;
  collaborators: { name: string; email: string; permission: 'view' | 'edit' }[];
  access: 'owner' | 'view' | 'edit' | 'none';
};

export type NotesListResponse = {
  message: string;
  payload: NotesListItem[];
  status_code: number;
};

export type NoteDetailResponse = {
  message: string;
  payload: Note;
  status_code: number;
};

export type CollaboratorUserSummary = {
  id: UUID;
  username: string;
  email?: string;
};

export type NoteCollaborator = {
  id: UUID;
  user: CollaboratorUserSummary;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted' | 'declined';
  invited_by: CollaboratorUserSummary;
  created_at: string;
  responded_at?: string | null;
};

export type NoteCollaboratorsResponse = {
  owner: CollaboratorUserSummary;
  collaborators: NoteCollaborator[];
};

export type PendingInvitation = {
  id: UUID;
  note: { id: UUID; title: string };
  permission: 'view' | 'edit';
  created_at: string;
  from_user: { id: UUID; username: string };
};

export type Label = {
  label_id: number;
  title: string;
  created_at: string;
  created_by: UUID;
};

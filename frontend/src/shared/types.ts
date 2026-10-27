export type UUID = string;

export type AuthUser = {
  id: UUID;
  username: string;
  email?: string;
  phone_number?: string | null;
};

export type Permission = 'view' | 'edit';
type Access = 'owner' | Permission | 'none';

/** Named, muted tints; the actual colours live in index.css (--note-*). */
export type NoteColor = '' | 'clay' | 'sand' | 'moss' | 'sage' | 'tide' | 'dusk' | 'plum' | 'rose';

/** Fields every note carries in both the list and detail payloads. */
type NoteFields = {
  id: UUID;
  title: string;
  content: string;
  labels: number[];
  archived: boolean;
  pinned: boolean;
  color: NoteColor;
  reminder_at: string | null;
  trashed: boolean;
  created_at: string;
  updated_at: string;
  access: Access;
};

export type Note = NoteFields & {
  created_by: UUID;
  owner_username: string;
  shared_with: { username: string; permission: Permission }[];
};

export type NotesListItem = NoteFields & {
  owner: { name: string; email: string };
  label_names: string;
  collaborators: { name: string; email: string; permission: Permission }[];
};

/** Writable note fields (PATCH accepts any subset). */
export type NotePatch = Partial<
  Pick<NoteFields, 'title' | 'content' | 'labels' | 'archived' | 'pinned' | 'color' | 'reminder_at' | 'trashed'>
>;

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
  permission: Permission;
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
  permission: Permission;
  created_at: string;
  from_user: { id: UUID; username: string };
};

export type Label = {
  label_id: number;
  title: string;
  created_at: string;
  created_by: UUID;
};

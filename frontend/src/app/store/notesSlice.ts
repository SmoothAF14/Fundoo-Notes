import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { clearAuthState } from '@/app/store/authSlice';
import { createNote as apiCreateNote, deleteNote as apiDeleteNote, listNotes, patchNote } from '@/features/notes/api';
import type { Note, NotePatch, NotesListItem } from '@/shared/types';

interface NotesState {
  items: NotesListItem[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  /** Previous values of notes with an optimistic update in flight, keyed by request id. */
  rollback: Record<string, { id: string; prev: NotePatch }>;
}

const initialState: NotesState = { items: [], loading: false, loaded: false, error: null, rollback: {} };

const message = (err: unknown, fallback: string) => (err instanceof Error && err.message) || fallback;

export const fetchNotes = createAsyncThunk('notes/fetchAll', async (_: void, { rejectWithValue }) => {
  try {
    return await listNotes();
  } catch (err) {
    return rejectWithValue(message(err, 'Failed to load notes'));
  }
});

export const createNote = createAsyncThunk(
  'notes/create',
  async ({ note }: { note: NotePatch & { title: string; content: string } }, { rejectWithValue }) => {
    try {
      return await apiCreateNote(note);
    } catch (err) {
      return rejectWithValue(message(err, 'Failed to create note'));
    }
  }
);

/** PATCH a note, applying the change locally first and rolling back if the server refuses. */
export const updateNote = createAsyncThunk(
  'notes/update',
  async ({ id, patch }: { id: string; patch: NotePatch }, { rejectWithValue }) => {
    try {
      return await patchNote(id, patch);
    } catch (err) {
      return rejectWithValue(message(err, 'Failed to update note'));
    }
  }
);

export const deleteNoteForever = createAsyncThunk(
  'notes/deleteForever',
  async ({ id }: { id: string }, { rejectWithValue }) => {
    try {
      await apiDeleteNote(id);
      return id;
    } catch (err) {
      return rejectWithValue(message(err, 'Failed to delete note'));
    }
  }
);

function fromServer(note: Note, existing?: NotesListItem): NotesListItem {
  return {
    ...(existing ?? { owner: { name: note.owner_username, email: '' }, label_names: '', collaborators: [] }),
    id: note.id,
    title: note.title,
    content: note.content,
    labels: note.labels,
    archived: note.archived,
    pinned: note.pinned,
    color: note.color,
    reminder_at: note.reminder_at,
    trashed: note.trashed,
    created_at: note.created_at,
    updated_at: note.updated_at,
    access: note.access,
  };
}

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.items = action.payload;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.items.unshift(fromServer(action.payload));
      })
      .addCase(updateNote.pending, (state, action) => {
        const { id, patch } = action.meta.arg;
        const note = state.items.find((n) => n.id === id);
        if (!note) return;
        const prev: NotePatch = {};
        (Object.keys(patch) as (keyof NotePatch)[]).forEach((k) => {
          (prev as Record<string, unknown>)[k] = note[k];
        });
        state.rollback[action.meta.requestId] = { id, prev };
        Object.assign(note, patch);
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        delete state.rollback[action.meta.requestId];
        const i = state.items.findIndex((n) => n.id === action.payload.id);
        if (i >= 0) state.items[i] = fromServer(action.payload, state.items[i]);
      })
      .addCase(updateNote.rejected, (state, action) => {
        const entry = state.rollback[action.meta.requestId];
        delete state.rollback[action.meta.requestId];
        const note = entry && state.items.find((n) => n.id === entry.id);
        if (note) Object.assign(note, entry.prev);
      })
      .addCase(deleteNoteForever.fulfilled, (state, action) => {
        state.items = state.items.filter((n) => n.id !== action.payload);
      })
      // Never show one user's notes to the next person who signs in.
      .addCase(clearAuthState, () => initialState);
  },
});

export default notesSlice.reducer;

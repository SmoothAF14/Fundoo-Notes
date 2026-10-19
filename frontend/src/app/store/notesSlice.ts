import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { NotesListItem } from '../../shared/types';
import {
  deleteNote as apiDeleteNote,
  listNotes as apiListNotes,
} from '../../features/notes/api';

export interface NotesState {
  items: NotesListItem[];
  loading: boolean;
  error: string | null;
}

const initialState: NotesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchNotes = createAsyncThunk(
  'notes/fetchAll',
  async (token: string, { rejectWithValue }) => {
    try {
      return await apiListNotes(token);
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load notes');
    }
  }
);

export const removeNote = createAsyncThunk(
  'notes/remove',
  async ({ token, id }: { token: string; id: string }, { rejectWithValue }) => {
    try {
      await apiDeleteNote(token, id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to delete note');
    }
  }
);

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    clearNotesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotes
      .addCase(fetchNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // removeNote
      .addCase(removeNote.fulfilled, (state, action) => {
        state.items = state.items.filter((n) => n.id !== action.payload);
      })
      .addCase(removeNote.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearNotesError } = notesSlice.actions;
export default notesSlice.reducer;

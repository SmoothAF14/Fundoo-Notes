import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { clearAuthState } from '@/app/store/authSlice';
import { createLabel, deleteLabel, listLabels, renameLabel } from '@/features/labels/api';
import type { Label } from '@/shared/types';

interface LabelsState {
  items: Label[];
  loading: boolean;
  error: string | null;
}

const initialState: LabelsState = { items: [], loading: false, error: null };

const message = (err: unknown, fallback: string) => (err instanceof Error && err.message) || fallback;

export const fetchLabels = createAsyncThunk('labels/fetchAll', async (_: void, { rejectWithValue }) => {
  try {
    return await listLabels();
  } catch (err) {
    return rejectWithValue(message(err, 'Failed to load labels'));
  }
});

export const addLabel = createAsyncThunk(
  'labels/add',
  async ({ title }: { title: string }, { rejectWithValue }) => {
    try {
      return await createLabel(title);
    } catch (err) {
      return rejectWithValue(message(err, 'Failed to create label'));
    }
  }
);

export const editLabel = createAsyncThunk(
  'labels/rename',
  async ({ labelId, title }: { labelId: number; title: string }, { rejectWithValue }) => {
    try {
      return await renameLabel(labelId, title);
    } catch (err) {
      return rejectWithValue(message(err, 'Failed to rename label'));
    }
  }
);

export const removeLabel = createAsyncThunk(
  'labels/remove',
  async ({ labelId }: { labelId: number }, { rejectWithValue }) => {
    try {
      await deleteLabel(labelId);
      return labelId;
    } catch (err) {
      return rejectWithValue(message(err, 'Failed to delete label'));
    }
  }
);

const byTitle = (a: Label, b: Label) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

const labelsSlice = createSlice({
  name: 'labels',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLabels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLabels.fulfilled, (state, action) => {
        state.loading = false;
        state.items = [...action.payload].sort(byTitle);
      })
      .addCase(fetchLabels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addLabel.fulfilled, (state, action) => {
        state.items = [...state.items, action.payload].sort(byTitle);
      })
      .addCase(editLabel.fulfilled, (state, action) => {
        state.items = state.items.map((l) => (l.label_id === action.payload.label_id ? action.payload : l)).sort(byTitle);
      })
      .addCase(removeLabel.fulfilled, (state, action) => {
        state.items = state.items.filter((l) => l.label_id !== action.payload);
      })
      .addCase(clearAuthState, () => initialState);
  },
});

export default labelsSlice.reducer;

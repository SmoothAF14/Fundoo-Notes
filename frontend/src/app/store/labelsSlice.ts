import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { Label } from '../../shared/types';
import {
  createLabel as apiCreateLabel,
  deleteLabel as apiDeleteLabel,
  listLabels as apiListLabels,
} from '../../features/labels/api';

export interface LabelsState {
  items: Label[];
  loading: boolean;
  error: string | null;
}

const initialState: LabelsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchLabels = createAsyncThunk(
  'labels/fetchAll',
  async (token: string, { rejectWithValue }) => {
    try {
      return await apiListLabels(token);
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to load labels');
    }
  }
);

export const addLabel = createAsyncThunk(
  'labels/add',
  async ({ token, title }: { token: string; title: string }, { rejectWithValue }) => {
    try {
      return await apiCreateLabel(token, { title });
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to create label');
    }
  }
);

export const removeLabel = createAsyncThunk(
  'labels/remove',
  async ({ token, labelId }: { token: string; labelId: number }, { rejectWithValue }) => {
    try {
      await apiDeleteLabel(token, labelId);
      return labelId;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? 'Failed to delete label');
    }
  }
);

const labelsSlice = createSlice({
  name: 'labels',
  initialState,
  reducers: {
    clearLabelsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchLabels
      .addCase(fetchLabels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLabels.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchLabels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addLabel
      .addCase(addLabel.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items];
      })
      .addCase(addLabel.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // removeLabel
      .addCase(removeLabel.fulfilled, (state, action) => {
        state.items = state.items.filter((l) => l.label_id !== action.payload);
      })
      .addCase(removeLabel.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearLabelsError } = labelsSlice.actions;
export default labelsSlice.reducer;

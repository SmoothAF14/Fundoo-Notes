import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { clearUser, readUser, writeUser } from '@/shared/storage/authStorage';
import type { AuthUser } from '@/shared/types';

interface AuthState {
  user: AuthUser | null;
}

const initialState: AuthState = { user: readUser() };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<AuthUser>) {
      const { id, username, email, phone_number } = action.payload;
      state.user = { id, username, email, phone_number: phone_number ?? null };
      writeUser(state.user);
    },
    clearAuthState(state) {
      clearUser();
      state.user = null;
    },
  },
});

export const { setAuth, clearAuthState } = authSlice.actions;
export default authSlice.reducer;

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AuthTokenResponse, AuthUser } from '../../shared/types';
import { clearAuth, readToken, readUser, writeAuth } from '../../shared/storage/authStorage';

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

const initialState: AuthState = {
  token: readToken(),
  user: readUser(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<AuthTokenResponse>) {
      writeAuth(action.payload);
      state.token = action.payload.token;
      state.user = {
        id: action.payload.id,
        username: action.payload.username,
        email: action.payload.email,
        phone_number: action.payload.phone_number ?? null,
      };
    },
    clearAuthState(state) {
      clearAuth();
      state.token = null;
      state.user = null;
    },
  },
});

export const { setAuth, clearAuthState } = authSlice.actions;
export default authSlice.reducer;

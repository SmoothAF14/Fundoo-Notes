import { useCallback } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store';
import { clearAuthState, setAuth } from '@/app/store/authSlice';
import type { AuthUser } from '@/shared/types';

/** Auth state from the Redux store. The session itself is an httpOnly cookie, so only the profile is here. */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  return {
    user,
    isAuthenticated: !!user,
    setAuth: useCallback((u: AuthUser) => dispatch(setAuth(u)), [dispatch]),
    clear: useCallback(() => dispatch(clearAuthState()), [dispatch]),
  };
}

import { useAppDispatch, useAppSelector } from '../store';
import { setAuth, clearAuthState } from '../store/authSlice';
import type { AuthTokenResponse } from '../../shared/types';

/** Auth state from the Redux store: { token, user, isAuthenticated, setAuth, clear } */
export function useAuth() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);

  return {
    token,
    user,
    isAuthenticated: !!token,
    setAuth: (auth: AuthTokenResponse) => dispatch(setAuth(auth)),
    clear: () => dispatch(clearAuthState()),
  };
}

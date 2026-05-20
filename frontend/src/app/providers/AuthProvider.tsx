import React, { createContext, useCallback, useMemo, useState } from 'react';

import type { AuthTokenResponse, AuthUser } from '../../shared/types';
import { clearAuth, readToken, readUser, writeAuth } from '../../shared/storage/authStorage';

export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (auth: AuthTokenResponse) => void;
  clear: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [user, setUser] = useState<AuthUser | null>(() => readUser());

  const setAuth = useCallback((auth: AuthTokenResponse) => {
    writeAuth(auth);
    setToken(auth.token);
    setUser({
      id: auth.id,
      username: auth.username,
      email: auth.email,
      phone_number: auth.phone_number ?? null,
    });
  }, []);

  const clear = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      setAuth,
      clear,
    }),
    [token, user, setAuth, clear]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

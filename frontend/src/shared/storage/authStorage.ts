import type { AuthTokenResponse, AuthUser } from '../types';

const TOKEN_KEY = 'fundoo.auth.token';
const USER_KEY = 'fundoo.auth.user';

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function writeAuth(auth: AuthTokenResponse): void {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    id: auth.id,
    username: auth.username,
    email: auth.email,
    phone_number: auth.phone_number ?? null,
  } satisfies AuthUser));
}

export function readUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

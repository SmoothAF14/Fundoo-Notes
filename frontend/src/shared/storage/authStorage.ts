import type { AuthUser } from '@/shared/types';

// Only the (non-secret) profile is kept here; the session itself is an httpOnly cookie that scripts can't read.
const USER_KEY = 'fundoo.auth.user';
const LEGACY_TOKEN_KEY = 'fundoo.auth.token';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function readUser(): AuthUser | null {
  return safe(() => {
    localStorage.removeItem(LEGACY_TOKEN_KEY); // tokens from before the cookie switch
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }, null);
}

export function writeUser(user: AuthUser): void {
  safe(() => localStorage.setItem(USER_KEY, JSON.stringify(user)), undefined);
}

export function clearUser(): void {
  safe(() => localStorage.removeItem(USER_KEY), undefined);
}

type OtpSession = {
  identifier: string;
  expiresAtMs: number;
};

function key(kind: 'register' | 'login', identifier: string): string {
  return `fundoo.otp.${kind}.${identifier.trim().toLowerCase()}`;
}

export function saveOtpSession(kind: 'register' | 'login', identifier: string, expiresAtMs: number): void {
  const value: OtpSession = { identifier, expiresAtMs };
  sessionStorage.setItem(key(kind, identifier), JSON.stringify(value));
}

export function loadOtpSession(kind: 'register' | 'login', identifier: string): OtpSession | null {
  const raw = sessionStorage.getItem(key(kind, identifier));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OtpSession;
  } catch {
    return null;
  }
}

export function clearOtpSession(kind: 'register' | 'login', identifier: string): void {
  sessionStorage.removeItem(key(kind, identifier));
}

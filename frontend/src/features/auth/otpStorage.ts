type OtpKind = 'register' | 'login';
type OtpSession = { identifier: string; expiresAtMs: number };

const key = (kind: OtpKind, identifier: string) => `fundoo.otp.${kind}.${identifier.trim().toLowerCase()}`;

// sessionStorage can throw (private mode, blocked storage); the OTP flow then just shows "expired".
export function saveOtpSession(kind: OtpKind, identifier: string, expiresAtMs: number): void {
  try {
    sessionStorage.setItem(key(kind, identifier), JSON.stringify({ identifier, expiresAtMs } satisfies OtpSession));
  } catch {
    // ignore
  }
}

export function loadOtpSession(kind: OtpKind, identifier: string): OtpSession | null {
  try {
    const raw = sessionStorage.getItem(key(kind, identifier));
    return raw ? (JSON.parse(raw) as OtpSession) : null;
  } catch {
    return null;
  }
}

export function clearOtpSession(kind: OtpKind, identifier: string): void {
  try {
    sessionStorage.removeItem(key(kind, identifier));
  } catch {
    // ignore
  }
}

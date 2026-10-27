import { useEffect, useState } from 'react';

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Seconds left until `expiresAtMs` (0 when unset or expired), ticking once a second. */
export function useCountdown(expiresAtMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAtMs) return;
    const t = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAtMs) window.clearInterval(t);
    }, 1000);
    return () => window.clearInterval(t);
  }, [expiresAtMs]);

  return expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - now) / 1000)) : 0;
}

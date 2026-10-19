import { useEffect, useState } from 'react';

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function secondsUntil(expiresAtMs: number | null): number {
  return expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)) : 0;
}

/** Seconds left until `expiresAtMs`, re-rendering every second until it hits zero. */
export function useCountdown(expiresAtMs: number | null): number {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAtMs));

  useEffect(() => {
    setSeconds(secondsUntil(expiresAtMs));
    if (!expiresAtMs) return;
    const t = window.setInterval(() => {
      const next = secondsUntil(expiresAtMs);
      setSeconds(next);
      if (next === 0) window.clearInterval(t);
    }, 1000);
    return () => window.clearInterval(t);
  }, [expiresAtMs]);

  return seconds;
}

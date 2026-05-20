import React, { useEffect, useMemo, useState } from 'react';

function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function OtpTimer({ expiresAtMs }: { expiresAtMs: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remainingSeconds = useMemo(() => Math.max(0, Math.ceil((expiresAtMs - now) / 1000)), [expiresAtMs, now]);
  return <span className="font-semibold text-slate-900">{formatSeconds(remainingSeconds)}</span>;
}

export function isExpired(expiresAtMs: number): boolean {
  return Date.now() >= expiresAtMs;
}

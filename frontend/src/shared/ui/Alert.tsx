import React from 'react';

import { Icon } from './Icon';

type Tone = 'error' | 'warning';

const tones: Record<Tone, string> = {
  error: 'bg-danger-soft border-red-200 text-red-800',
  warning: 'bg-accent-soft border-orange-200 text-orange-900',
};

export function Alert({ tone = 'error', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}
    >
      <Icon name={tone === 'error' ? 'alert' : 'clock'} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

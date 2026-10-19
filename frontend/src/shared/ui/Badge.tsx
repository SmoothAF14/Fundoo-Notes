import React from 'react';

type Tone = 'neutral' | 'blue' | 'orange' | 'green';

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-subtle',
  blue: 'bg-primary-soft text-primary-hover',
  orange: 'bg-accent-soft text-orange-800',
  green: 'bg-success-soft text-emerald-800',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PermissionBadge({ permission }: { permission: 'view' | 'edit' }) {
  return permission === 'edit' ? <Badge tone="orange">Can edit</Badge> : <Badge tone="blue">Can view</Badge>;
}

export function Avatar({ name, className = 'h-8 w-8 text-xs' }: { name: string; className?: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-500 font-semibold text-white ring-2 ring-white ${className}`}
    >
      {initial}
    </span>
  );
}

import { CircleAlert, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: React.ReactNode }) {
  const Icon = tone === 'error' ? CircleAlert : Info;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
        tone === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-foreground/[0.04] text-foreground/80'
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

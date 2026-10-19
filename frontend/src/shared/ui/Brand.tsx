import React from 'react';

import { Icon } from './Icon';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={[
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm',
          inverted ? 'bg-white/15 text-white ring-1 ring-white/30' : 'bg-primary text-white',
        ].join(' ')}
      >
        <Icon name="note" className="h-5 w-5" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}>Fundoo Notes</span>
    </div>
  );
}

import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

/** The leaf-shaped cobalt mark next to the bold wordmark. */
export function Brand({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4', className)}
      aria-label="Fundoo Notes home"
    >
      <span aria-hidden="true" className="size-7 rounded-[50%_50%_50%_6px] bg-cobalt" />
      <span className="font-display text-[26px] font-extrabold tracking-[-0.045em]">fundoo</span>
    </Link>
  );
}

import React from 'react';

import { Brand } from '../../../shared/ui/Brand';
import { Icon, type IconName } from '../../../shared/ui/Icon';

const highlights: { icon: IconName; title: string; text: string }[] = [
  { icon: 'note', title: 'Capture anything', text: 'Jot down ideas, lists and plans in seconds.' },
  { icon: 'tag', title: 'Stay organized', text: 'Group notes with labels and find them instantly.' },
  { icon: 'users', title: 'Work together', text: 'Share notes with view or edit access.' },
];

type AuthShellProps = {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Split-screen layout shared by every sign-in / sign-up screen. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" aria-hidden="true" />

        <Brand inverted />

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Your thoughts, beautifully organized.</h2>
          <ul className="mt-10 space-y-6">
            {highlights.map((h) => (
              <li key={h.title} className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Icon name={h.icon} />
                </span>
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="mt-0.5 text-sm text-blue-100">{h.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-blue-100">Secured with one-time passcodes.</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="animate-rise w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-[15px] text-subtle">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-sm text-subtle">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}

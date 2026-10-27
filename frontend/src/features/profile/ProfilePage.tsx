import { LogOut } from 'lucide-react';

import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/app/providers/useSignOut';
import { useAppSelector } from '@/app/store';
import { Page } from '@/components/Page';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="text-[13px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm">{children}</dd>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const notes = useAppSelector((s) => s.notes.items);
  const labels = useAppSelector((s) => s.labels.items);
  const own = notes.filter((n) => n.access === 'owner');

  return (
    <Page className="mx-auto max-w-xl">
      <header className="mb-8 flex items-center gap-4">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-cobalt font-display text-4xl font-extrabold text-white" aria-hidden="true">
          {(user?.username || '?').charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-brand">Profile</p>
          <h1 className="display truncate text-[clamp(44px,6vw,80px)]">{user?.username}</h1>
        </div>
      </header>

      <section className="rounded-[32px] border-2 border-outline bg-card px-6 shadow-[0_6px_0_var(--outline)]">
        <dl className="divide-y divide-border">
          <Row label="Email">{user?.email || '—'}</Row>
          <Row label="Phone">{user?.phone_number || '—'}</Row>
          <Row label="Notes">{own.filter((n) => !n.trashed).length}</Row>
          <Row label="Labels">{labels.length}</Row>
          <Row label="Shared with you">{notes.length - own.length}</Row>
        </dl>
      </section>

      <section className="mt-6 flex items-center justify-between rounded-full border-2 border-outline bg-card px-6 py-2">
        <span className="text-[13px] font-semibold text-muted-foreground">Theme</span>
        <ThemeToggle />
      </section>

      <Button variant="outline" size="lg" className="mt-6 w-full" onClick={() => void signOut()}>
        <LogOut /> Sign out
      </Button>
    </Page>
  );
}

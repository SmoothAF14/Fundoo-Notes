import { Page } from '@/components/Page';

import { LabelsManager } from '../LabelsManager';

export function LabelsPage() {
  return (
    <Page className="mx-auto max-w-xl">
      <header className="mb-8">
        <h1 className="display text-[clamp(48px,7vw,96px)]">Labels.</h1>
        <p className="mt-4 text-base text-muted-foreground">Group related notes so you can find them in one click.</p>
      </header>
      <div className="rounded-[32px] border-2 border-outline bg-card p-5 shadow-[0_6px_0_var(--outline)]">
        <LabelsManager />
      </div>
    </Page>
  );
}

import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { makeStore, type RootState } from '@/app/store';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/lib/theme';
import type { Label, NotesListItem } from '@/shared/types';

const AUTH = { token: 'test-token', user: { id: 'u1', username: 'alice', email: 'alice@example.com' } };

export function makeNote(overrides: Partial<NotesListItem> = {}): NotesListItem {
  return {
    id: 'n1',
    owner: { name: 'alice', email: 'alice@example.com' },
    title: 'Groceries',
    content: 'Milk, eggs',
    labels: [],
    label_names: '',
    collaborators: [],
    access: 'owner',
    archived: false,
    pinned: false,
    color: '',
    reminder_at: null,
    trashed: false,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

export function makeLabel(label_id: number, title: string): Label {
  return { label_id, title, created_at: '2026-10-01T10:00:00Z', created_by: 'u1' };
}

export function storeState({ notes = [], labels = [] }: { notes?: NotesListItem[]; labels?: Label[] } = {}): Partial<RootState> {
  return {
    auth: AUTH,
    notes: { items: notes, loading: false, loaded: true, error: null, rollback: {} },
    labels: { items: labels, loading: false, error: null },
  };
}

export function renderWithProviders(ui: React.ReactElement, { route = '/', state = storeState() }: { route?: string; state?: Partial<RootState> } = {}) {
  const store = makeStore(state);
  const result = render(
    <Provider store={store}>
      <ThemeProvider>
        <TooltipProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </Provider>
  );
  return { store, ...result };
}

/** Minimal fetch Response stand-in for the API boundary. */
export function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** Stubs fetch with a handler and returns the mock so tests can inspect calls. */
export function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

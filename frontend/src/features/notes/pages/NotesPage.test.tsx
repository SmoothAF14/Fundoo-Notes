import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import type { NotesListItem } from '../../../shared/types';
import { jsonResponse, renderWithProviders } from '../../../test-utils';
import { NotesPage } from './NotesPage';

const NOTES: NotesListItem[] = [
  {
    id: 'n1',
    owner: { name: 'alice', email: 'alice@example.com' },
    title: 'Groceries',
    content: 'Milk, eggs',
    label_names: 'Home',
    collaborators: [],
    access: 'owner',
  },
  {
    id: 'n2',
    owner: { name: 'alice', email: 'alice@example.com' },
    title: 'Sprint plan',
    content: 'Ship the redesign',
    label_names: 'Work, Urgent',
    collaborators: [{ name: 'bob', email: 'bob@example.com', permission: 'edit' }],
    access: 'owner',
  },
  {
    id: 'n3',
    owner: { name: 'bob', email: 'bob@example.com' },
    title: 'Team retro',
    content: 'What went well',
    label_names: '',
    collaborators: [],
    access: 'view',
  },
];

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/app/notes" element={<NotesPage />} />
      <Route path="/app/shared" element={<NotesPage mode="shared" />} />
    </Routes>,
    { route }
  );
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === 'DELETE' ? { ok: true, status: 204, headers: { get: () => null } } : jsonResponse({ message: '', status_code: 200, payload: NOTES })
  );
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('NotesPage', () => {
  it('shows only notes the user owns on "My notes"', async () => {
    renderAt('/app/notes');
    expect(await screen.findByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Sprint plan')).toBeInTheDocument();
    expect(screen.queryByText('Team retro')).not.toBeInTheDocument();
  });

  it('shows only notes shared by others on "Shared with me", marked view only', async () => {
    renderAt('/app/shared');
    expect(await screen.findByText('Team retro')).toBeInTheDocument();
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    expect(screen.getByText(/view only/i)).toBeInTheDocument();
  });

  it('filters by the ?q= search across title, content and labels', async () => {
    renderAt('/app/notes?q=redesign');
    expect(await screen.findByText('Sprint plan')).toBeInTheDocument();
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
  });

  it('filters by the ?label= label and can clear the filter', async () => {
    renderAt('/app/notes?label=Home');
    expect(await screen.findByText('Groceries')).toBeInTheDocument();
    expect(screen.queryByText('Sprint plan')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear label filter/i }));

    expect(await screen.findByText('Sprint plan')).toBeInTheDocument();
  });

  it('shows a helpful empty state when nothing matches', async () => {
    renderAt('/app/notes?q=zzz');
    expect(await screen.findByRole('heading', { name: /no matching notes/i })).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, and removes the note once confirmed', async () => {
    renderAt('/app/notes');
    const card = (await screen.findByText('Groceries')).closest('article')!;

    fireEvent.click(within(card).getByRole('button', { name: /delete note/i }));
    const dialog = screen.getByRole('dialog', { name: /delete note/i });
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'DELETE' }));

    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText('Groceries')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/notes\/api\/notes\/n1\/$/), expect.objectContaining({ method: 'DELETE' }));
  });
});

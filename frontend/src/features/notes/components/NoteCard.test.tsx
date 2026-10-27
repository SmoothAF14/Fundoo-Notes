import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { jsonResponse, makeLabel, makeNote, mockFetch, renderWithProviders, storeState } from '@/test-utils';
import type { NotesListItem } from '@/shared/types';

import { NoteCard } from './NoteCard';

function renderCard(note: NotesListItem, handlers: { onOpen?: () => void; onShare?: () => void } = {}) {
  return renderWithProviders(<NoteCard note={note} index={0} onOpen={handlers.onOpen ?? vi.fn()} onShare={handlers.onShare ?? vi.fn()} />, {
    state: storeState({ notes: [note], labels: [makeLabel(1, 'Work')] }),
  });
}

/** PATCH responses echo the note with the requested change applied. */
function echoPatch(note: NotesListItem) {
  return mockFetch((_url, init) =>
    jsonResponse({ ...note, ...(init?.body ? JSON.parse(init.body as string) : {}), owner_username: 'alice', created_by: 'u1', shared_with: [] })
  );
}

describe('NoteCard', () => {
  it('shows title, content, live label names and the reminder', () => {
    renderCard(makeNote({ labels: [1], reminder_at: '2999-01-01T09:00:00Z' }));
    expect(screen.getByRole('heading', { name: 'Groceries' })).toBeInTheDocument();
    expect(screen.getByText('Milk, eggs')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText(/2999/)).toBeInTheDocument();
  });

  it('opens the editor from the whole-card button', () => {
    const onOpen = vi.fn();
    renderCard(makeNote(), { onOpen });
    fireEvent.click(screen.getByRole('button', { name: 'Open note: Groceries' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });

  it('archives via PATCH, updates the store and offers Undo', async () => {
    const note = makeNote();
    const fetch = echoPatch(note);
    const { store } = renderCard(note);

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));

    expect(store.getState().notes.items[0].archived).toBe(true); // optimistic
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/notes\/api\/notes\/n1\/$/);
    expect(init!.method).toBe('PATCH');
    expect(JSON.parse(init!.body as string)).toEqual({ archived: true, pinned: false });

    const toast = await screen.findByText('Note archived');
    fireEvent.click(within(toast.closest('[data-sonner-toast]') as HTMLElement).getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(store.getState().notes.items[0].archived).toBe(false));
    expect(JSON.parse(fetch.mock.calls[1][1]!.body as string)).toEqual({ archived: false, pinned: false });
  });

  it('rolls the optimistic change back when the server refuses', async () => {
    mockFetch(() => jsonResponse({ detail: 'You do not have permission to edit this note' }, 403));
    const { store } = renderCard(makeNote());
    fireEvent.click(screen.getByRole('button', { name: 'Pin note' }));
    expect(store.getState().notes.items[0].pinned).toBe(true);
    await waitFor(() => expect(store.getState().notes.items[0].pinned).toBe(false));
    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument();
  });

  it('in the trash offers Restore and a confirmed Delete forever', async () => {
    const note = makeNote({ trashed: true });
    const fetch = mockFetch((_url, init) =>
      init?.method === 'DELETE' ? { ok: true, status: 204, headers: { get: () => null } } : jsonResponse({ ...note, trashed: false })
    );
    const { store } = renderCard(note);
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }));
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete forever' }));

    await waitFor(() => expect(store.getState().notes.items).toHaveLength(0));
    expect(fetch.mock.calls[0][1]!.method).toBe('DELETE');
  });

  it('a view-only shared note shows who shared it and no edit actions', () => {
    renderCard(makeNote({ access: 'view', owner: { name: 'bob', email: '' }, label_names: 'Team' }));
    expect(screen.getByText(/bob · view only/)).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pin note/i })).not.toBeInTheDocument();
  });
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NotesListItem } from '@/shared/types';
import { jsonResponse, makeLabel, makeNote, mockFetch, renderWithProviders, storeState } from '@/test-utils';

import { NoteEditorDialog } from './NoteEditorDialog';

function renderEditor(note: NotesListItem, onShare = vi.fn()) {
  return renderWithProviders(<NoteEditorDialog note={note} onClose={vi.fn()} onShare={onShare} />, {
    state: storeState({ notes: [note], labels: [makeLabel(1, 'Work')] }),
  });
}

describe('NoteEditorDialog', () => {
  it('shows the note card with Labels, Reminder, Colour and Sharing info cards for the owner', () => {
    renderEditor(makeNote({ labels: [1], collaborators: [{ name: 'bob', email: 'bob@example.com', permission: 'edit' }] }));
    expect(screen.getByLabelText('Title')).toHaveValue('Groceries');
    for (const name of ['Labels', 'Reminder', 'Colour', 'Sharing']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('can edit')).toBeInTheDocument();
  });

  it('changes the colour straight from the Colour card', async () => {
    const note = makeNote();
    const fetch = mockFetch((_url, init) => jsonResponse({ ...note, ...JSON.parse(String(init?.body)), owner_username: 'alice', created_by: 'u1', shared_with: [] }));
    const { store } = renderEditor(note);

    fireEvent.click(screen.getByRole('radio', { name: 'Cobalt' }));

    await waitFor(() => expect(store.getState().notes.items[0].color).toBe('tide'));
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ color: 'tide' });
  });

  it('opens sharing from the Sharing card', () => {
    const onShare = vi.fn();
    renderEditor(makeNote(), onShare);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(onShare).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
  });

  it('gives collaborators a read-only summary instead of the owner controls', () => {
    renderEditor(makeNote({ access: 'view', owner: { name: 'bob', email: '' }, label_names: 'Team' }));
    expect(screen.getByRole('region', { name: 'Shared with you' })).toHaveTextContent(/bob shared this note/i);
    expect(screen.queryByRole('region', { name: 'Colour' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('shows only Restore for a trashed note', () => {
    renderEditor(makeNote({ trashed: true }));
    expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Labels' })).not.toBeInTheDocument();
  });
});

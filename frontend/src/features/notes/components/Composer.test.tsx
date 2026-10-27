import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { jsonResponse, makeNote, mockFetch, renderWithProviders } from '@/test-utils';

import { Composer } from './Composer';

describe('Composer', () => {
  it('starts collapsed and expands into title and note fields on focus', () => {
    renderWithProviders(<Composer />);
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();

    fireEvent.focus(screen.getByRole('button', { name: 'Take a note…' }));

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remind me' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Background colour' })).toBeInTheDocument();
  });

  it('collapses without saving when nothing was typed', () => {
    const fetch = mockFetch(() => jsonResponse({}));
    renderWithProviders(<Composer />);
    fireEvent.click(screen.getByRole('button', { name: 'Take a note…' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Take a note…' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('explains inline that a body is needed instead of failing at the API', () => {
    const fetch = mockFetch(() => jsonResponse({}));
    renderWithProviders(<Composer />);
    fireEvent.click(screen.getByRole('button', { name: 'Take a note…' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Only a title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/write something in the note/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates the note with the chosen options, adds it to the store and collapses', async () => {
    const created = makeNote({ id: 'new', title: 'Trip', content: 'Pack bags', pinned: true });
    const fetch = mockFetch(() => jsonResponse(created, 201));
    const { store } = renderWithProviders(<Composer />);

    fireEvent.click(screen.getByRole('button', { name: 'Take a note…' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: '  Trip ' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Pack bags' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Take a note…' })).toBeInTheDocument());
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/notes\/api\/notes\/$/);
    expect(JSON.parse(init!.body as string)).toMatchObject({ title: 'Trip', content: 'Pack bags', pinned: true, archived: false });
    expect(store.getState().notes.items.map((n) => n.id)).toEqual(['new']);
    expect(await screen.findByText('Note created')).toBeInTheDocument();
  });
});

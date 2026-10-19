import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import type { Label } from '../../../shared/types';
import { NoteForm } from './NoteForm';

const LABELS: Label[] = [
  { label_id: 1, title: 'Home', created_at: '', created_by: 'u1' },
  { label_id: 2, title: 'Work', created_at: '', created_by: 'u1' },
];

function renderForm(onSubmit = jest.fn(), initialLabels: number[] = []) {
  render(
    <MemoryRouter>
      <NoteForm
        heading="New note"
        backTo="/app/notes"
        initial={{ title: 'Trip', content: 'Pack bags', labels: initialLabels }}
        labels={LABELS}
        submitLabel="Save note"
        saving={false}
        error={null}
        onSubmit={onSubmit}
      />
    </MemoryRouter>
  );
  return onSubmit;
}

describe('NoteForm', () => {
  it('toggles a label chip on and off', () => {
    renderForm();
    const work = screen.getByRole('button', { name: 'Work' });
    expect(work).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(work);
    expect(work).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(work);
    expect(work).toHaveAttribute('aria-pressed', 'false');
  });

  it('submits the edited title, content and selected labels', () => {
    const onSubmit = renderForm(jest.fn(), [1]);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Trip to Goa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Work' }));
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Trip to Goa', content: 'Pack bags', labels: [1, 2] });
  });
});

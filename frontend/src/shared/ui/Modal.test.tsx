import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(
      <Modal open={false} title="Share" onClose={jest.fn()}>
        body
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is an accessible dialog that takes focus when opened', () => {
    render(
      <Modal open title="Share" onClose={jest.fn()}>
        <input aria-label="Email" />
      </Modal>
    );
    const dialog = screen.getByRole('dialog', { name: 'Share' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape', () => {
    const onClose = jest.fn();
    render(
      <Modal open title="Share" onClose={onClose}>
        body
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the close button', () => {
    const onClose = jest.fn();
    render(
      <Modal open title="Share" onClose={onClose}>
        body
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

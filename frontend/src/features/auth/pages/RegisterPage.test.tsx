import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { jsonResponse, mockFetch, renderWithProviders, storeState } from '@/test-utils';

import { RegisterPage } from './RegisterPage';

const signedOut = { ...storeState(), auth: { user: null } };

function fill(values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
}

describe('RegisterPage', () => {
  it('validates inline before calling the API', () => {
    const fetch = mockFetch(() => jsonResponse({}));
    renderWithProviders(<RegisterPage />, { state: signedOut });
    fill({ Username: 'alice', Email: 'not-an-email', Password: 'short' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows "Username already exists" under the username field, not "Request failed (400)"', async () => {
    mockFetch(() => jsonResponse({ username: 'Username already exists' }, 400));
    renderWithProviders(<RegisterPage />, { state: signedOut });
    fill({ Username: 'Yogita', Email: 'yogita@example.com', Password: 'A-strong-pass-987' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const error = await screen.findByText('Username already exists');
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-describedby', error.id);
    expect(screen.queryByText(/request failed/i)).not.toBeInTheDocument();
  });

  it('shows the server’s password rules next to the password field', async () => {
    mockFetch(() => jsonResponse({ password: ['This password is too common.'] }, 400));
    renderWithProviders(<RegisterPage />, { state: signedOut });
    fill({ Username: 'alice', Email: 'alice@example.com', Password: 'password123' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('This password is too common.')).toBeInTheDocument();
  });
});

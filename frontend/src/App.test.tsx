import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppRoutes } from '@/app/App';
import { jsonResponse, mockFetch, renderWithProviders, storeState } from '@/test-utils';

const signedOut = { ...storeState(), auth: { user: null } };

describe('routing', () => {
  it('shows the landing page at /', async () => {
    renderWithProviders(<AppRoutes />, { route: '/', state: signedOut });
    expect(await screen.findByRole('heading', { level: 1, name: /think it.*keep it/i }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('redirects signed-out users from the workspace to sign in', async () => {
    renderWithProviders(<AppRoutes />, { route: '/notes', state: signedOut });
    expect(await screen.findByRole('heading', { name: /welcome back/i }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('sends links from the old /app/... URLs to the new routes', async () => {
    mockFetch((url) => jsonResponse(url.includes('/notes/api/notes/') ? { message: '', payload: [], status_code: 200 } : []));
    renderWithProviders(<AppRoutes />, { route: '/app/labels' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Labels.' }, { timeout: 5000 })).toBeInTheDocument();
  });
});

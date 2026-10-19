import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

import { makeStore, type RootState } from './app/store';

export const AUTHED: Partial<RootState> = {
  auth: { token: 'test-token', user: { id: 'u1', username: 'alice', email: 'alice@example.com' } },
};

export function renderWithProviders(ui: React.ReactElement, { route = '/', state = AUTHED }: { route?: string; state?: Partial<RootState> } = {}) {
  const store = makeStore(state);
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
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

import React from 'react';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';

import { App } from './app/App';
import { makeStore } from './app/store';

test('redirects unauthenticated users to the sign-in screen', () => {
  render(
    <Provider store={makeStore({ auth: { token: null, user: null } })}>
      <App />
    </Provider>
  );
  expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
});

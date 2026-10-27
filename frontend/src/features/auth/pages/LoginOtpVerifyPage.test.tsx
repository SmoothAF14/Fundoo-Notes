import { act, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders, storeState } from '@/test-utils';

import { saveOtpSession } from '../otpStorage';
import { LoginOtpVerifyPage } from './LoginOtpVerifyPage';

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/auth/login/verify" element={<LoginOtpVerifyPage />} />
    </Routes>,
    { route: '/auth/login/verify?u=alice', state: { ...storeState(), auth: { user: null } } }
  );
}

describe('LoginOtpVerifyPage', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
  afterEach(() => vi.useRealTimers());

  it('allows submitting a code while the OTP is still valid', () => {
    saveOtpSession('login', 'alice', Date.now() + 60_000);
    renderPage();
    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '123456' } });
    expect(screen.getByRole('button', { name: /verify/i })).toBeEnabled();
  });

  it('disables verification once the countdown reaches zero, without any user interaction', () => {
    saveOtpSession('login', 'alice', Date.now() + 2_000);
    renderPage();
    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '123456' } });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByRole('button', { name: /verify/i })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/expired/i);
  });

  it('treats a missing OTP session as expired', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /verify/i })).toBeDisabled();
  });
});

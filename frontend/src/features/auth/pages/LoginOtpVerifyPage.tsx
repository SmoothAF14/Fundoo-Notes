import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { verifyLoginOtp } from '../api';
import { OtpVerifyForm } from '../components/OtpVerifyForm';

export function LoginOtpVerifyPage() {
  const [params] = useSearchParams();
  const username = (params.get('u') || '').trim();
  const verify = useCallback((otp: string) => verifyLoginOtp({ username, otp }), [username]);

  return (
    <OtpVerifyForm
      kind="login"
      identifier={username}
      backTo="/login"
      verify={verify}
      subtitle={
        <>
          Enter the sign-in code we emailed to <span className="font-semibold text-ink">{username}</span>.
        </>
      }
    />
  );
}

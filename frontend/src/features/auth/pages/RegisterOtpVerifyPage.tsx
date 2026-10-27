import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { verifyRegisterOtp } from '../api';
import { OtpVerifyForm } from '../components/OtpVerifyForm';

export function RegisterOtpVerifyPage() {
  const [params] = useSearchParams();
  const email = (params.get('e') || '').trim();
  const verify = useCallback((otp: string) => verifyRegisterOtp({ email, otp }), [email]);

  return (
    <OtpVerifyForm
      kind="register"
      identifier={email}
      backTo="/register"
      verify={verify}
      subtitle={
        <>
          We sent a verification code to <span className="font-medium text-foreground">{email}</span>.
        </>
      }
    />
  );
}

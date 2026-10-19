import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { ApiError } from '../../../shared/api/ApiError';
import type { AuthTokenResponse } from '../../../shared/types';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { Field, inputClass } from '../../../shared/ui/Field';
import { Icon } from '../../../shared/ui/Icon';
import { clearOtpSession, loadOtpSession } from '../otpStorage';
import { formatSeconds, useCountdown } from './OtpTimer';
import { AuthShell } from './AuthShell';

type OtpVerifyFormProps = {
  kind: 'login' | 'register';
  identifier: string;
  subtitle: React.ReactNode;
  backTo: string;
  verify: (otp: string) => Promise<AuthTokenResponse>;
};

/** Shared OTP step for both login and registration. */
export function OtpVerifyForm({ kind, identifier, subtitle, backTo, verify }: OtpVerifyFormProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const session = useMemo(() => (identifier ? loadOtpSession(kind, identifier) : null), [kind, identifier]);
  const secondsLeft = useCountdown(session?.expiresAtMs ?? null);
  const expired = secondsLeft === 0;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const res = await verify(otp.trim());
        clearOtpSession(kind, identifier);
        setAuth(res);
        navigate('/app/notes', { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [verify, otp, kind, identifier, setAuth, navigate]
  );

  if (!identifier) {
    return (
      <AuthShell title="Session expired" subtitle="We couldn't find your verification request.">
        <Link to={backTo} className="font-semibold text-primary hover:text-primary-hover">
          Start again
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={subtitle}
      footer={
        <Link to={backTo} className="inline-flex items-center gap-1.5 font-semibold text-subtle hover:text-ink">
          <Icon name="arrowLeft" className="h-4 w-4" /> Back
        </Link>
      }
    >
      <div className="mb-6 flex items-center gap-2 text-sm text-subtle" aria-live="polite">
        <Icon name="clock" className="h-4 w-4" />
        {expired ? (
          <span>Code expired</span>
        ) : (
          <span>
            Code expires in <span className="font-semibold tabular-nums text-ink">{formatSeconds(secondsLeft)}</span>
          </span>
        )}
      </div>

      {error ? <Alert className="mb-5">{error}</Alert> : null}
      {expired ? (
        <Alert tone="warning" className="mb-5">
          This code has expired. Go back to request a new one.
        </Alert>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="6-digit code">
          {(id) => (
            <input
              id={id}
              className={`${inputClass} text-center text-2xl font-semibold tracking-[0.5em]`}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              maxLength={6}
              autoFocus
              required
            />
          )}
        </Field>

        <Button type="submit" className="w-full" loading={loading} disabled={expired || otp.length !== 6}>
          {loading ? 'Verifying…' : 'Verify and continue'}
        </Button>
      </form>
    </AuthShell>
  );
}

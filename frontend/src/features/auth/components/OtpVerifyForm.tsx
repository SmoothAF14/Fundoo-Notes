import { ArrowLeft, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/useAuth';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/shared/types';

import { clearOtpSession, loadOtpSession } from '../otpStorage';
import { AuthLayout } from './AuthLayout';
import { FormAlert } from './FormAlert';
import { splitApiError } from '../apiErrors';
import { FormField } from './FormField';
import { formatSeconds, useCountdown } from './OtpTimer';

type OtpVerifyFormProps = {
  kind: 'login' | 'register';
  identifier: string;
  subtitle: React.ReactNode;
  backTo: string;
  verify: (otp: string) => Promise<AuthUser>;
};

/** Shared 6-digit code step for sign in and sign up. */
export function OtpVerifyForm({ kind, identifier, subtitle, backTo, verify }: OtpVerifyFormProps) {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const session = useMemo(() => (identifier ? loadOtpSession(kind, identifier) : null), [kind, identifier]);
  const secondsLeft = useCountdown(session?.expiresAtMs ?? null);
  const expired = secondsLeft === 0;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const back = (
    <Link to={backTo} className="inline-flex items-center gap-1.5 font-medium text-foreground/80 hover:text-foreground">
      <ArrowLeft className="size-4" /> Back
    </Link>
  );

  if (!identifier) {
    return (
      <AuthLayout eyebrow="Verification" title="Start again." subtitle="We couldn’t find your verification request." footer={back}>
        <Button asChild size="lg" className="w-full">
          <Link to={backTo}>Go back</Link>
        </Button>
      </AuthLayout>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Enter the 6-digit code from the email.');
    setError(null);
    setLoading(true);
    try {
      const res = await verify(otp);
      clearOtpSession(kind, identifier);
      setAuth(res);
      navigate('/notes', { replace: true });
    } catch (err) {
      const { fields, general } = splitApiError(err, ['otp'] as const);
      setError(fields.otp ?? general);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="Verification" title="Check your inbox." subtitle={subtitle} footer={back}>
      <p className="text-[13px] font-semibold mb-5 flex items-center gap-2 text-muted-foreground" aria-live="polite">
        <Clock className="size-3.5" aria-hidden="true" />
        {expired ? 'Code expired' : <>Expires in <span className="tabular-nums text-foreground">{formatSeconds(secondsLeft)}</span></>}
      </p>
      {expired ? (
        <FormAlert tone="info">
          This code has expired. <Link to={backTo} className="font-medium underline underline-offset-2">Request a new one</Link>.
        </FormAlert>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField
          label="6-digit code"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          error={error}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          maxLength={6}
          autoFocus
          className="h-12 text-center text-2xl tracking-[0.5em]"
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading || expired}>
          {loading ? 'Verifying…' : 'Verify and continue'}
        </Button>
      </form>
    </AuthLayout>
  );
}

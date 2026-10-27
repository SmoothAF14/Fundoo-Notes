import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { requestPasswordResetOtp, resetPassword } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { FormAlert } from '../components/FormAlert';
import { type FieldErrors, splitApiError } from '../apiErrors';
import { FormField } from '../components/FormField';
import { formatSeconds, useCountdown } from '../components/OtpTimer';
import { PasswordField } from '../components/PasswordField';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Field = 'email' | 'otp' | 'new_password' | 'confirm';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const secondsLeft = useCountdown(expiresAt);

  const clear = (field: Field) => setErrors((x) => ({ ...x, [field]: undefined }));

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setGeneral(null);
    if (!EMAIL.test(email.trim())) return setErrors({ email: 'Enter a valid email address.' });
    setLoading(true);
    try {
      const res = await requestPasswordResetOtp({ email: email.trim() });
      setExpiresAt(Date.now() + res.otp_expires_in_seconds * 1000);
      setStep('reset');
      setErrors({});
    } catch (err) {
      const split = splitApiError(err, ['email'] as const);
      setErrors(split.fields);
      setGeneral(split.general);
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors<Field> = {};
    if (otp.length !== 6) next.otp = 'Enter the 6-digit code from the email.';
    if (password.length < 8) next.new_password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = 'Passwords don’t match.';
    setErrors(next);
    setGeneral(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await resetPassword({ email: email.trim(), otp, new_password: password });
      toast('Password changed. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      const split = splitApiError(err, ['otp', 'new_password'] as const);
      setErrors(split.fields);
      setGeneral(split.general);
    } finally {
      setLoading(false);
    }
  };

  const back = (
    <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-foreground/80 hover:text-foreground">
      <ArrowLeft className="size-4" /> Back to sign in
    </Link>
  );

  if (step === 'email') {
    return (
      <AuthLayout eyebrow="Account recovery" title="Forgot it? Happens." subtitle="Enter your account email and we’ll send you a reset code." footer={back}>
        {general ? <FormAlert>{general}</FormAlert> : null}
        <form onSubmit={requestCode} noValidate className="space-y-5">
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clear('email');
            }}
            error={errors.email}
            autoComplete="email"
            autoFocus
          />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'Sending code…' : 'Send reset code'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Pick a new one."
      subtitle={
        <>
          If an account exists for <span className="font-medium text-foreground">{email.trim()}</span>, we’ve emailed it a 6-digit code.
        </>
      }
      footer={back}
    >
      {general ? <FormAlert>{general}</FormAlert> : null}
      <form onSubmit={submitReset} noValidate className="space-y-5">
        <FormField
          label="6-digit code"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
            clear('otp');
          }}
          error={errors.otp}
          hint={secondsLeft ? `Expires in ${formatSeconds(secondsLeft)}` : 'Code expired — send a new one below.'}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          className="tracking-[0.4em]"
        />
        <PasswordField
          label="New password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clear('new_password');
          }}
          error={errors.new_password}
          hint="At least 8 characters. Avoid common or all-number passwords."
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            clear('confirm');
          }}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Saving…' : 'Change password'}
        </Button>
        <button
          type="button"
          onClick={() => void requestCode()}
          disabled={loading}
          className="w-full cursor-pointer text-center text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
        >
          Send a new code
        </button>
      </form>
    </AuthLayout>
  );
}

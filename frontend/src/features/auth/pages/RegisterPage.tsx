import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../../../shared/api/ApiError';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/Field';
import { requestRegisterOtp } from '../api';
import { AuthShell } from '../components/AuthShell';
import { saveOtpSession } from '../otpStorage';

export function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [phone_number, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (phone_number && phone_number.length !== 10) {
        setError('Phone number must be exactly 10 digits');
        return;
      }

      setLoading(true);
      try {
        const res = await requestRegisterOtp({ username, email, password, phone_number: phone_number || null });
        saveOtpSession('register', email, Date.now() + res.otp_expires_in_seconds * 1000);
        navigate(`/auth/register/verify?e=${encodeURIComponent(email)}`, { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [username, phone_number, email, password, navigate]
  );

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute. We'll verify your email with a one-time code."
      footer={
        <>
          Already have an account?{' '}
          <Link className="font-semibold text-primary hover:text-primary-hover" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      {error ? <Alert className="mb-5">{error}</Alert> : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <TextField
          label="Phone (optional)"
          hint="10 digits, numbers only."
          value={phone_number}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Button type="submit" className="w-full" loading={loading}>
          {loading ? 'Sending code…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}

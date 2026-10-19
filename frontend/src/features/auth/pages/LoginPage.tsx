import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../../../shared/api/ApiError';
import { Alert } from '../../../shared/ui/Alert';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/Field';
import { requestLoginOtp } from '../api';
import { AuthShell } from '../components/AuthShell';
import { saveOtpSession } from '../otpStorage';

export function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const res = await requestLoginOtp({ username, password });
        saveOtpSession('login', username, Date.now() + res.otp_expires_in_seconds * 1000);
        navigate(`/auth/login/verify?u=${encodeURIComponent(username)}`, { replace: true });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [username, password, navigate]
  );

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your username and password. We'll email you a one-time code."
      footer={
        <>
          New to Fundoo Notes?{' '}
          <Link className="font-semibold text-primary hover:text-primary-hover" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      {error ? <Alert className="mb-5">{error}</Alert> : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button type="submit" className="w-full" loading={loading}>
          {loading ? 'Sending code…' : 'Continue'}
        </Button>
      </form>
    </AuthShell>
  );
}

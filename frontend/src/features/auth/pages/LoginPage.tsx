import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { requestLoginOtp } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { FormAlert } from '../components/FormAlert';
import { type FieldErrors, splitApiError } from '../apiErrors';
import { FormField } from '../components/FormField';
import { PasswordField } from '../components/PasswordField';
import { saveOtpSession } from '../otpStorage';

type Field = 'username' | 'password';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors<Field> = {};
    if (!username.trim()) next.username = 'Enter your username.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setGeneral(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await requestLoginOtp({ username: username.trim(), password });
      saveOtpSession('login', username.trim(), Date.now() + res.otp_expires_in_seconds * 1000);
      navigate(`/auth/login/verify?u=${encodeURIComponent(username.trim())}`);
    } catch (err) {
      const split = splitApiError(err, ['username', 'password'] as const);
      setErrors(split.fields);
      setGeneral(split.general);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Sign in to fundoo"
      title="Welcome back."
      subtitle="We’ll email you a one-time code to finish signing in."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {general ? <FormAlert>{general}</FormAlert> : null}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField
          label="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setErrors((x) => ({ ...x, username: undefined }));
          }}
          error={errors.username}
          autoComplete="username"
          autoFocus
        />
        <div>
          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((x) => ({ ...x, password: undefined }));
            }}
            error={errors.password}
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Sending code…' : 'Continue'}
        </Button>
      </form>
    </AuthLayout>
  );
}

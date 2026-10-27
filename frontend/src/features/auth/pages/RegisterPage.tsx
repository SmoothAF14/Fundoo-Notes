import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { requestRegisterOtp } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { FormAlert } from '../components/FormAlert';
import { type FieldErrors, splitApiError } from '../apiErrors';
import { FormField } from '../components/FormField';
import { PasswordField } from '../components/PasswordField';
import { saveOtpSession } from '../otpStorage';

const FIELDS = ['username', 'email', 'phone_number', 'password'] as const;
type Field = (typeof FIELDS)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: Record<Field, string>): FieldErrors<Field> {
  const e: FieldErrors<Field> = {};
  if (!v.username.trim()) e.username = 'Choose a username.';
  else if (v.username.trim().length > 150) e.username = 'Keep it under 150 characters.';
  if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (v.phone_number && v.phone_number.length !== 10) e.phone_number = 'Phone number must be exactly 10 digits.';
  if (v.password.length < 8) e.password = 'Use at least 8 characters.';
  return e;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<Field, string>>({ username: '', email: '', phone_number: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: Field, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };
  // Re-check a field once the user leaves it, but only if it already has content.
  const blur = (field: Field) => values[field] && setErrors((x) => ({ ...x, [field]: validate(values)[field] }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate(values);
    setErrors(next);
    setGeneral(null);
    if (Object.keys(next).length) return;

    setLoading(true);
    const email = values.email.trim();
    try {
      const res = await requestRegisterOtp({
        username: values.username.trim(),
        email,
        password: values.password,
        phone_number: values.phone_number || null,
      });
      saveOtpSession('register', email, Date.now() + res.otp_expires_in_seconds * 1000);
      navigate(`/auth/register/verify?e=${encodeURIComponent(email)}`);
    } catch (err) {
      const split = splitApiError(err, FIELDS);
      setErrors(split.fields);
      setGeneral(split.general);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Create your account"
      title="Start keeping."
      subtitle="It takes under a minute. We’ll verify your email with a one-time code."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {general ? <FormAlert>{general}</FormAlert> : null}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField
          label="Username"
          value={values.username}
          onChange={(e) => set('username', e.target.value)}
          onBlur={() => blur('username')}
          error={errors.username}
          autoComplete="username"
          autoFocus
        />
        <FormField
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          onBlur={() => blur('email')}
          error={errors.email}
          autoComplete="email"
        />
        <FormField
          label="Phone (optional)"
          value={values.phone_number}
          onChange={(e) => set('phone_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
          onBlur={() => blur('phone_number')}
          error={errors.phone_number}
          hint="10 digits, numbers only."
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
        />
        <PasswordField
          label="Password"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          onBlur={() => blur('password')}
          error={errors.password}
          hint="At least 8 characters. Avoid common or all-number passwords."
          autoComplete="new-password"
        />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Sending code…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}

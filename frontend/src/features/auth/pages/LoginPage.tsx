import React, { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '../../../shared/api/ApiError';
import { requestLoginOtp } from '../api';
import { saveOtpSession } from '../otpStorage';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

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
        const expiresAtMs = Date.now() + res.otp_expires_in_seconds * 1000;
        saveOtpSession('login', username, expiresAtMs);
        navigate(`/auth/login/verify?u=${encodeURIComponent(username)}`, { replace: true, state: { from: (location.state as any)?.from } });
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Something went wrong');
        }
      } finally {
        setLoading(false);
      }
    },
    [username, password, navigate, location.state]
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="px-4 py-3">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-200 flex items-center justify-center border border-amber-300">
                <span className="text-sm font-semibold text-slate-900">FN</span>
              </div>
              <div className="leading-tight">
                <div className="text-lg font-semibold">Fundoo Notes</div>
                <div className="text-xs text-slate-500">keep-style notes</div>
              </div>
            </div>
            <div className="text-sm">
              <Link className="rounded-full px-4 py-2 font-semibold bg-amber-200 hover:bg-amber-300 transition border border-amber-300" to="/register">
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 pb-10">
        <div className="mx-auto max-w-6xl pt-10">
          <section className="max-w-md mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h1 className="text-2xl font-semibold">Login</h1>
              <p className="text-sm text-slate-600 mt-1">Enter username + password to receive an OTP.</p>

              {error ? (
                <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-white border border-rose-200 shadow-sm">
                  <span className="font-semibold text-rose-700">Error:</span> <span className="text-slate-800">{error}</span>
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Username</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full px-5 py-2 font-semibold bg-amber-200 hover:bg-amber-300 transition border border-amber-300 disabled:opacity-60"
                >
                  {loading ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </form>

              <div className="mt-5 text-sm text-slate-600">
                New here? <Link className="font-medium text-slate-900 hover:underline" to="/register">Create an account</Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/useAuth';
import { ApiError } from '../../../shared/api/ApiError';
import { OtpTimer, isExpired } from '../components/OtpTimer';
import { verifyLoginOtp } from '../api';
import { clearOtpSession, loadOtpSession } from '../otpStorage';

export function LoginOtpVerifyPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [params] = useSearchParams();

  const username = (params.get('u') || '').trim();
  const session = useMemo(() => (username ? loadOtpSession('login', username) : null), [username]);

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const expired = !session || isExpired(session.expiresAtMs);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username) return;
      setError(null);
      setLoading(true);
      try {
        const res = await verifyLoginOtp({ username, otp });
        clearOtpSession('login', username);
        setAuth(res);
        navigate('/app/notes', { replace: true });
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
    [username, otp, setAuth, navigate]
  );

  if (!username) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 pt-10">
        <div className="mx-auto max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Login OTP Verification</h1>
          <p className="mt-2 text-sm text-slate-600">Missing username. Please start again.</p>
          <Link className="inline-block mt-4 text-sm font-medium text-slate-900 hover:underline" to="/login">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="px-4 pb-10">
        <div className="mx-auto max-w-6xl pt-10">
          <section className="max-w-md mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h1 className="text-2xl font-semibold">Login OTP Verification</h1>
              <p className="text-sm text-slate-600 mt-1">
                OTP valid for: {session ? <OtpTimer expiresAtMs={session.expiresAtMs} /> : <span className="font-semibold">--:--</span>}
              </p>

              {error ? (
                <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-white border border-rose-200 shadow-sm">
                  <span className="font-semibold text-rose-700">Error:</span> <span className="text-slate-800">{error}</span>
                </div>
              ) : null}

              {expired ? (
                <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-white border border-amber-200 shadow-sm">
                  <span className="font-semibold text-slate-700">Expired:</span>{' '}
                  <span className="text-slate-800">OTP expired. Please request a new OTP.</span>
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">OTP</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || expired}
                  className="w-full rounded-full px-5 py-2 font-semibold bg-amber-200 hover:bg-amber-300 transition border border-amber-300 disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Verify'}
                </button>

                <div className="text-sm text-slate-600">
                  <Link className="hover:underline" to="/login">
                    Back
                  </Link>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

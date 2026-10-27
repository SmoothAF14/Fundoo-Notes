import { apiRequest } from '@/shared/api/http';
import type { AuthUser } from '@/shared/types';

type OtpRequestResponse = {
  detail: string;
  otp_expires_in_seconds: number;
};

function post<T>(path: string, payload: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: JSON.stringify(payload) });
}

export const requestRegisterOtp = (payload: { username: string; email: string; password: string; phone_number?: string | null }) =>
  post<OtpRequestResponse>('/api/auth/register/request-otp/', payload);

export const verifyRegisterOtp = (payload: { email: string; otp: string }) =>
  post<AuthUser>('/api/auth/register/verify-otp/', payload);

export const requestLoginOtp = (payload: { username: string; password: string }) =>
  post<OtpRequestResponse>('/api/auth/login/request-otp/', payload);

export const verifyLoginOtp = (payload: { username: string; otp: string }) =>
  post<AuthUser>('/api/auth/login/verify-otp/', payload);

export const requestPasswordResetOtp = (payload: { email: string }) =>
  post<OtpRequestResponse>('/api/auth/password/request-otp/', payload);

export const resetPassword = (payload: { email: string; otp: string; new_password: string }) =>
  post<{ detail: string }>('/api/auth/password/reset/', payload);

export const logout = () => apiRequest('/api/auth/logout/', { method: 'POST' });

/** Confirms the session cookie is still valid and returns the current profile. */
export const me = () => apiRequest<AuthUser>('/api/auth/me/', { method: 'GET' });

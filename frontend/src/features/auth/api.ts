import { apiRequest } from '../../shared/api/http';
import type { AuthTokenResponse } from '../../shared/types';

export type OtpRequestResponse = {
  detail: string;
  otp_expires_in_seconds: number;
};

export async function requestRegisterOtp(payload: {
  username: string;
  email: string;
  password: string;
  phone_number?: string | null;
}): Promise<OtpRequestResponse> {
  return apiRequest('/api/auth/register/request-otp/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyRegisterOtp(payload: {
  email: string;
  otp: string;
}): Promise<AuthTokenResponse> {
  return apiRequest('/api/auth/register/verify-otp/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestLoginOtp(payload: {
  username: string;
  password: string;
}): Promise<OtpRequestResponse> {
  return apiRequest('/api/auth/login/request-otp/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyLoginOtp(payload: {
  username: string;
  otp: string;
}): Promise<AuthTokenResponse> {
  return apiRequest('/api/auth/login/verify-otp/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

import { ApiError } from './ApiError';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

function buildRequestUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE_URL) return path;

  // In development we rely on CRA's `proxy` to avoid CORS.
  if (process.env.NODE_ENV === 'development') return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isJsonResponse(contentType: string | null): boolean {
  return !!contentType && contentType.toLowerCase().includes('application/json');
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;

  const mergedHeaders: HeadersInit = {
    ...(headers ?? {}),
  };

  if (!(mergedHeaders as Record<string, string>)['Content-Type'] && rest.body) {
    (mergedHeaders as Record<string, string>)['Content-Type'] = 'application/json';
  }

  if (token) {
    (mergedHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(buildRequestUrl(path), {
    ...rest,
    headers: mergedHeaders,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type');
  const body: Json = isJsonResponse(contentType) ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof body === 'string'
        ? body
        : (body as any)?.detail || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

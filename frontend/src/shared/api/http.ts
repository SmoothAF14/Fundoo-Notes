import { ApiError } from './ApiError';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

let onUnauthorized: (() => void) | null = null;

/** Called when a request comes back 401 (the session cookie expired or was revoked). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function buildRequestUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  // In development Vite proxies API paths to Django, so requests stay same-origin.
  if (!API_BASE_URL || import.meta.env.DEV) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function humanize(field: string): string {
  const words = field.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** DRF errors: {"detail": "..."} or field errors like {"username": "..."} / {"email": ["..."]}. */
function errorMessageFrom(body: Json): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  for (const [key, value] of Object.entries(body)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first !== 'string' || !first) continue;
    // Generic DRF messages don't say which field they are about.
    const generic = /^(This field|Ensure this field|This value)/i.test(first);
    return generic && key !== 'detail' && key !== 'non_field_errors' ? `${humanize(key)}: ${first}` : first;
  }
  return null;
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/**
 * The session is an httpOnly cookie the browser sends for us; writes echo Django's CSRF cookie
 * in X-CSRFToken so another site can't make requests on the user's behalf.
 */
export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers, ...rest } = options;
  const mergedHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  if (rest.body && !mergedHeaders['Content-Type']) mergedHeaders['Content-Type'] = 'application/json';
  if (!SAFE_METHODS.includes((rest.method || 'GET').toUpperCase())) {
    const csrf = readCookie('csrftoken');
    if (csrf) mergedHeaders['X-CSRFToken'] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(buildRequestUrl(path), { credentials: 'include', ...rest, headers: mergedHeaders });
  } catch {
    throw new ApiError("Can't reach the server. Check that it's running and try again.", 0, null);
  }

  if (res.status === 204) return undefined as T;

  const isJson = (res.headers.get('content-type') || '').toLowerCase().includes('application/json');
  const body: Json = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      onUnauthorized?.();
      throw new ApiError('Your session has expired. Please sign in again.', 401, body);
    }
    // Non-JSON error bodies (e.g. Django's HTML debug page) are never shown to the user.
    const fallback = res.status >= 500 ? `Server error (${res.status}). Please try again.` : `Request failed (${res.status})`;
    throw new ApiError(errorMessageFrom(body) || fallback, res.status, body);
  }

  return body as T;
}

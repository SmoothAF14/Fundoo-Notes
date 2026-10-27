import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './ApiError';
import { apiRequest, setUnauthorizedHandler } from './http';

function stubFetch(status: number, contentType: string, body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => contentType },
      json: async () => JSON.parse(body),
      text: async () => body,
    }))
  );
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('expected request to fail');
}

afterEach(() => setUnauthorizedHandler(null));

describe('apiRequest errors', () => {
  it('uses the API "detail" message for JSON errors', async () => {
    stubFetch(400, 'application/json', JSON.stringify({ detail: 'Invalid OTP' }));
    const err = await errorOf(apiRequest('/x'));
    expect(err.message).toBe('Invalid OTP');
    expect(err.status).toBe(400);
  });

  it('shows a field validation message returned as a string (not "Request failed (400)")', async () => {
    stubFetch(400, 'application/json', JSON.stringify({ username: 'Username already exists' }));
    expect((await errorOf(apiRequest('/x'))).message).toBe('Username already exists');
  });

  it('shows the first field validation message returned as a list', async () => {
    stubFetch(400, 'application/json', JSON.stringify({ email: ['Enter a valid email address.'] }));
    expect((await errorOf(apiRequest('/x'))).message).toBe('Enter a valid email address.');
  });

  it('names the field for generic DRF messages', async () => {
    stubFetch(400, 'application/json', JSON.stringify({ title: ['This field may not be blank.'] }));
    expect((await errorOf(apiRequest('/x'))).message).toBe('Title: This field may not be blank.');
  });

  it('never surfaces a raw HTML error page as the message', async () => {
    stubFetch(500, 'text/html; charset=utf-8', '<!DOCTYPE html><html><title>AttributeError</title></html>');
    const err = await errorOf(apiRequest('/x'));
    expect(err.message).not.toMatch(/<html|<!DOCTYPE/i);
    expect(err.message).toMatch(/server error/i);
  });

  it('explains when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    const err = await errorOf(apiRequest('/x'));
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/can't reach the server/i);
  });

  it('calls the session-expired handler on 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubFetch(401, 'application/json', JSON.stringify({ detail: 'Authentication credentials were not provided.' }));
    expect((await errorOf(apiRequest('/x'))).message).toMatch(/session has expired/i);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('sends the session cookie and echoes the CSRF cookie on writes only', async () => {
    document.cookie = 'csrftoken=abc123';
    stubFetch(200, 'application/json', '{}');
    await apiRequest('/x', { method: 'POST', body: '{}' });
    await apiRequest('/y');
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1]).toMatchObject({ credentials: 'include', headers: { 'X-CSRFToken': 'abc123', 'Content-Type': 'application/json' } });
    expect(calls[1][1].headers).not.toHaveProperty('X-CSRFToken');
    expect(calls[1][1].headers).not.toHaveProperty('Authorization');
  });
});

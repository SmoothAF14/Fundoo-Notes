import { ApiError } from './ApiError';
import { apiRequest } from './http';

function stubFetch(status: number, contentType: string, body: string) {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => JSON.parse(body),
    text: async () => body,
  })) as unknown as typeof fetch;
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('expected request to fail');
}

describe('apiRequest errors', () => {
  it('uses the API "detail" message for JSON errors', async () => {
    stubFetch(400, 'application/json', JSON.stringify({ detail: 'Invalid OTP' }));
    const err = await errorOf(apiRequest('/x'));
    expect(err.message).toBe('Invalid OTP');
    expect(err.status).toBe(400);
  });

  it('shows a field validation message returned as a string', async () => {
    stubFetch(400, 'application/json', JSON.stringify({ username: 'Username already exists' }));
    const err = await errorOf(apiRequest('/x'));
    expect(err.message).toBe('Username already exists');
  });

  it('shows the first field validation message returned as a list', async () => {
    stubFetch(400, 'application/json', JSON.stringify({ email: ['Enter a valid email address.'] }));
    const err = await errorOf(apiRequest('/x'));
    expect(err.message).toBe('Enter a valid email address.');
  });

  it('never surfaces a raw HTML error page as the message', async () => {
    stubFetch(500, 'text/html; charset=utf-8', '<!DOCTYPE html><html><title>AttributeError</title></html>');
    const err = await errorOf(apiRequest('/x'));
    expect(err.message).not.toMatch(/<html|<!DOCTYPE/i);
    expect(err.message).toMatch(/server error/i);
    expect(err.status).toBe(500);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chaindoc } from '../chaindoc';
import { HttpClient } from '../client';

const json = (status: number, body: unknown = { message: 'x' }) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const netError = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error(code), { code }) });
const client = () => new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 2 } });

describe('writes are not retried blind', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a POST on 503 is sent once and the error surfaces', async () => {
    const f = vi.fn().mockResolvedValue(json(503));
    vi.stubGlobal('fetch', f);
    await expect(client().post('/api/v1/contracts/c/invoices', { a: 1 })).rejects.toMatchObject({ statusCode: 503 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it.each(['PATCH', 'PUT', 'DELETE'] as const)('a %s on 503 is sent once', async (method) => {
    const f = vi.fn().mockResolvedValue(json(503));
    vi.stubGlobal('fetch', f);
    await expect(client().request('/api/v1/x', { method })).rejects.toMatchObject({ statusCode: 503 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it.each(['ECONNRESET', 'ETIMEDOUT'])('a POST that fails with %s (it may have arrived) is not repeated', async (code) => {
    const f = vi.fn().mockRejectedValue(netError(code));
    vi.stubGlobal('fetch', f);
    await expect(client().post('/api/v1/x', {})).rejects.toBeDefined();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('a POST that times out (abort) is not repeated', async () => {
    const f = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    vi.stubGlobal('fetch', f);
    await expect(client().post('/api/v1/x', {})).rejects.toBeDefined();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('a POST on ECONNREFUSED (never reached the server) is retried', async () => {
    const f = vi.fn().mockRejectedValueOnce(netError('ECONNREFUSED')).mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal('fetch', f);
    await expect(client().post('/api/v1/x', {})).resolves.toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('a POST on 429 is retried', async () => {
    const f = vi.fn().mockResolvedValueOnce(json(429)).mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal('fetch', f);
    await expect(client().post('/api/v1/x', {})).resolves.toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('a GET on 503 is retried', async () => {
    const f = vi.fn().mockResolvedValueOnce(json(503)).mockResolvedValueOnce(json(200, { ok: true }));
    vi.stubGlobal('fetch', f);
    await expect(client().get('/api/v1/x')).resolves.toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('noRetry still wins, even for a 429', async () => {
    const f = vi.fn().mockResolvedValue(json(429));
    vi.stubGlobal('fetch', f);
    await expect(client().request('/api/v1/x', { method: 'GET', noRetry: true })).rejects.toBeDefined();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('a document create on 503 is retried with the same idempotencyKey', async () => {
    const f = vi.fn().mockResolvedValueOnce(json(503)).mockResolvedValueOnce(json(201, { success: true, documentId: 'd1' }));
    vi.stubGlobal('fetch', f);
    const chaindoc = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 2 } });
    await chaindoc.documents.create({ name: 'n', status: 'draft', content: { version: 2, mode: 'document', doc: { type: 'doc' } } });
    expect(f).toHaveBeenCalledTimes(2);
    const keys = f.mock.calls.map((c) => JSON.parse(String((c[1] as RequestInit).body)).idempotencyKey);
    expect(keys[0]).toEqual(expect.any(String));
    expect(keys[1]).toBe(keys[0]);
  });

  it('a caller-given idempotencyKey is kept', async () => {
    const f = vi.fn().mockResolvedValue(json(202, { success: true, conversion: { id: 'c' } }));
    vi.stubGlobal('fetch', f);
    const chaindoc = new Chaindoc({ secretKey: 'sk_test' });
    await chaindoc.documents.createFromStorage({ storageFileId: 's', name: 'n', idempotencyKey: 'mine' });
    expect(JSON.parse(String((f.mock.calls[0]?.[1] as RequestInit).body)).idempotencyKey).toBe('mine');
  });
});

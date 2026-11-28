import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chaindoc } from '../chaindoc';
import { HttpClient } from '../client';

/**
 * 3.0.0 — `contracts.delete` answered `400 Body cannot be empty when content-type is set to
 * 'application/json'`: the client declared a JSON body on every request, and a body-less DELETE is refused by the API's
 * JSON parser before any route runs. Every `delete*` method of the SDK was affected. Content-Type is said only when a
 * JSON body is sent.
 */
const ok = () => new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'content-type': 'application/json' } });
const headersOf = (f: ReturnType<typeof vi.fn>, call = 0) => (f.mock.calls[call]![1] as RequestInit).headers as Record<string, string>;
const contentTypeOf = (f: ReturnType<typeof vi.fn>, call = 0) =>
  Object.entries(headersOf(f, call)).find(([name]) => name.toLowerCase() === 'content-type')?.[1];

describe('the client says Content-Type only when it sends a JSON body', () => {
  afterEach(() => vi.unstubAllGlobals());

  const sdk = () => new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 0 } });

  it.each([
    ['contracts.delete', (c: Chaindoc) => c.contracts.delete('c1')],
    ['templates.delete', (c: Chaindoc) => c.templates.delete('t1')],
    ['contracts.cancelSigningRequest', (c: Chaindoc) => c.contracts.cancelSigningRequest('c1', 'r1')],
    ['contracts.paymentTerms.delete', (c: Chaindoc) => c.contracts.paymentTerms.delete('c1', 'p1')],
  ])('%s sends a DELETE with no body and no Content-Type', async (_name, act) => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);

    await act(sdk());

    expect((f.mock.calls[0]![1] as RequestInit).method).toBe('DELETE');
    expect((f.mock.calls[0]![1] as RequestInit).body).toBeUndefined();
    expect(contentTypeOf(f)).toBeUndefined();
    expect(headersOf(f).Authorization).toBe('Bearer sk_test');
  });

  it('a GET declares no body either', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);

    await sdk().contracts.get('c1');

    expect(contentTypeOf(f)).toBeUndefined();
  });

  it('a POST with a body says application/json and sends it', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);

    await new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 } }).post('/api/v1/x', { a: 1 });

    expect(contentTypeOf(f)).toBe('application/json');
    expect((f.mock.calls[0]![1] as RequestInit).body).toBe('{"a":1}');
  });

  it('a header the integrator configured still wins', async () => {
    const f = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', f);

    await new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 }, headers: { 'X-Trace': 't1' } }).post('/api/v1/x', { a: 1 });

    expect(headersOf(f)['X-Trace']).toBe('t1');
  });
});

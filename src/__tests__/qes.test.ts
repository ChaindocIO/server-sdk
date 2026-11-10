import { describe, expect, it } from 'vitest';
import { Signatures } from '../modules/signatures';
import { fakeClient } from './helpers';

const CERT = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';

describe('QES promise > prepare > finalize', () => {
  it('walks the three phases without automatic retry, carrying fieldValues in the promise', async () => {
    const f = fakeClient({});
    const { qes } = new Signatures(f.client);
    await qes.promise('req-1', { fieldValues: { 'place-1': 'Anna', 'place-2': true }, signatureHash: 'h1' });
    await qes.prepare('req-1', { signerCertPem: CERT, chainPem: CERT });
    await qes.finalize('req-1', { sessionId: 's-1', signatureValueB64: 'c2ln' });
    expect(f.post.mock.calls.map((c) => c[0])).toEqual([
      '/api/v1/signatures/qes/req-1/promise',
      '/api/v1/signatures/qes/req-1/prepare',
      '/api/v1/signatures/qes/req-1/finalize',
    ]);
    expect(f.post.mock.calls[0]?.[1]).toEqual({ fieldValues: { 'place-1': 'Anna', 'place-2': true }, signatureHash: 'h1' });
    for (const call of f.post.mock.calls) expect(call[2]).toEqual({ noRetry: true });
  });

  it('refuses private key material before anything is sent (security)', async () => {
    const f = fakeClient({});
    const { qes } = new Signatures(f.client);
    const key = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
    await expect(qes.prepare('req-1', { signerCertPem: key })).rejects.toThrow('private key material');
    await expect(qes.prepare('req-1', { signerCertPem: CERT, chainPem: key })).rejects.toThrow('private key material');
    await expect(qes.prepare('req-1', { signerCertPem: 'not a pem' })).rejects.toThrow('PEM certificate');
    expect(f.post).not.toHaveBeenCalled();
  });
});

describe('QES refusal over the wire', () => {
  it('a contract counterparty is refused with its key kept on the error', async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'needs own session', errorKey: 'CONTRAGENT_QES_REQUIRES_SIGNER_SESSION' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const { Chaindoc } = await import('../chaindoc');
    const chaindoc = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await chaindoc.signatures.qes.promise('req-1').catch((e: unknown) => e);
    expect(error).toMatchObject({ statusCode: 403, errorKey: 'CONTRAGENT_QES_REQUIRES_SIGNER_SESSION' });
    vi.unstubAllGlobals();
  });
});

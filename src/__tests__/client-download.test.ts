import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChaindocError, HttpClient } from '../client';

function createClient() {
  return new HttpClient({
    secretKey: 'sk_test',
    baseUrl: 'https://api.test',
    retry: {
      maxRetries: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
    },
  });
}

describe('HttpClient.download', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns binary data and parses RFC 5987 filenames', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': "attachment; filename=\"download.pdf\"; filename*=UTF-8''signed%20contract.pdf",
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createClient().download('/file');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/file',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(Array.from(new Uint8Array(result.data))).toEqual([1, 2, 3]);
    expect(result.contentType).toBe('application/pdf');
    expect(result.fileName).toBe('signed contract.pdf');
  });

  it('retries retryable HTTP errors before returning the binary response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'temporary failure' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'application/octet-stream' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createClient().download('/file');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new TextDecoder().decode(result.data)).toBe('ok');
  });

  it('supports POST binary endpoints with a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([4, 5, 6]), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const body = { variables: { client_name: 'Acme' } };
    await createClient().download('/templates/tpl-uuid/preview-pdf', {
      method: 'POST',
      body,
      headers: { 'x-test': 'yes' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/templates/tpl-uuid/preview-pdf',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test',
          'Content-Type': 'application/json',
          'x-test': 'yes',
        }),
      }),
    );
  });

  it('does not retry non-retryable HTTP errors and preserves JSON error details', async () => {
    const errorBody = { message: 'missing file' };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(createClient().download('/missing')).rejects.toMatchObject({
      name: 'ChaindocError',
      message: 'missing file',
      statusCode: 404,
      response: errorBody,
    } satisfies Partial<ChaindocError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

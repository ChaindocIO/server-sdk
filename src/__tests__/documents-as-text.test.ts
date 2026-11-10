import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chaindoc } from '../chaindoc';
import { ChaindocConversionFailedError, ChaindocConversionTimeoutError, ChaindocLimitError } from '../errors';
import { Conversions } from '../modules/conversions';
import { Documents } from '../modules/documents';
import { fakeClient } from './helpers';

const converting = (id = 'c1') => ({ success: true, conversion: { id, status: 'converting', kind: 'new', documentId: null, versionId: null } });
const ready = (id = 'c1') => ({ success: true, conversion: { id, status: 'ready', kind: 'new', documentId: 'd1', versionId: 'v1' } });
const failed = (id = 'c1') => ({ success: true, conversion: { id, status: 'failed', kind: 'new', documentId: null, versionId: null, failure: { code: 'DOCUMENT_FILE_REFUSED' } } });

describe('documents as text', () => {
  it('getContent reads the current version, or the named one', async () => {
    const f = fakeClient({});
    const documents = new Documents(f.client);
    await documents.getContent('doc-1');
    await documents.getContent('doc-1', { versionId: 'ver 2' });
    expect(f.get).toHaveBeenNthCalledWith(1, '/api/v1/documents/doc-1/content');
    expect(f.get).toHaveBeenNthCalledWith(2, '/api/v1/documents/doc-1/content?versionId=ver%202');
  });

  it('convert posts the conversion route, addSignatureBlock the roles', async () => {
    const f = fakeClient({});
    const documents = new Documents(f.client);
    await documents.convert('doc-1', { idempotencyKey: 'k1' });
    await documents.addSignatureBlock('doc-1', { roles: [{ key: 'client', name: 'Client' }], baseVersionId: 'v1' });
    expect(f.post).toHaveBeenNthCalledWith(1, '/api/v1/documents/doc-1/conversion', { idempotencyKey: 'k1' }, { idempotent: true });
    expect(f.post).toHaveBeenNthCalledWith(2, '/api/v1/documents/doc-1/signature-block', {
      roles: [{ key: 'client', name: 'Client' }],
      baseVersionId: 'v1',
      idempotencyKey: expect.any(String),
    }, { idempotent: true });
  });
});

describe('conversions.wait', () => {
  it('polls with backoff until ready and returns the made document and version', async () => {
    const f = fakeClient();
    f.get.mockResolvedValueOnce(converting()).mockResolvedValueOnce(converting()).mockResolvedValueOnce(ready());
    const polls: string[] = [];
    const result = await new Conversions(f.client).wait('c1', {
      intervalMs: 1,
      onPoll: (c) => polls.push(c.status),
    });
    expect(polls).toEqual(['converting', 'converting', 'ready']);
    expect(result).toMatchObject({ status: 'ready', documentId: 'd1', versionId: 'v1' });
    expect(f.get).toHaveBeenCalledWith('/api/v1/documents/conversions/c1');
  });

  it('throws a typed error with the failure code when the conversion failed', async () => {
    const f = fakeClient();
    f.get.mockResolvedValueOnce(converting()).mockResolvedValueOnce(failed());
    const error = await new Conversions(f.client).wait('c1', { intervalMs: 1 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocConversionFailedError);
    expect(error).toMatchObject({ conversionId: 'c1', failureCode: 'DOCUMENT_FILE_REFUSED', errorKey: 'DOCUMENT_CONVERSION_FAILED' });
  });

  it('throws a timeout error naming the conversion when it never ends', async () => {
    const f = fakeClient(converting());
    const error = await new Conversions(f.client).wait('c1', { intervalMs: 1, timeoutMs: 20 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocConversionTimeoutError);
    expect((error as ChaindocConversionTimeoutError).conversionId).toBe('c1');
  });

  it('refuses a ready conversion that names no document instead of guessing', async () => {
    const f = fakeClient({ success: true, conversion: { id: 'c1', status: 'ready', kind: 'new', documentId: null, versionId: null } });
    await expect(new Conversions(f.client).wait('c1')).rejects.toBeInstanceOf(ChaindocConversionFailedError);
  });
});

describe('file entrance refusals over the wire', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a full Storage is a typed limit error before anything is converted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Storage is full', errorKey: 'STORAGE_LIMIT_REACHED' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const chaindoc = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await chaindoc.documents
      .createFromStorage({ storageFileId: 'sf-1', name: 'Doc' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocLimitError);
    expect(error).toMatchObject({ errorKey: 'STORAGE_LIMIT_REACHED', statusCode: 400 });
  });
});

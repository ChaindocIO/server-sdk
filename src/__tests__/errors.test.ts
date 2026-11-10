import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChaindocError,
  ChaindocLimitError,
  ChaindocNotYourTurnError,
  ChaindocPlanError,
  ChaindocReadOnlyError,
  ChaindocSigningSetupError,
  ChaindocTemplateError,
  ChaindocDocumentFileError,
  hasErrorKey,
} from '../errors';
import { HttpClient } from '../client';

function answerWith(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
    ),
  );
}

describe('typed errors by errorKey', () => {
  afterEach(() => vi.unstubAllGlobals());

  const cases: Array<[string, number, new (...a: never[]) => ChaindocError]> = [
    ['INTEGRATIONS_NOT_IN_PLAN', 403, ChaindocPlanError],
    ['ACCOUNT_READ_ONLY', 403, ChaindocReadOnlyError],
    ['STORAGE_LIMIT_REACHED', 400, ChaindocLimitError],
    ['AI_LIMIT_REACHED', 400, ChaindocLimitError],
    ['SIGNING_FIELDS_EMPTY', 422, ChaindocSigningSetupError],
    ['SETUP_FIELDS_STAND_IN_THE_TEXT', 422, ChaindocSigningSetupError],
    ['DOCUMENT_FILE_CONVERTS', 422, ChaindocDocumentFileError],
    ['DOCUMENT_FILE_VIA_STORAGE', 422, ChaindocDocumentFileError],
    ['DOCUMENT_CONVERSION_PENDING', 409, ChaindocDocumentFileError],
    ['DOCUMENT_CONVERSION_FAILED', 422, ChaindocDocumentFileError],
    ['TEMPLATE_RETIRED', 410, ChaindocTemplateError],
    ['TEMPLATE_WORKING_COPY_MOVED', 409, ChaindocTemplateError],
    ['NOT_YOUR_TURN', 409, ChaindocNotYourTurnError],
  ];

  it.each(cases)('%s becomes its own class and keeps the key', async (key, status, Klass) => {
    answerWith(status, { message: 'refused', errorKey: key });
    const client = new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await client.get('/api/v1/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Klass);
    expect(error).toBeInstanceOf(ChaindocError);
    expect(hasErrorKey(error, key)).toBe(true);
    expect((error as ChaindocError).statusCode).toBe(status);
  });

  it('an unknown key is a plain ChaindocError that still carries the key', async () => {
    answerWith(400, { message: 'nope', errorKey: 'SOMETHING_NEW' });
    const client = new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await client.get('/api/v1/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocError);
    expect((error as ChaindocError).errorKey).toBe('SOMETHING_NEW');
    expect(hasErrorKey(error, 'ACCOUNT_READ_ONLY')).toBe(false);
  });

  it('an answer with no key has errorKey undefined', async () => {
    answerWith(404, { message: 'missing' });
    const client = new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await client.get('/api/v1/x').catch((e: unknown) => e);
    expect((error as ChaindocError).errorKey).toBeUndefined();
  });
});

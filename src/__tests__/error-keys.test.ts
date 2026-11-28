import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../client';
import { ChaindocError, ChaindocLimitError, ERROR_KEYS, hasErrorKey, type ChaindocRefusalBody } from '../errors';

const JSON_TYPE = { 'content-type': 'application/json' };
const SNAPSHOT_PATH = path.resolve(__dirname, '../../references/public-api.snapshot.json');

/** Words of the snapshot's descriptions that look like keys and are not refusals. */
const NOT_KEYS: Record<string, string> = {
  ONE_SIDE: 'a termination approval mode (`contracts.terminate`), not a refusal',
  MUTUAL_APPROVAL: 'a termination approval mode (`contracts.terminate`), not a refusal',
};

/** The routes an SDK user calls: the public API, plus `POST /embedded/sessions`; the signer's window and processes are not this list's. */
function wrapped(route: string): boolean {
  if (route.startsWith('/api/v1/pipedrive/') || route.startsWith('/api/v1/processes')) return false;
  if (route.startsWith('/api/v1/embedded/')) return route === '/api/v1/embedded/sessions';
  return true;
}

function keysNamedBySnapshot(): Map<string, string> {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as {
    paths: Record<string, Record<string, { description?: string; responses?: Record<string, { description?: string }> }>>;
  };
  const named = new Map<string, string>();
  for (const [route, methods] of Object.entries(snapshot.paths)) {
    if (!wrapped(route)) continue;
    for (const [method, op] of Object.entries(methods)) {
      const words = [op.description ?? '', ...Object.values(op.responses ?? {}).map((r) => r.description ?? '')].join(' ');
      for (const key of words.match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/g) ?? []) {
        if (!named.has(key)) named.set(key, `${method.toUpperCase()} ${route}`);
      }
    }
  }
  return named;
}

describe('ERROR_KEYS', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('each key is its own name, once', () => {
    for (const [name, value] of Object.entries(ERROR_KEYS)) expect(value).toBe(name);
    expect(new Set(Object.values(ERROR_KEYS)).size).toBe(Object.keys(ERROR_KEYS).length);
  });

  it('knows every errorKey the published contract names on a route the SDK wraps', () => {
    const known = new Set<string>(Object.values(ERROR_KEYS));
    const missing = [...keysNamedBySnapshot()]
      .filter(([key]) => !known.has(key) && !(key in NOT_KEYS))
      .map(([key, where]) => `${key} (${where})`);
    expect(missing).toEqual([]);
  });

  it('names the refusals pieces 04–09 added on the integrator path', () => {
    const known = new Set<string>(Object.values(ERROR_KEYS));
    for (const key of [
      'VALIDATION_FAILED',
      'DOCUMENT_NOT_A_FILE',
      'DOCUMENT_EDIT_REFUSED',
      'KYC_NOT_VERIFIED',
      'CONTRACT_NOT_A_DRAFT',
      'SIGNING_REQUEST_HAS_A_SIGNATURE',
      'SIGNING_REQUEST_NOT_PENDING',
      'SIGNING_REQUEST_EXPIRED',
      'SIGNATURE_REQUEST_NOT_PENDING',
      'SIGNER_ALREADY_ACTED',
      'KEY_NAMES_NO_SIGNER',
      'BUSINESS_PROFILE_INCOMPLETE',
      'EMBEDDED_SIGNING_REQUEST_CLOSED',
      'EMBEDDED_CONTRACT_NOT_SIGNABLE',
    ]) {
      expect(known.has(key), key).toBe(true);
    }
  });

  it('does not name a refusal of sides on different methods: such a contract is sent and completes', () => {
    expect(Object.values(ERROR_KEYS)).not.toContain('SIGNING_LANES_MIXED_UNSUPPORTED');
  });

  it('names the qualified promise refusals as the server spells them', () => {
    const known = new Set<string>(Object.values(ERROR_KEYS));
    for (const key of [
      'request_not_pending',
      'delegated_auto_sign',
      'not_a_signer',
      'already_acted',
      'lane_taken_by_internal',
      'lane_not_qualified_on_contract',
      'promises_closed',
      'above_requirement_unsupported',
    ]) {
      expect(known.has(key), key).toBe(true);
    }
  });

  it('a lower-case promise refusal is read by its key like any other', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'closed', errorKey: 'promises_closed' }), { status: 400, headers: JSON_TYPE }),
      ),
    );
    const client = new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await client.post('/api/v1/signatures/qes/r/promise', {}).catch((e: unknown) => e);
    expect(hasErrorKey(error, ERROR_KEYS.promises_closed)).toBe(true);
  });

  it.each([
    'CONTRACTS_LIMIT_REACHED',
    'OPEN_SIGN_REQUESTS_LIMIT_REACHED',
    'SIGNATURE_CREDITS_EXHAUSTED',
    'KYC_CREDITS_EXHAUSTED',
    'DOCUMENT_SHARE_LIMIT_REACHED',
  ])('%s is a ChaindocLimitError', async (key) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'limit', errorKey: key }), { status: 400, headers: JSON_TYPE })),
    );
    const client = new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await client.post('/api/v1/x', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocLimitError);
    expect(hasErrorKey(error, key)).toBe(true);
  });

  it('a refusal keeps its facts readable as ChaindocRefusalBody (SETUP_BLOCKED, as dev answers it)', async () => {
    // The body dev gave `contracts.send` on a text without the sides' chips (a probe, 2026-11-26), trimmed to the facts.
    const body = {
      message: 'Something stands in the way of sending.',
      errorKey: 'SETUP_BLOCKED',
      blockers: [
        {
          kind: 'signature-field-missing',
          section: 'fields',
          subject: 'recipient-0',
          name: 'owner@example.com',
          subjects: ['recipient-0', 'recipient-1'],
          names: ['owner@example.com', 'signer@example.com'],
        },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 409, headers: JSON_TYPE })));
    const client = new HttpClient({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = (await client.post('/api/v1/contracts/c/send', {}).catch((e: unknown) => e)) as ChaindocError;
    expect(hasErrorKey(error, ERROR_KEYS.SETUP_BLOCKED)).toBe(true);
    const facts = error.response as ChaindocRefusalBody;
    expect(facts.blockers?.[0]?.kind).toBe('signature-field-missing');
  });
});

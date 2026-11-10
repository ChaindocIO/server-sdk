import { vi } from 'vitest';
import type { HttpClient } from '../client';

/** A recording stand-in for HttpClient: every verb is a mock that resolves to `result`. */
export function fakeClient(result: unknown = {}) {
  const fns = {
    get: vi.fn().mockResolvedValue(result),
    post: vi.fn().mockResolvedValue(result),
    put: vi.fn().mockResolvedValue(result),
    patch: vi.fn().mockResolvedValue(result),
    delete: vi.fn().mockResolvedValue(result),
    request: vi.fn().mockResolvedValue(result),
    download: vi.fn().mockResolvedValue({ data: new ArrayBuffer(0), contentType: 'application/pdf' }),
    uploadFiles: vi.fn().mockResolvedValue(result),
    sendChunk: vi.fn().mockResolvedValue(result),
    putBinary: vi.fn().mockResolvedValue(result),
  };
  return { client: fns as unknown as HttpClient, ...fns };
}

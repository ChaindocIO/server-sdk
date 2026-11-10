import { describe, expect, it } from 'vitest';
import { Documents } from '../modules/documents';
import { Invoices } from '../modules/invoices';
import { Signatures } from '../modules/signatures';
import { fakeClient } from './helpers';

describe('path ids are encoded', () => {
  const evil = '../../contracts/x?y=1#z';
  const enc = encodeURIComponent(evil);

  it('an id with ../ stays inside its own route', async () => {
    const f = fakeClient({});
    await new Documents(f.client).getContent(evil);
    await new Documents(f.client).convert(evil);
    await new Documents(f.client).addSignatureBlock(evil, { roles: [] });
    await new Signatures(f.client).resend(evil);
    await new Invoices(f.client).get('c', evil);

    expect(f.get).toHaveBeenNthCalledWith(1, `/api/v1/documents/${enc}/content`);
    expect(f.post).toHaveBeenNthCalledWith(1, `/api/v1/documents/${enc}/conversion`, {});
    expect(f.post).toHaveBeenNthCalledWith(2, `/api/v1/documents/${enc}/signature-block`, { roles: [] });
    expect(f.post.mock.calls[2]?.[0]).toBe(`/api/v1/signatures/requests/${enc}/resend`);
    expect(f.get).toHaveBeenNthCalledWith(2, `/api/v1/contracts/c/invoices/${enc}`);
    for (const call of [...f.get.mock.calls, ...f.post.mock.calls]) {
      // No raw slash, query or fragment from the id: the id is exactly one path segment.
      expect(String(call[0])).not.toMatch(/[?#]/);
      expect(String(call[0]).split('/').filter((p) => p === '..')).toEqual([]);
    }
  });
});

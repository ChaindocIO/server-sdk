import { describe, expect, it } from 'vitest';
import { Documents } from '../modules/documents';
import { Invoices } from '../modules/invoices';
import { Signatures } from '../modules/signatures';
import { fakeClient } from './helpers';

import { seg } from '../utils/path';
import { Processes } from '../modules/processes';
import { Conversions } from '../modules/conversions';

describe('seg refuses ids that could leave their route', () => {
  it.each(['', '.', '..'])('refuses %j before any request', async (id) => {
    const f = fakeClient({});
    expect(() => seg(id)).toThrow('non-empty identifier');
    await expect(new Documents(f.client).getContent(id)).rejects.toThrow('non-empty identifier');
    await expect(new Conversions(f.client).get(id)).rejects.toThrow('non-empty identifier');
    await expect(new Processes(f.client).getCase(id)).rejects.toThrow('non-empty identifier');
    expect(f.get).not.toHaveBeenCalled();
  });

  it('keeps a/b inside one segment and lets numeric and prefixed ids through', () => {
    expect(seg('a/b')).toBe('a%2Fb');
    expect(seg('12345')).toBe('12345');
    expect(seg('inv_abc-1')).toBe('inv_abc-1');
  });
});

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

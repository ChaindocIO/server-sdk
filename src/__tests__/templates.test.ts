import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chaindoc } from '../chaindoc';
import { ChaindocTemplateError } from '../errors';
import { Templates } from '../modules/templates';
import { fakeClient } from './helpers';

const template = { version: 2 as const, mode: 'template' as const, doc: { type: 'doc' } };

describe('Templates module', () => {
  it('has no preview methods (the routes are gone)', () => {
    const templates = new Templates(fakeClient().client) as unknown as Record<string, unknown>;
    expect(templates['previewPdf']).toBeUndefined();
    expect(templates['previewHtml']).toBeUndefined();
    expect(templates['previewUnsavedPdf']).toBeUndefined();
  });

  describe('runtime (documents, signature requests, contracts)', () => {
    it('createDocument posts values to the documents route', async () => {
      const f = fakeClient();
      await new Templates(f.client).createDocument('t-1', {
        documentName: 'Generated NDA',
        variables: { client_name: 'Acme' },
      });
      expect(f.post).toHaveBeenCalledWith('/api/v1/templates/t-1/documents', {
        documentName: 'Generated NDA',
        variables: { client_name: 'Acme' },
      });
    });

    it('sendForSigning fills slots by email and account, normalizing the address', async () => {
      const f = fakeClient();
      await new Templates(f.client).sendForSigning('t-1', {
        documentName: 'Generated NDA',
        variables: { client_name: 'Acme' },
        slotAssignments: [
          { signerKey: 'seller', email: ' Owner@Example.com ' },
          {
            signerKey: 'buyer',
            email: 'signer@example.com',
            account: { kind: 'workspace', workspaceId: 'ws-1' },
            signingMethod: 'embedded',
          },
        ],
        deadline: new Date('2026-04-30T00:00:00.000Z'),
      });
      const [url, body] = f.post.mock.calls[0] as [string, { slotAssignments: unknown[] }];
      expect(url).toBe('/api/v1/templates/t-1/signature-requests');
      expect(body.slotAssignments).toEqual([
        { signerKey: 'seller', email: 'owner@example.com' },
        { signerKey: 'buyer', email: 'signer@example.com', account: { kind: 'workspace', workspaceId: 'ws-1' }, signingMethod: 'embedded' },
      ]);
    });

    it('createContract sends the counterparty, contragentAccount and role slots', async () => {
      const f = fakeClient();
      await new Templates(f.client).createContract('t-1', {
        title: 'Generated MSA',
        variables: { company_name: 'Acme' },
        contragent: { email: 'Partner@Example.com', name: 'Partner Corp' },
        contragentAccount: { kind: 'personal' },
        slotAssignments: [
          { signerKey: 'party_a', role: 'business' },
          { signerKey: 'party_b', role: 'contragent' },
        ],
        deadline: new Date('2026-04-30T00:00:00.000Z'),
      });
      const [url, body] = f.post.mock.calls[0] as [string, Record<string, unknown>];
      expect(url).toBe('/api/v1/templates/t-1/contracts');
      expect(body['contragent']).toEqual({ email: 'partner@example.com', name: 'Partner Corp' });
      expect(body['contragentAccount']).toEqual({ kind: 'personal' });
    });

    it('rejects a malformed slot email before calling', async () => {
      const f = fakeClient();
      await expect(
        new Templates(f.client).sendForSigning('t-1', {
          documentName: 'n',
          variables: {},
          slotAssignments: [{ signerKey: 'a', email: 'not-an-email' }],
          deadline: new Date(),
        }),
      ).rejects.toThrow('slotAssignments[0].email');
      expect(f.post).not.toHaveBeenCalled();
    });
  });

  describe('read surface', () => {
    it('list builds the query string with status, search, page, limit', async () => {
      const f = fakeClient();
      const templates = new Templates(f.client);
      await templates.list();
      await templates.list({ page: 2, limit: 10, status: 'published', search: 'nda' });
      expect(f.get).toHaveBeenNthCalledWith(1, '/api/v1/templates');
      expect(f.get).toHaveBeenNthCalledWith(2, '/api/v1/templates?page=2&limit=10&status=published&search=nda');
    });

    it('get and getVersions address the template', async () => {
      const f = fakeClient();
      const templates = new Templates(f.client);
      await templates.get('t-1');
      await templates.getVersions('t-1');
      expect(f.get).toHaveBeenNthCalledWith(1, '/api/v1/templates/t-1');
      expect(f.get).toHaveBeenNthCalledWith(2, '/api/v1/templates/t-1/versions');
    });
  });

  describe('write surface', () => {
    it('create sends content in the new format', async () => {
      const f = fakeClient();
      await new Templates(f.client).create({ name: 'NDA', category: 'nda', content: template });
      expect(f.post).toHaveBeenCalledWith('/api/v1/templates', { name: 'NDA', category: 'nda', content: template });
    });

    it('update names the revision with the content', async () => {
      const f = fakeClient();
      await new Templates(f.client).update('t-1', { content: template, revision: 4 });
      expect(f.patch).toHaveBeenCalledWith('/api/v1/templates/t-1', { content: template, revision: 4 });
    });

    it('publish, archive, restore and delete use their routes', async () => {
      const f = fakeClient();
      const templates = new Templates(f.client);
      await templates.publish('t-1', { changelog: 'v2', revision: 4 });
      await templates.publish('t-1');
      await templates.archive('t-1');
      await templates.restore('t-1');
      await templates.delete('t-1');
      expect(f.post).toHaveBeenNthCalledWith(1, '/api/v1/templates/t-1/publish', { changelog: 'v2', revision: 4 });
      expect(f.post).toHaveBeenNthCalledWith(2, '/api/v1/templates/t-1/publish', {});
      expect(f.post).toHaveBeenNthCalledWith(3, '/api/v1/templates/t-1/archive', {});
      expect(f.post).toHaveBeenNthCalledWith(4, '/api/v1/templates/t-1/restore', {});
      expect(f.delete).toHaveBeenCalledWith('/api/v1/templates/t-1');
    });
  });
});

describe('template refusals over the wire', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [409, 'TEMPLATE_WORKING_COPY_MOVED'],
    [422, 'TEMPLATE_REVISION_REQUIRED'],
    [410, 'TEMPLATE_RETIRED'],
    [422, 'TEMPLATE_SLOTS_REFUSED'],
  ])('%s %s is a ChaindocTemplateError carrying the answer body', async (status, errorKey) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'refused', errorKey, workingCopy: { revision: 5 } }), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    const chaindoc = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const error = await chaindoc.templates.update('t-1', { content: template, revision: 1 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ChaindocTemplateError);
    expect(error).toMatchObject({ errorKey, statusCode: status, response: { workingCopy: { revision: 5 } } });
  });
});

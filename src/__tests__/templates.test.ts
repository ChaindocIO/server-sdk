import { describe, expect, it, vi } from 'vitest';
import { Templates } from '../modules/templates';

describe('Templates module', () => {
  it('calls the expected template runtime routes', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({}),
    };

    const templates = new Templates(client as any);

    await templates.createDocument('template-uuid', {
      documentName: 'Generated NDA',
      variables: { client_name: 'Acme' },
    });
    await templates.sendForSigning('template-uuid', {
      documentName: 'Generated NDA',
      variables: { client_name: 'Acme' },
      slotAssignments: [
        {
          signerKey: 'business',
          email: 'owner@example.com',
          signingMethod: 'delegated',
          signerVariables: {
            company_name: 'Acme Inc.',
          },
        },
        {
          signerKey: 'counterparty',
          email: 'signer@example.com',
          signingMethod: 'embedded',
        },
      ],
      deadline: new Date('2026-04-30T00:00:00.000Z'),
      isKycRequired: false,
    });
    await templates.createContract('template-uuid', {
      title: 'Generated MSA',
      variables: { company_name: 'Acme' },
      contragent: { email: 'partner@example.com', name: 'Partner Corp' },
      slotAssignments: [
        {
          signerKey: 'party_a',
          role: 'business',
          signerVariables: {
            company_name: 'Acme Inc.',
          },
        },
        { signerKey: 'party_b', role: 'contragent' },
      ],
      signingPolicy: {
        business: 'delegated',
        contragent: 'embedded',
      },
      deadline: new Date('2026-04-30T00:00:00.000Z'),
    });

    expect(client.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/templates/template-uuid/documents',
      {
        documentName: 'Generated NDA',
        variables: { client_name: 'Acme' },
      },
    );
    expect(client.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/templates/template-uuid/signature-requests',
      {
        documentName: 'Generated NDA',
        variables: { client_name: 'Acme' },
        slotAssignments: [
          {
            signerKey: 'business',
            email: 'owner@example.com',
            signingMethod: 'delegated',
            signerVariables: {
              company_name: 'Acme Inc.',
            },
          },
          {
            signerKey: 'counterparty',
            email: 'signer@example.com',
            signingMethod: 'embedded',
          },
        ],
        deadline: new Date('2026-04-30T00:00:00.000Z'),
        isKycRequired: false,
      },
    );
    expect(client.post).toHaveBeenNthCalledWith(
      3,
      '/api/v1/templates/template-uuid/contracts',
      {
        title: 'Generated MSA',
        variables: { company_name: 'Acme' },
        contragent: { email: 'partner@example.com', name: 'Partner Corp' },
        slotAssignments: [
          {
            signerKey: 'party_a',
            role: 'business',
            signerVariables: {
              company_name: 'Acme Inc.',
            },
          },
          { signerKey: 'party_b', role: 'contragent' },
        ],
        signingPolicy: {
          business: 'delegated',
          contragent: 'embedded',
        },
        deadline: new Date('2026-04-30T00:00:00.000Z'),
      },
    );
  });

  describe('read-surface (list / get / versions)', () => {
    it('list builds the query string with status, search, page, limit', async () => {
      const client = { get: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.list();
      await templates.list({ page: 2, limit: 25, status: 'published', search: 'NDA' });

      expect(client.get).toHaveBeenNthCalledWith(1, '/api/v1/templates');
      expect(client.get).toHaveBeenNthCalledWith(
        2,
        '/api/v1/templates?page=2&limit=25&status=published&search=NDA',
      );
    });

    it('get hits the detail endpoint with the template UUID', async () => {
      const client = { get: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.get('tpl-uuid');

      expect(client.get).toHaveBeenCalledWith('/api/v1/templates/tpl-uuid');
    });

    it('getVersions hits the versions endpoint with the template UUID', async () => {
      const client = { get: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.getVersions('tpl-uuid');

      expect(client.get).toHaveBeenCalledWith('/api/v1/templates/tpl-uuid/versions');
    });
  });

  describe('write surface', () => {
    it('create POSTs to the templates collection route', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.create({
        name: 'Service Agreement',
        category: 'contract',
        contentJson: { type: 'doc', content: [] },
      });

      expect(client.post).toHaveBeenCalledWith('/api/v1/templates', {
        name: 'Service Agreement',
        category: 'contract',
        contentJson: { type: 'doc', content: [] },
      });
    });

    it('update PATCHes the template route', async () => {
      const client = { patch: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.update('tpl-uuid', { name: 'Renamed Template' });

      expect(client.patch).toHaveBeenCalledWith('/api/v1/templates/tpl-uuid', {
        name: 'Renamed Template',
      });
    });

    it('publish POSTs to the publish route, defaulting body to {}', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.publish('tpl-uuid');
      await templates.publish('tpl-uuid', { changelog: 'Initial release' });

      expect(client.post).toHaveBeenNthCalledWith(1, '/api/v1/templates/tpl-uuid/publish', {});
      expect(client.post).toHaveBeenNthCalledWith(2, '/api/v1/templates/tpl-uuid/publish', {
        changelog: 'Initial release',
      });
    });

    it('archive and restore POST to their routes with an empty body', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.archive('tpl-uuid');
      await templates.restore('tpl-uuid');

      expect(client.post).toHaveBeenNthCalledWith(1, '/api/v1/templates/tpl-uuid/archive', {});
      expect(client.post).toHaveBeenNthCalledWith(2, '/api/v1/templates/tpl-uuid/restore', {});
    });

    it('delete DELETEs the template route', async () => {
      const client = { delete: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.delete('tpl-uuid');

      expect(client.delete).toHaveBeenCalledWith('/api/v1/templates/tpl-uuid');
    });

    it('previewPdf downloads via POST with the variables body', async () => {
      const fake = { data: new ArrayBuffer(8), contentType: 'application/pdf' };
      const client = { download: vi.fn().mockResolvedValue(fake) };
      const templates = new Templates(client as any);

      const result = await templates.previewPdf('tpl-uuid', {
        variables: { client_name: 'Acme' },
      });

      expect(client.download).toHaveBeenCalledWith('/api/v1/templates/tpl-uuid/preview-pdf', {
        method: 'POST',
        body: { variables: { client_name: 'Acme' } },
      });
      expect(result).toBe(fake);
    });

    it('previewPdf defaults the body to {} when no params given', async () => {
      const client = { download: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.previewPdf('tpl-uuid');

      expect(client.download).toHaveBeenCalledWith('/api/v1/templates/tpl-uuid/preview-pdf', {
        method: 'POST',
        body: {},
      });
    });

    it('previewHtml POSTs to the preview-html route', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const templates = new Templates(client as any);

      await templates.previewHtml('tpl-uuid');
      await templates.previewHtml('tpl-uuid', { variables: { client_name: 'Acme' } });

      expect(client.post).toHaveBeenNthCalledWith(
        1,
        '/api/v1/templates/tpl-uuid/preview-html',
        {},
      );
      expect(client.post).toHaveBeenNthCalledWith(
        2,
        '/api/v1/templates/tpl-uuid/preview-html',
        { variables: { client_name: 'Acme' } },
      );
    });

    it('previewUnsavedPdf downloads via POST with the content body', async () => {
      const fake = { data: new ArrayBuffer(8), contentType: 'application/pdf' };
      const client = { download: vi.fn().mockResolvedValue(fake) };
      const templates = new Templates(client as any);
      const params = { contentJson: { type: 'doc', content: [] } };

      const result = await templates.previewUnsavedPdf(params);

      expect(client.download).toHaveBeenCalledWith('/api/v1/templates/preview-unsaved-pdf', {
        method: 'POST',
        body: params,
      });
      expect(result).toBe(fake);
    });
  });
});

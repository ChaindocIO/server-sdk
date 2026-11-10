import { describe, expect, it, vi } from 'vitest';
import { ChaindocError } from '../client';
import { Signatures } from '../modules/signatures';
import { fakeClient } from './helpers';

describe('Signatures module', () => {
  it('binds recipients to the text by role and forwards the account option', async () => {
    const f = fakeClient({});
    const signatures = new Signatures(f.client);
    const deadline = new Date('2026-04-30T00:00:00.000Z');

    await signatures.createRequest({
      versionId: 'version-uuid',
      recipients: [
        { email: 'Owner@Example.com', role: 'seller', signingMethod: 'delegated' },
        {
          email: 'counterparty@example.com',
          role: 'buyer',
          account: { kind: 'workspace', workspaceId: 'ws-1' },
          signingMethod: 'embedded',
        },
      ],
      deadline,
      embeddedFlow: true,
      isKycRequired: false,
    });

    expect(f.post).toHaveBeenCalledWith('/api/v1/signatures/requests', {
      versionId: 'version-uuid',
      recipients: [
        { email: 'owner@example.com', role: 'seller', signingMethod: 'delegated' },
        {
          email: 'counterparty@example.com',
          role: 'buyer',
          account: { kind: 'workspace', workspaceId: 'ws-1' },
          signingMethod: 'embedded',
        },
      ],
      deadline: '2026-04-30T00:00:00.000Z',
      embeddedFlow: true,
      isKycRequired: false,
    });
  });

  it('refuses coordinate fields before any call (SETUP_FIELDS_STAND_IN_THE_TEXT)', async () => {
    const f = fakeClient({});
    const signatures = new Signatures(f.client);
    const withFields = {
      versionId: 'version-uuid',
      recipients: [{ email: 'owner@example.com', role: 'seller' }],
      deadline: new Date('2026-04-30T00:00:00.000Z'),
      fields: [{ signerEmail: 'owner@example.com', fieldType: 'signature', pageIndex: 0, xPct: 0.1, yPct: 0.2, wPct: 0.2, hPct: 0.05, required: true }],
    };

    await expect(signatures.createRequest(withFields)).rejects.toMatchObject({
      errorKey: 'SETUP_FIELDS_STAND_IN_THE_TEXT',
      statusCode: 422,
    });
    expect(f.post).not.toHaveBeenCalled();
  });

  it('resend opens a new request with an ISO deadline', async () => {
    const f = fakeClient({});
    const signatures = new Signatures(f.client);
    await signatures.resend('req-uuid', { deadline: new Date('2026-05-01T00:00:00.000Z') });
    expect(f.post).toHaveBeenCalledWith('/api/v1/signatures/requests/req-uuid/resend', {
      deadline: '2026-05-01T00:00:00.000Z',
    });
  });

  describe('lifecycle (cancel / remind / downloads)', () => {
    it('cancel posts to the cancel route with an empty body', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await signatures.cancel('req-uuid');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/signatures/requests/req-uuid/cancel',
        {},
      );
    });

    it('remind without params sends an empty body', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await signatures.remind('req-uuid');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/signatures/requests/req-uuid/remind',
        {},
      );
    });

    it('remind normalizes signerEmails before sending', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await signatures.remind('req-uuid', {
        signerEmails: ['  Alice@Example.com  ', 'bob@Example.COM'],
      });

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/signatures/requests/req-uuid/remind',
        { signerEmails: ['alice@example.com', 'bob@example.com'] },
      );
    });

    it('remind throws before sending when an email is malformed', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await expect(
        signatures.remind('req-uuid', { signerEmails: ['not-an-email'] }),
      ).rejects.toThrow(ChaindocError);
      expect(client.post).not.toHaveBeenCalled();
    });

    it('remind throws before sending when signerEmails is an empty list', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await expect(
        signatures.remind('req-uuid', { signerEmails: [] }),
      ).rejects.toThrow(ChaindocError);
      expect(client.post).not.toHaveBeenCalled();
    });

    it('downloadCertificate delegates to client.download', async () => {
      const fake = { data: new ArrayBuffer(4), contentType: 'application/pdf' };
      const client = { download: vi.fn().mockResolvedValue(fake) };
      const signatures = new Signatures(client as any);

      const result = await signatures.downloadCertificate('ver-uuid');

      expect(client.download).toHaveBeenCalledWith(
        '/api/v1/signatures/versions/ver-uuid/certificate',
      );
      expect(result).toBe(fake);
    });

    it('downloadSignedDocument delegates to client.download', async () => {
      const fake = { data: new ArrayBuffer(4), contentType: 'application/pdf' };
      const client = { download: vi.fn().mockResolvedValue(fake) };
      const signatures = new Signatures(client as any);

      const result = await signatures.downloadSignedDocument('ver-uuid');

      expect(client.download).toHaveBeenCalledWith(
        '/api/v1/signatures/versions/ver-uuid/signed-document',
      );
      expect(result).toBe(fake);
    });
  });

  describe('getMyRequests status filter', () => {
    it('sends no query when called without params', async () => {
      const client = { get: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await signatures.getMyRequests();

      expect(client.get).toHaveBeenCalledWith('/api/v1/signatures/requests');
    });

    it('serializes pagination and status filter', async () => {
      const client = { get: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await signatures.getMyRequests({ pageNumber: 2, pageSize: 25, status: 'pending' });

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/signatures/requests?pageNumber=2&pageSize=25&status=pending',
      );
    });
  });

  describe('createSignature', () => {
    it('POSTs the media payload to the signatures route', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);
      const media = { type: 'image' as const, name: 'sig.png', key: '/temp/sig.png', url: '' };

      await signatures.createSignature({ media });

      expect(client.post).toHaveBeenCalledWith('/api/v1/signatures', { media });
    });
  });

  describe('validatePdfSignatures', () => {
    it('uploads the PDF under the "file" field of the validate-pdf route', async () => {
      const client = {
        uploadFiles: vi
          .fn()
          .mockResolvedValue({ success: true, valid: true, signatureCount: 1, details: {} }),
      };
      const signatures = new Signatures(client as any);
      const file = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], {
        type: 'application/pdf',
      });

      const result = await signatures.validatePdfSignatures(file);

      expect(client.uploadFiles).toHaveBeenCalledWith(
        '/api/v1/signatures/validate-pdf',
        [file],
        'file',
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('editRequest', () => {
    it('normalizes the recipient email and POSTs to the edit route', async () => {
      const client = { post: vi.fn().mockResolvedValue({}) };
      const signatures = new Signatures(client as any);

      await signatures.editRequest('request-uuid', {
        signerId: 'signer-uuid',
        recipient: '  New.Signer@Example.com  ',
      });

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/signatures/requests/request-uuid/edit',
        { signerId: 'signer-uuid', recipient: 'new.signer@example.com' },
      );
    });

    it('throws before sending when the recipient email is malformed', async () => {
      const client = { post: vi.fn() };
      const signatures = new Signatures(client as any);

      await expect(
        signatures.editRequest('request-uuid', {
          signerId: 'signer-uuid',
          recipient: 'not-an-email',
        }),
      ).rejects.toThrow();

      expect(client.post).not.toHaveBeenCalled();
    });
  });
});

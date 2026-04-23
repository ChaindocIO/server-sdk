import { describe, expect, it, vi } from 'vitest';
import { Signatures } from '../modules/signatures';

describe('Signatures module', () => {
  it('forwards document signing modes and signature fields when creating a request', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({}),
    };
    const signatures = new Signatures(client as any);
    const deadline = new Date('2026-04-30T00:00:00.000Z');

    await signatures.createRequest({
      versionId: 'version-uuid',
      recipients: [
        { email: 'owner@example.com', signingMethod: 'delegated' },
        { email: 'counterparty@example.com', signingMethod: 'embedded' },
      ],
      deadline,
      embeddedFlow: true,
      isKycRequired: false,
      fields: [
        {
          signerEmail: 'owner@example.com',
          fieldType: 'signature',
          pageIndex: 0,
          xPct: 0.1,
          yPct: 0.2,
          wPct: 0.25,
          hPct: 0.05,
          required: true,
        },
      ],
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/signatures/requests', {
      versionId: 'version-uuid',
      recipients: [
        { email: 'owner@example.com', signingMethod: 'delegated' },
        { email: 'counterparty@example.com', signingMethod: 'embedded' },
      ],
      deadline: '2026-04-30T00:00:00.000Z',
      embeddedFlow: true,
      isKycRequired: false,
      fields: [
        {
          signerEmail: 'owner@example.com',
          fieldType: 'signature',
          pageIndex: 0,
          xPct: 0.1,
          yPct: 0.2,
          wPct: 0.25,
          hPct: 0.05,
          required: true,
        },
      ],
    });
  });
});

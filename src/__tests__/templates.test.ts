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
});

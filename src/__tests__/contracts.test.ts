import { describe, expect, it, vi } from 'vitest';
import { Contracts } from '../modules/contracts';

describe('Contracts module', () => {
  it('passes payment preferences through create()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.create({
      documentId: 'doc-uuid',
      title: 'MSA',
      contragent: { email: 'partner@example.com' },
      paymentMethodRequired: true,
      preferredPaymentMethodType: 'card',
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/contracts', {
      documentId: 'doc-uuid',
      title: 'MSA',
      contragent: { email: 'partner@example.com' },
      paymentMethodRequired: true,
      preferredPaymentMethodType: 'card',
    });
  });

  it('serializes list filters with page and limit params', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
    };

    const contracts = new Contracts(client as any);

    await contracts.list({
      page: 2,
      limit: 25,
      status: 'active',
      search: 'consulting',
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/contracts?page=2&limit=25&status=active&search=consulting',
    );
  });

  it('serializes activities pagination with page and limit params', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
    };

    const contracts = new Contracts(client as any);

    await contracts.getActivities('contract-uuid', { page: 3, limit: 50 });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/activities?page=3&limit=50',
    );
  });

  it('passes payment preferences through addPaymentSetup()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.addPaymentSetup('contract-uuid', {
      startDate: '2026-05-01T00:00:00.000Z',
      currencyCode: 'EUR',
      paymentMethodRequired: true,
      preferredPaymentMethodType: 'bank_transfer',
      paymentTerms: [{ type: 'one_time', name: 'Setup fee', amount: '500.00' } as any],
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid/payment-setup', {
      startDate: '2026-05-01T00:00:00.000Z',
      currencyCode: 'EUR',
      paymentMethodRequired: true,
      preferredPaymentMethodType: 'bank_transfer',
      paymentTerms: [{ type: 'one_time', name: 'Setup fee', amount: '500.00' }],
    });
  });

  it('serializes optional send() payload fields', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);
    const deadline = new Date('2026-05-15T00:00:00.000Z');

    await contracts.send('contract-uuid', {
      messageToSigners: 'Please sign this contract',
      deadline,
      isKycRequired: true,
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid/send', {
      messageToSigners: 'Please sign this contract',
      deadline: '2026-05-15T00:00:00.000Z',
      isKycRequired: true,
    });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { Contracts } from '../modules/contracts';
import { ContractTermination } from '../modules/contract-termination';
import { ContractPaymentTerms } from '../modules/contract-payment-terms';
import { ContractAgreements } from '../modules/contract-agreements';

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

  it('PATCHes update with normalized contragent email', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.update('contract-uuid', {
      title: 'Renamed Contract',
      contragent: { email: '  Partner@Example.com  ', name: 'Partner LLC' },
      preferredPaymentMethodType: null,
    });

    expect(client.patch).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid', {
      title: 'Renamed Contract',
      contragent: { email: 'partner@example.com', name: 'Partner LLC' },
      preferredPaymentMethodType: null,
    });
  });

  it('rejects update() when an invalid contragent email is provided', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    };

    const contracts = new Contracts(client as any);

    await expect(
      contracts.update('contract-uuid', {
        contragent: { email: 'not-an-email' },
      }),
    ).rejects.toThrow();

    expect(client.patch).not.toHaveBeenCalled();
  });

  it('DELETEs delete()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.delete('contract-uuid');

    expect(client.delete).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid');
  });

  it('normalizes email and POSTs createEmpty()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.createEmpty({
      title: 'Invoice-only',
      contragentEmail: '  Client@Example.com  ',
      contragentName: 'Client Co',
      currencyCode: 'EUR',
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/contracts/empty', {
      title: 'Invoice-only',
      contragentEmail: 'client@example.com',
      contragentName: 'Client Co',
      currencyCode: 'EUR',
    });
  });

  it('normalizes email and POSTs createMinimal()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.createMinimal({
      documentId: 'doc-uuid',
      title: 'Minimal Contract',
      contragentEmail: '  Client@Example.com  ',
      skipPaymentSetup: true,
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/contracts/minimal', {
      documentId: 'doc-uuid',
      title: 'Minimal Contract',
      contragentEmail: 'client@example.com',
      skipPaymentSetup: true,
    });
  });

  it('normalizes email and POSTs import()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.import({
      documentId: 'doc-uuid',
      title: 'Imported',
      contragentEmail: '  Imported@Example.com  ',
      startDate: '2025-01-15T00:00:00.000Z',
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/contracts/import', {
      documentId: 'doc-uuid',
      title: 'Imported',
      contragentEmail: 'imported@example.com',
      startDate: '2025-01-15T00:00:00.000Z',
    });
  });

  it('rejects createEmpty() / createMinimal() / import() when email is invalid', async () => {
    const client = { get: vi.fn(), post: vi.fn() };
    const contracts = new Contracts(client as any);

    await expect(
      contracts.createEmpty({ title: 'X', contragentEmail: 'bad' }),
    ).rejects.toThrow();
    await expect(
      contracts.createMinimal({ documentId: 'd', title: 'X', contragentEmail: 'bad' }),
    ).rejects.toThrow();
    await expect(
      contracts.import({ documentId: 'd', title: 'X', contragentEmail: 'bad' }),
    ).rejects.toThrow();

    expect(client.post).not.toHaveBeenCalled();
  });

  it('PATCHes attachDocument()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn().mockResolvedValue({}),
    };

    const contracts = new Contracts(client as any);

    await contracts.attachDocument('contract-uuid', { documentId: 'doc-uuid' });

    expect(client.patch).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid/document', {
      documentId: 'doc-uuid',
    });
  });

  it('GETs contract stats', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
    };

    const contracts = new Contracts(client as any);

    await contracts.getStats('contract-uuid');

    expect(client.get).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid/stats');
  });

  it('POSTs setupRecurring()', async () => {
    const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
    const contracts = new Contracts(client as any);

    await contracts.setupRecurring('contract-uuid', {
      paymentTerms: [
        {
          type: 'recurring',
          name: 'Monthly retainer',
          amount: '500.00',
          frequency: 'monthly',
          dayOfPeriod: 1,
          startDate: '2026-06-01',
        },
      ],
      paymentMethodRequired: true,
      messageToContragent: 'Please approve the recurring plan',
      expiresInDays: 14,
    });

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/recurring-setup',
      {
        paymentTerms: [
          {
            type: 'recurring',
            name: 'Monthly retainer',
            amount: '500.00',
            frequency: 'monthly',
            dayOfPeriod: 1,
            startDate: '2026-06-01',
          },
        ],
        paymentMethodRequired: true,
        messageToContragent: 'Please approve the recurring plan',
        expiresInDays: 14,
      },
    );
  });

  it('POSTs resendRecurringApproval()', async () => {
    const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
    const contracts = new Contracts(client as any);

    await contracts.resendRecurringApproval('contract-uuid');

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/recurring-approval/resend',
      {},
    );
  });

  it('DELETEs cancelRecurringApproval()', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    };
    const contracts = new Contracts(client as any);

    await contracts.cancelRecurringApproval('contract-uuid');

    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/recurring-approval',
    );
  });

  it('exposes a termination submodule on contracts', () => {
    const client = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
    const contracts = new Contracts(client as any);

    expect(contracts.termination).toBeInstanceOf(ContractTermination);
  });

  describe('termination submodule', () => {
    it('GETs the current termination request', async () => {
      const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn(), delete: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.termination.get('contract-uuid');

      expect(client.get).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid/termination');
    });

    it('GETs the termination status overview', async () => {
      const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn(), delete: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.termination.getStatus('contract-uuid');

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/termination/status',
      );
    });

    it('GETs the termination history', async () => {
      const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn(), delete: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.termination.getHistory('contract-uuid');

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/termination/history',
      );
    });

    it('POSTs approve() with empty body when no params provided', async () => {
      const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}), delete: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.termination.approve('contract-uuid');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/termination/approve',
        {},
      );
    });

    it('POSTs approve() with comment when provided', async () => {
      const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}), delete: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.termination.approve('contract-uuid', { comment: 'OK on our side' });

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/termination/approve',
        { comment: 'OK on our side' },
      );
    });

    it('POSTs reject() with required reason', async () => {
      const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}), delete: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.termination.reject('contract-uuid', { reason: 'Not aligned with renewal' });

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/termination/reject',
        { reason: 'Not aligned with renewal' },
      );
    });

    it('DELETEs cancel()', async () => {
      const client = { get: vi.fn(), post: vi.fn(), delete: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);

      await contracts.termination.cancel('contract-uuid');

      expect(client.delete).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/termination',
      );
    });
  });

  // --- Payment terms submodule ---

  it('exposes a paymentTerms submodule on contracts', () => {
    const client = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() };
    const contracts = new Contracts(client as any);

    expect(contracts.paymentTerms).toBeInstanceOf(ContractPaymentTerms);
  });

  describe('paymentTerms submodule', () => {
    it('GETs the payment terms list', async () => {
      const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.paymentTerms.list('contract-uuid');

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/payment-terms',
      );
    });

    it('POSTs create()', async () => {
      const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);

      await contracts.paymentTerms.create('contract-uuid', {
        type: 'one_time',
        name: 'Setup fee',
        amount: '500.00',
        dueDate: '2026-06-01',
      });

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/payment-terms',
        {
          type: 'one_time',
          name: 'Setup fee',
          amount: '500.00',
          dueDate: '2026-06-01',
        },
      );
    });

    it('PATCHes update()', async () => {
      const client = { get: vi.fn(), post: vi.fn(), patch: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);

      await contracts.paymentTerms.update('contract-uuid', 'term-uuid', {
        amount: '750.00',
        isActive: false,
      });

      expect(client.patch).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/payment-terms/term-uuid',
        { amount: '750.00', isActive: false },
      );
    });

    it('DELETEs delete()', async () => {
      const client = { get: vi.fn(), post: vi.fn(), delete: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);

      await contracts.paymentTerms.delete('contract-uuid', 'term-uuid');

      expect(client.delete).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/payment-terms/term-uuid',
      );
    });
  });

  // --- Signing request inspection ---

  it('GETs listSigningRequests()', async () => {
    const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn() };
    const contracts = new Contracts(client as any);

    await contracts.listSigningRequests('contract-uuid');

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/signing-requests',
    );
  });

  it('GETs getSigningRequest()', async () => {
    const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn() };
    const contracts = new Contracts(client as any);

    await contracts.getSigningRequest('contract-uuid', 'request-uuid');

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/signing-requests/request-uuid',
    );
  });

  // --- Signing request business actions ---

  it('POSTs resendSigningRequest()', async () => {
    const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
    const contracts = new Contracts(client as any);

    await contracts.resendSigningRequest('contract-uuid', 'request-uuid');

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/signing-requests/request-uuid/resend',
      {},
    );
  });

  it('DELETEs cancelSigningRequest()', async () => {
    const client = { get: vi.fn(), post: vi.fn(), delete: vi.fn().mockResolvedValue({}) };
    const contracts = new Contracts(client as any);

    await contracts.cancelSigningRequest('contract-uuid', 'request-uuid');

    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/signing-requests/request-uuid',
    );
  });

  it('POSTs businessSign() with the signature hash', async () => {
    const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
    const contracts = new Contracts(client as any);

    await contracts.businessSign('contract-uuid', 'request-uuid', {
      signatureHash: 'sig-hash-abc',
      meta: [{ key: 'source', value: 'api' }],
    });

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/signing-requests/request-uuid/business-sign',
      { signatureHash: 'sig-hash-abc', meta: [{ key: 'source', value: 'api' }] },
    );
  });

  // --- Agreements submodule ---

  it('exposes an agreements submodule on contracts', () => {
    const client = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
    const contracts = new Contracts(client as any);

    expect(contracts.agreements).toBeInstanceOf(ContractAgreements);
  });

  describe('agreements submodule', () => {
    it('POSTs create() with payment-term modifications', async () => {
      const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);

      await contracts.agreements.create('contract-uuid', {
        documentId: 'doc-uuid',
        title: 'Amendment #1',
        modifiesPaymentTerms: true,
        paymentTermModifications: [
          { action: 'deactivate', paymentTermId: 'term-uuid' },
        ],
      });

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/agreements',
        {
          documentId: 'doc-uuid',
          title: 'Amendment #1',
          modifiesPaymentTerms: true,
          paymentTermModifications: [{ action: 'deactivate', paymentTermId: 'term-uuid' }],
        },
      );
    });

    it('GETs the agreements list', async () => {
      const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.agreements.list('contract-uuid');

      expect(client.get).toHaveBeenCalledWith('/api/v1/contracts/contract-uuid/agreements');
    });

    it('GETs a single agreement', async () => {
      const client = { get: vi.fn().mockResolvedValue({}), post: vi.fn() };
      const contracts = new Contracts(client as any);

      await contracts.agreements.get('contract-uuid', 'agreement-uuid');

      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/agreements/agreement-uuid',
      );
    });

    it('serializes initiateSigning() deadline to ISO', async () => {
      const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);
      const deadline = new Date('2026-07-15T00:00:00.000Z');

      await contracts.agreements.initiateSigning('contract-uuid', 'agreement-uuid', {
        messageToSigners: 'Please sign the amendment',
        deadline,
        isKycRequired: true,
      });

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/agreements/agreement-uuid/initiate-signing',
        {
          messageToSigners: 'Please sign the amendment',
          deadline: '2026-07-15T00:00:00.000Z',
          isKycRequired: true,
        },
      );
    });

    it('POSTs initiateSigning() with an empty body when no params are given', async () => {
      const client = { get: vi.fn(), post: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);

      await contracts.agreements.initiateSigning('contract-uuid', 'agreement-uuid');

      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/agreements/agreement-uuid/initiate-signing',
        {},
      );
    });

    it('DELETEs an agreement', async () => {
      const client = { get: vi.fn(), post: vi.fn(), delete: vi.fn().mockResolvedValue({}) };
      const contracts = new Contracts(client as any);

      await contracts.agreements.delete('contract-uuid', 'agreement-uuid');

      expect(client.delete).toHaveBeenCalledWith(
        '/api/v1/contracts/contract-uuid/agreements/agreement-uuid',
      );
    });
  });
});

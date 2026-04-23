import { describe, expect, it, vi } from 'vitest';
import { Invoices } from '../modules/invoices';

describe('Invoices module', () => {
  it('calls the expected create, get, and charge routes', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    };

    const invoices = new Invoices(client as any);

    await invoices.create('contract-uuid', {
      title: 'April Retainer',
      amount: '1500.00',
      dueDate: '2026-04-30T00:00:00.000Z',
    });
    await invoices.get('contract-uuid', 'invoice-uuid');
    await invoices.charge('contract-uuid', 'invoice-uuid');

    expect(client.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/contracts/contract-uuid/invoices',
      {
        title: 'April Retainer',
        amount: '1500.00',
        dueDate: '2026-04-30T00:00:00.000Z',
      },
    );
    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/contracts/contract-uuid/invoices/invoice-uuid',
    );
    expect(client.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/contracts/contract-uuid/invoices/invoice-uuid/charge',
      {},
    );
  });

  it('serializes list filters with pagination and date params', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn(),
    };

    const invoices = new Invoices(client as any);

    await invoices.list('contract-uuid', {
      page: 2,
      limit: 25,
      status: 'unpaid',
      type: 'manual',
      overdue: true,
      dueDateFrom: '2026-04-01',
      dueDateTo: '2026-04-30',
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/contracts/contract-uuid/invoices?page=2&limit=25&status=unpaid&type=manual&overdue=true&dueDateFrom=2026-04-01&dueDateTo=2026-04-30',
    );
  });

  it('sends optional params for send and markPaid actions', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    };

    const invoices = new Invoices(client as any);

    await invoices.send('contract-uuid', 'invoice-uuid', { autoCharge: true });
    await invoices.markPaid('contract-uuid', 'invoice-uuid', {
      note: 'Wire received',
      paidAt: '2026-04-03T10:00:00.000Z',
    });

    expect(client.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/contracts/contract-uuid/invoices/invoice-uuid/send',
      { autoCharge: true },
    );
    expect(client.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/contracts/contract-uuid/invoices/invoice-uuid/mark-paid',
      {
        note: 'Wire received',
        paidAt: '2026-04-03T10:00:00.000Z',
      },
    );
  });
});

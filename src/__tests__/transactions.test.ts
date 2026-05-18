import { describe, expect, it, vi } from 'vitest';
import { Transactions } from '../modules/transactions';

describe('Transactions module', () => {
  it('calls the expected contract list and detail routes', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
    };

    const transactions = new Transactions(client as any);

    await transactions.listByContract('contract-uuid');
    await transactions.get('transaction-uuid');

    expect(client.get).toHaveBeenNthCalledWith(1, '/api/v1/contracts/contract-uuid/transactions');
    expect(client.get).toHaveBeenNthCalledWith(2, '/api/v1/transactions/transaction-uuid');
  });

  it('getPaymentMix serializes the date range and optional filters', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const transactions = new Transactions(client as any);

    await transactions.getPaymentMix({ from: '2025-01-01', to: '2025-12-31' });
    await transactions.getPaymentMix({
      from: '2025-01-01',
      to: '2025-12-31',
      status: 'SUCCESS',
      contractUuid: '11111111-1111-4111-8111-111111111111',
      currencyCode: 'USD',
    });

    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/transactions/payment-mix?from=2025-01-01&to=2025-12-31',
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/transactions/payment-mix?from=2025-01-01&to=2025-12-31' +
        '&status=SUCCESS&contractUuid=11111111-1111-4111-8111-111111111111&currencyCode=USD',
    );
  });

  it('getFeeEstimate serializes amount, currency and optional fee override', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const transactions = new Transactions(client as any);

    await transactions.getFeeEstimate({ amount: 1000, currency: 'EUR' });
    await transactions.getFeeEstimate({ amount: 1000, currency: 'EUR', platformFeePercent: 3 });

    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/transactions/fee-estimate?amount=1000&currency=EUR',
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/transactions/fee-estimate?amount=1000&currency=EUR&platformFeePercent=3',
    );
  });
});

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
});

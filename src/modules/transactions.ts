/**
 * Transactions Module
 */

import type { HttpClient } from '../client';
import type { TransactionListResponse, TransactionResponse } from '../types';

export class Transactions {
  constructor(private client: HttpClient) {}

  /**
   * List transactions for a contract.
   */
  async listByContract(contractId: string): Promise<TransactionListResponse> {
    return this.client.get<TransactionListResponse>(`/api/v1/contracts/${contractId}/transactions`);
  }

  /**
   * Get a single transaction by UUID.
   */
  async get(transactionId: string): Promise<TransactionResponse> {
    return this.client.get<TransactionResponse>(`/api/v1/transactions/${transactionId}`);
  }
}

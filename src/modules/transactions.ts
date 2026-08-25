/**
 * Transactions Module
 */

import type { HttpClient } from '../client';
import type {
  FeeEstimateParams,
  FeeEstimateResponse,
  PaymentMixParams,
  PaymentMixResponse,
  TransactionListResponse,
  TransactionResponse,
} from '../types';

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

  /**
   * Get payment-mix analytics: transaction totals grouped by payment-method
   * type for the contracts of the WORKSPACE the API key belongs to, within a date range.
   */
  async getPaymentMix(params: PaymentMixParams): Promise<PaymentMixResponse> {
    const query = new URLSearchParams();
    query.set('from', params.from);
    query.set('to', params.to);
    if (params.status !== undefined) query.set('status', params.status);
    if (params.contractUuid !== undefined) query.set('contractUuid', params.contractUuid);
    if (params.currencyCode !== undefined) query.set('currencyCode', params.currencyCode);

    return this.client.get<PaymentMixResponse>(
      `/api/v1/transactions/payment-mix?${query.toString()}`,
    );
  }

  /**
   * Estimate processing fees (Stripe + platform) per payment-method type for a
   * given amount and currency. Pure calculation, no contract data involved.
   */
  async getFeeEstimate(params: FeeEstimateParams): Promise<FeeEstimateResponse> {
    const query = new URLSearchParams();
    query.set('amount', String(params.amount));
    query.set('currency', params.currency);
    if (params.platformFeePercent !== undefined) {
      query.set('platformFeePercent', String(params.platformFeePercent));
    }

    return this.client.get<FeeEstimateResponse>(
      `/api/v1/transactions/fee-estimate?${query.toString()}`,
    );
  }
}

/**
 * Contract Payment Terms Submodule
 *
 * Granular CRUD over a contract's payment terms. All mutations require the
 * contract to be in DRAFT status; the term currency is inherited from the contract.
 */

import type { HttpClient } from '../client';
import type {
  PaymentTermInput,
  PaymentTermListResponse,
  PaymentTermEnvelope,
  PaymentTermDeleteResponse,
  UpdatePaymentTermParams,
} from '../types';

export class ContractPaymentTerms {
  constructor(private client: HttpClient) {}

  /** List all payment terms for a contract. */
  async list(contractId: string): Promise<PaymentTermListResponse> {
    return this.client.get<PaymentTermListResponse>(
      `/api/v1/contracts/${contractId}/payment-terms`
    );
  }

  /**
   * Add a payment term to a DRAFT contract.
   * `currencyCode` is intentionally not accepted; it is inherited from the contract.
   */
  async create(contractId: string, params: PaymentTermInput): Promise<PaymentTermEnvelope> {
    return this.client.post<PaymentTermEnvelope>(
      `/api/v1/contracts/${contractId}/payment-terms`,
      params
    );
  }

  /** Update a single payment term on a DRAFT contract. Only provided fields are applied. */
  async update(
    contractId: string,
    termId: string,
    params: UpdatePaymentTermParams
  ): Promise<PaymentTermEnvelope> {
    return this.client.patch<PaymentTermEnvelope>(
      `/api/v1/contracts/${contractId}/payment-terms/${termId}`,
      params
    );
  }

  /** Remove a payment term from a DRAFT contract. */
  async delete(contractId: string, termId: string): Promise<PaymentTermDeleteResponse> {
    return this.client.delete<PaymentTermDeleteResponse>(
      `/api/v1/contracts/${contractId}/payment-terms/${termId}`
    );
  }
}

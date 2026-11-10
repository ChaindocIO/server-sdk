/**
 * Payment Instructions Module: bank, crypto and other details printed on invoices.
 *
 * Money line: creating or assigning an instruction changes where customers pay. The server emails the
 * business owners on every change; the SDK sends nothing it was not asked to.
 */

import type { HttpClient } from '../client';
import type {
  AssignContragentPaymentInstructionParams,
  ContragentPaymentInstructionAssignedResponse,
  CreatePaymentInstructionParams,
  PaymentInstructionCreatedResponse,
  PaymentInstructionListResponse,
} from '../types';
import { normalizeEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';

export class PaymentInstructions {
  constructor(private client: HttpClient) {}

  /** The active instructions of the business, default first. */
  async list(): Promise<PaymentInstructionListResponse> {
    return this.client.get<PaymentInstructionListResponse>('/api/v1/payment-instructions');
  }

  /**
   * Create an instruction. Without `currencyCode` it is for any currency. A crypto instruction needs
   * `network`, `asset` and a checksummed `address`; a bad one is 400 with `field` and an `errorKey`.
   */
  async create(params: CreatePaymentInstructionParams): Promise<PaymentInstructionCreatedResponse> {
    return this.client.post<PaymentInstructionCreatedResponse>('/api/v1/payment-instructions', params, {
      noRetry: true,
    });
  }

  /** Counterparty level of the cascade ("a wallet per client"): assign by e-mail, or clear with `null`. */
  async assignToContragent(
    params: AssignContragentPaymentInstructionParams,
  ): Promise<ContragentPaymentInstructionAssignedResponse> {
    assertValidEmail(params.contragentEmail, 'contragentEmail');
    return this.client.put<ContragentPaymentInstructionAssignedResponse>(
      '/api/v1/payment-instructions/contragent-assignment',
      { ...params, contragentEmail: normalizeEmail(params.contragentEmail) },
      { noRetry: true },
    );
  }
}

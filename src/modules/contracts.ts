/**
 * Contracts Module
 */

import type { HttpClient } from '../client';
import type {
  CreateContractParams,
  ContractResponse,
  ContractListResponse,
  ContractStatusResponse,
  ContractActivitiesResponse,
  PaymentSetupParams,
  TerminateContractParams,
  ContractActionResponse,
  ContractSendResponse,
  ContractSendParams,
  ContractListParams,
  PaginationParams,
} from '../types';
import { withNormalizedEmail } from '../utils/normalize-email';

export class Contracts {
  constructor(private client: HttpClient) {}

  /**
   * Create a new contract
   * Creates a contract in DRAFT status with a document and contragent info.
   * Payment terms can be included or added later via addPaymentSetup().
   */
  async create(params: CreateContractParams): Promise<ContractResponse> {
    return this.client.post<ContractResponse>('/api/v1/contracts', {
      ...params,
      contragent: withNormalizedEmail(params.contragent),
    });
  }

  /**
   * List contracts
   * Returns paginated list of contracts with optional filters.
   */
  async list(params?: ContractListParams): Promise<ContractListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    return this.client.get<ContractListResponse>(`/api/v1/contracts${qs ? `?${qs}` : ''}`);
  }

  /**
   * Get contract details
   * Returns full contract details including payment terms and signing status.
   */
  async get(contractId: string): Promise<ContractResponse> {
    return this.client.get<ContractResponse>(`/api/v1/contracts/${contractId}`);
  }

  /**
   * Get contract lifecycle status
   * Returns lightweight status summary including signing progress and payment overview.
   */
  async getStatus(contractId: string): Promise<ContractStatusResponse> {
    return this.client.get<ContractStatusResponse>(`/api/v1/contracts/${contractId}/status`);
  }

  /**
   * Get contract activity log
   * Returns paginated activity log for the contract.
   */
  async getActivities(contractId: string, params?: PaginationParams): Promise<ContractActivitiesResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return this.client.get<ContractActivitiesResponse>(
      `/api/v1/contracts/${contractId}/activities${qs ? `?${qs}` : ''}`
    );
  }

  /**
   * Add payment terms to a contract
   * Adds payment terms to a DRAFT contract that was created without them.
   */
  async addPaymentSetup(contractId: string, params: PaymentSetupParams): Promise<ContractResponse> {
    return this.client.post<ContractResponse>(`/api/v1/contracts/${contractId}/payment-setup`, params);
  }

  /**
   * Send contract for signing
   * Initiates the signing flow for a DRAFT contract.
   */
  async send(contractId: string, params?: ContractSendParams): Promise<ContractSendResponse> {
    return this.client.post<ContractSendResponse>(`/api/v1/contracts/${contractId}/send`, {
      ...params,
      deadline: params?.deadline?.toISOString(),
    });
  }

  /**
   * Cancel contract
   * Cancels a DRAFT contract.
   */
  async cancel(contractId: string): Promise<ContractActionResponse> {
    return this.client.post<ContractActionResponse>(`/api/v1/contracts/${contractId}/cancel`, {});
  }

  /**
   * Terminate contract
   * Initiates termination for an ACTIVE contract.
   * For ONE_SIDE: terminates immediately.
   * For MUTUAL_APPROVAL: creates termination request pending counterparty approval.
   */
  async terminate(contractId: string, params?: TerminateContractParams): Promise<ContractActionResponse> {
    return this.client.post<ContractActionResponse>(
      `/api/v1/contracts/${contractId}/terminate`,
      params ?? {}
    );
  }
}

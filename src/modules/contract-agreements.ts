/**
 * Contract Additional Agreements (Amendments) Submodule
 *
 * Amendments are document-backed changes layered on an existing contract. They
 * may carry payment-term modifications that apply once the amendment is signed.
 */

import type { HttpClient } from '../client';
import type {
  AgreementDeleteResponse,
  AgreementEnvelope,
  AgreementListResponse,
  AgreementSigningResponse,
  CreateAgreementParams,
  InitiateAgreementSigningParams,
} from '../types';

export class ContractAgreements {
  constructor(private client: HttpClient) {}

  /**
   * Add an additional agreement (amendment) to a contract.
   * The amendment is created in DRAFT status; send it for signing separately.
   */
  async create(contractId: string, params: CreateAgreementParams): Promise<AgreementEnvelope> {
    return this.client.post<AgreementEnvelope>(
      `/api/v1/contracts/${contractId}/agreements`,
      params
    );
  }

  /** List all amendments attached to a contract. */
  async list(contractId: string): Promise<AgreementListResponse> {
    return this.client.get<AgreementListResponse>(
      `/api/v1/contracts/${contractId}/agreements`
    );
  }

  /** Get a single amendment by UUID. */
  async get(contractId: string, agreementId: string): Promise<AgreementEnvelope> {
    return this.client.get<AgreementEnvelope>(
      `/api/v1/contracts/${contractId}/agreements/${agreementId}`
    );
  }

  /**
   * Send a DRAFT amendment for signing.
   * The parent contract must be ACTIVE.
   */
  async initiateSigning(
    contractId: string,
    agreementId: string,
    params?: InitiateAgreementSigningParams
  ): Promise<AgreementSigningResponse> {
    const body = params
      ? {
          ...params,
          deadline: params.deadline?.toISOString(),
        }
      : {};

    return this.client.post<AgreementSigningResponse>(
      `/api/v1/contracts/${contractId}/agreements/${agreementId}/initiate-signing`,
      body
    );
  }

  /** Delete a DRAFT amendment. */
  async delete(contractId: string, agreementId: string): Promise<AgreementDeleteResponse> {
    return this.client.delete<AgreementDeleteResponse>(
      `/api/v1/contracts/${contractId}/agreements/${agreementId}`
    );
  }
}

/**
 * Contract Additional Agreements (Amendments) Submodule
 *
 * Amendments are document-backed changes layered on an existing contract. An amendment
 * carries no money: payment-term modifications are refused (`422 AMENDMENT_CARRIES_NO_MONEY`).
 * Change a contract's money through invoices — a one-off by `invoices.create`, a recurring
 * payment by a series of invoices (in the Chaindoc app; `contracts.setupRecurring` for an
 * imported contract).
 */

import { seg } from '../utils/path';
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
      `/api/v1/contracts/${seg(contractId)}/agreements`,
      params
    );
  }

  /** List all amendments attached to a contract. */
  async list(contractId: string): Promise<AgreementListResponse> {
    return this.client.get<AgreementListResponse>(
      `/api/v1/contracts/${seg(contractId)}/agreements`
    );
  }

  /** Get a single amendment by UUID. */
  async get(contractId: string, agreementId: string): Promise<AgreementEnvelope> {
    return this.client.get<AgreementEnvelope>(
      `/api/v1/contracts/${seg(contractId)}/agreements/${seg(agreementId)}`
    );
  }

  /**
   * Send a DRAFT amendment for signing. The parent contract must be ACTIVE.
   *
   * As `contracts.send`: the amendment's document is a text with signature chips of the roles `business` and
   * `contragent` (else `409 SETUP_BLOCKED` / `400 SIGNATURE_ROLE_UNKNOWN`), not a file (`422 DOCUMENT_FILE_CONVERTS`),
   * and with `isKycRequired` the workspace Owner has passed identity verification (`400 KYC_NOT_VERIFIED`).
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
      `/api/v1/contracts/${seg(contractId)}/agreements/${seg(agreementId)}/initiate-signing`,
      body
    );
  }

  /** Delete a DRAFT amendment. */
  async delete(contractId: string, agreementId: string): Promise<AgreementDeleteResponse> {
    return this.client.delete<AgreementDeleteResponse>(
      `/api/v1/contracts/${seg(contractId)}/agreements/${seg(agreementId)}`
    );
  }
}

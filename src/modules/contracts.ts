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
  ContractStatsResponse,
  PaymentSetupParams,
  TerminateContractParams,
  ContractActionResponse,
  ContractSendResponse,
  ContractSendParams,
  ContractListParams,
  PaginationParams,
  UpdateContractParams,
  CreateEmptyContractParams,
  CreateMinimalContractParams,
  CreateImportContractParams,
  AttachDocumentParams,
  RecurringSetupParams,
  SigningRequestActionResponse,
  SigningRequestListResponse,
  SigningRequestGetResponse,
  BusinessSignParams,
  BusinessSignResponse,
} from '../types';
import { normalizeEmail, withNormalizedEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';
import { ContractTermination } from './contract-termination';
import { ContractPaymentTerms } from './contract-payment-terms';
import { ContractAgreements } from './contract-agreements';

export class Contracts {
  /** Termination lifecycle for an initiated request: get / approve / reject / cancel. */
  readonly termination: ContractTermination;

  /** Granular CRUD over a contract's payment terms. */
  readonly paymentTerms: ContractPaymentTerms;

  /** Additional agreements (amendments) layered on a contract. */
  readonly agreements: ContractAgreements;

  constructor(private client: HttpClient) {
    this.termination = new ContractTermination(client);
    this.paymentTerms = new ContractPaymentTerms(client);
    this.agreements = new ContractAgreements(client);
  }

  /**
   * Create a new contract
   * Creates a contract in DRAFT status with a document and contragent info.
   * Payment terms can be included or added later via addPaymentSetup().
   */
  async create(params: CreateContractParams): Promise<ContractResponse> {
    assertValidEmail(params.contragent?.email, 'contragent.email');
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

  /**
   * Update a draft contract
   * Only DRAFT contracts can be updated. Only provided fields are applied.
   */
  async update(contractId: string, params: UpdateContractParams): Promise<ContractResponse> {
    if (params.contragent !== undefined) {
      assertValidEmail(params.contragent.email, 'contragent.email');
    }
    return this.client.patch<ContractResponse>(`/api/v1/contracts/${contractId}`, {
      ...params,
      contragent: params.contragent ? withNormalizedEmail(params.contragent) : undefined,
    });
  }

  /**
   * Delete a draft contract
   * Only DRAFT contracts can be deleted; usage is decremented atomically.
   */
  async delete(contractId: string): Promise<ContractActionResponse> {
    return this.client.delete<ContractActionResponse>(`/api/v1/contracts/${contractId}`);
  }

  /**
   * Create an empty (invoice-only) contract
   * Activates immediately. Use when no document needs to be signed (manual invoicing).
   */
  async createEmpty(params: CreateEmptyContractParams): Promise<ContractResponse> {
    assertValidEmail(params.contragentEmail, 'contragentEmail');
    return this.client.post<ContractResponse>('/api/v1/contracts/empty', {
      ...params,
      contragentEmail: normalizeEmail(params.contragentEmail),
    });
  }

  /**
   * Create a minimal contract (3-step flow)
   * Creates a DRAFT contract with the bare minimum (document + email + title).
   * Add payment setup and send for signing later.
   */
  async createMinimal(params: CreateMinimalContractParams): Promise<ContractResponse> {
    assertValidEmail(params.contragentEmail, 'contragentEmail');
    return this.client.post<ContractResponse>('/api/v1/contracts/minimal', {
      ...params,
      contragentEmail: normalizeEmail(params.contragentEmail),
    });
  }

  /**
   * Import an externally signed contract
   * Activates immediately. The platform skips the in-app signing flow because the
   * agreement was already signed off-platform.
   */
  async import(params: CreateImportContractParams): Promise<ContractResponse> {
    assertValidEmail(params.contragentEmail, 'contragentEmail');
    return this.client.post<ContractResponse>('/api/v1/contracts/import', {
      ...params,
      contragentEmail: normalizeEmail(params.contragentEmail),
    });
  }

  /**
   * Attach a document to a draft contract
   * Use when the contract was created via createEmpty() / createMinimal() without a document
   * and needs one before being sent for signing.
   */
  async attachDocument(
    contractId: string,
    params: AttachDocumentParams
  ): Promise<ContractResponse> {
    return this.client.patch<ContractResponse>(
      `/api/v1/contracts/${contractId}/document`,
      params
    );
  }

  /**
   * Get contract payment statistics
   * Returns aggregate financial overview: contract value, paid/pending amounts, invoice count.
   */
  async getStats(contractId: string): Promise<ContractStatsResponse> {
    return this.client.get<ContractStatsResponse>(`/api/v1/contracts/${contractId}/stats`);
  }

  /**
   * Set up recurring payments on an imported ACTIVE contract.
   * Sends an approval invitation to the contragent; recurring billing starts only
   * after the contragent accepts terms and links a payment method.
   */
  async setupRecurring(contractId: string, params: RecurringSetupParams): Promise<ContractResponse> {
    return this.client.post<ContractResponse>(
      `/api/v1/contracts/${contractId}/recurring-setup`,
      params
    );
  }

  /** Resend the pending recurring approval invitation email to the contragent. */
  async resendRecurringApproval(contractId: string): Promise<ContractActionResponse> {
    return this.client.post<ContractActionResponse>(
      `/api/v1/contracts/${contractId}/recurring-approval/resend`,
      {}
    );
  }

  /** Cancel a pending recurring approval request and remove the related pending payment terms. */
  async cancelRecurringApproval(contractId: string): Promise<ContractActionResponse> {
    return this.client.delete<ContractActionResponse>(
      `/api/v1/contracts/${contractId}/recurring-approval`
    );
  }

  /**
   * List every signing request on a contract as a summary (no per-signer
   * detail). Use `getSigningRequest()` for signers.
   */
  async listSigningRequests(contractId: string): Promise<SigningRequestListResponse> {
    return this.client.get<SigningRequestListResponse>(
      `/api/v1/contracts/${contractId}/signing-requests`
    );
  }

  /** Get a single signing request with full signer detail. */
  async getSigningRequest(
    contractId: string,
    requestId: string
  ): Promise<SigningRequestGetResponse> {
    return this.client.get<SigningRequestGetResponse>(
      `/api/v1/contracts/${contractId}/signing-requests/${requestId}`
    );
  }

  /** Resend the signing invitation email for a pending signing request. */
  async resendSigningRequest(
    contractId: string,
    requestId: string
  ): Promise<SigningRequestActionResponse> {
    return this.client.post<SigningRequestActionResponse>(
      `/api/v1/contracts/${contractId}/signing-requests/${requestId}/resend`,
      {}
    );
  }

  /**
   * Cancel a pending signing request.
   * Fails if the request has already been signed by any party.
   */
  async cancelSigningRequest(
    contractId: string,
    requestId: string
  ): Promise<SigningRequestActionResponse> {
    return this.client.delete<SigningRequestActionResponse>(
      `/api/v1/contracts/${contractId}/signing-requests/${requestId}`
    );
  }

  /**
   * Sign a contract on the workspace's behalf, **as the integration key**.
   *
   * ⛔ This is not the business owner's own act, and the package used to say it was. The signature
   * is given by the key that authenticated the call: the key is the acting subject, it is recorded
   * as such in the document's audit trail, and the person who happens to own the key is not the
   * signatory. The distinction matters the moment a key is issued for an organization rather than
   * for one person — which is what a workspace is.
   *
   * `signatureHash` references one of the workspace's saved signatures — list them with
   * `signatures.getSignatures()` or create one with `signatures.createSignature()`.
   */
  async businessSign(
    contractId: string,
    requestId: string,
    params: BusinessSignParams
  ): Promise<BusinessSignResponse> {
    return this.client.post<BusinessSignResponse>(
      `/api/v1/contracts/${contractId}/signing-requests/${requestId}/business-sign`,
      params
    );
  }
}

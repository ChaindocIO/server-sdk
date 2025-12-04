/**
 * Signatures Module
 */

import type { HttpClient } from '../client';
import type {
  CreateSignatureRequestParams,
  SignDocumentParams,
  SignatureRequestResponse,
  SignatureRequestStatus,
  PaginationParams,
  GetMyRequestsResponse,
  GetSignaturesResponse,
} from '../types';

export class Signatures {
  constructor(private client: HttpClient) {}

  /**
   * Create a signature request
   *
   * When embeddedFlow=true and isKycRequired=true:
   * - Recipients must include shareToken for KYC verification
   * - Backend validates KYC via Sumsub before creating request
   */
  async createRequest(params: CreateSignatureRequestParams): Promise<SignatureRequestResponse> {
    return this.client.post<SignatureRequestResponse>('/api/v1/signatures/requests', {
      ...params,
      deadline: params.deadline.toISOString(),
    });
  }

  /**
   * Get signature request status
   */
  async getRequestStatus(requestId: string): Promise<SignatureRequestStatus> {
    return this.client.get<SignatureRequestStatus>(`/api/v1/signatures/requests/${requestId}/status`);
  }

  /**
   * Get all signature requests for current user
   */
  async getMyRequests(pagination?: PaginationParams): Promise<GetMyRequestsResponse> {
    const params = new URLSearchParams();
    if (pagination?.pageNumber) params.set('pageNumber', String(pagination.pageNumber));
    if (pagination?.pageSize) params.set('pageSize', String(pagination.pageSize));

    const query = params.toString();
    return this.client.get<GetMyRequestsResponse>(`/api/v1/signatures/requests${query ? `?${query}` : ''}`);
  }

  /**
   * Sign a document
   * API key owner must be one of the signatories.
   */
  async sign(params: SignDocumentParams): Promise<{ success: boolean; requestId: string; signedAt: string; message: string }> {
    return this.client.post('/api/v1/signatures/sign', params);
  }

  /**
   * Get user's signatures (signature requests where user is a signer)
   */
  async getSignatures(pagination?: PaginationParams): Promise<GetSignaturesResponse> {
    const params = new URLSearchParams();
    if (pagination?.pageNumber) params.set('pageNumber', String(pagination.pageNumber));
    if (pagination?.pageSize) params.set('pageSize', String(pagination.pageSize));

    const query = params.toString();
    return this.client.get<GetSignaturesResponse>(`/api/v1/signatures${query ? `?${query}` : ''}`);
  }
}

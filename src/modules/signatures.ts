/**
 * Signatures Module
 */

import { ChaindocError } from '../client';
import type { DownloadResult, HttpClient } from '../client';
import type {
  CancelSignatureRequestResponse,
  CreateSignatureParams,
  CreateSignatureRequestParams,
  CreateSignatureResponse,
  EditSignatureRequestParams,
  EditSignatureRequestResponse,
  GetMyRequestsParams,
  GetMyRequestsResponse,
  GetSignaturesResponse,
  PaginationParams,
  RemindSignatureRequestParams,
  RemindSignatureRequestResponse,
  SignDocumentParams,
  SignatureRequestResponse,
  SignatureRequestStatus,
  ValidatePdfSignaturesResponse,
} from '../types';
import { normalizeEmail, withNormalizedEmail, withNormalizedSignerEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';

export class Signatures {
  constructor(private client: HttpClient) {}

  /**
   * Create a signature request
   *
   * When embeddedFlow=true and isKycRequired=true:
   * - Signers complete KYC inside Chaindoc before signing
   * - Backend enforces KYC at signing time
   */
  async createRequest(params: CreateSignatureRequestParams): Promise<SignatureRequestResponse> {
    params.recipients.forEach((r, i) =>
      assertValidEmail(r?.email, `recipients[${i}].email`),
    );
    params.fields?.forEach((f, i) =>
      assertValidEmail(f?.signerEmail, `fields[${i}].signerEmail`),
    );
    return this.client.post<SignatureRequestResponse>('/api/v1/signatures/requests', {
      ...params,
      recipients: params.recipients.map(withNormalizedEmail),
      fields: params.fields?.map(withNormalizedSignerEmail),
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
   * Get all signature requests for the current user.
   *
   * Pass `status` to filter by lifecycle bucket (`pending` | `completed` |
   * `declined`); omit it (or use `all`) to return every request.
   */
  async getMyRequests(params?: GetMyRequestsParams): Promise<GetMyRequestsResponse> {
    const query = new URLSearchParams();
    if (params?.pageNumber) query.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.status) query.set('status', params.status);

    const qs = query.toString();
    return this.client.get<GetMyRequestsResponse>(
      `/api/v1/signatures/requests${qs ? `?${qs}` : ''}`,
    );
  }

  /**
   * Reassign a signer slot on a PENDING signature request.
   *
   * Identify the slot by its `signerId` UUID (from a request summary's
   * `signers[].id`); `recipient` is the new email for that slot.
   */
  async editRequest(
    requestId: string,
    params: EditSignatureRequestParams,
  ): Promise<EditSignatureRequestResponse> {
    assertValidEmail(params.recipient, 'recipient');
    return this.client.post<EditSignatureRequestResponse>(
      `/api/v1/signatures/requests/${requestId}/edit`,
      { ...params, recipient: normalizeEmail(params.recipient) },
    );
  }

  /**
   * Sign a document
   * The key's workspace must be one of the signatories.
   */
  async sign(params: SignDocumentParams): Promise<{ success: boolean; requestId: string; signedAt: string; message: string }> {
    return this.client.post('/api/v1/signatures/sign', params);
  }

  /**
   * Get the saved signatures of the WORKSPACE the API key belongs to.
   * Each item carries a `hash` — the identifier used by `contracts.businessSign`.
   */
  async getSignatures(pagination?: PaginationParams): Promise<GetSignaturesResponse> {
    const params = new URLSearchParams();
    if (pagination?.pageNumber) params.set('pageNumber', String(pagination.pageNumber));
    if (pagination?.pageSize) params.set('pageSize', String(pagination.pageSize));

    const query = params.toString();
    return this.client.get<GetSignaturesResponse>(`/api/v1/signatures${query ? `?${query}` : ''}`);
  }

  /**
   * Create a reusable saved signature from an uploaded image.
   * Upload the image first with `media.upload`, then pass the resulting media here.
   * The returned `hash` identifies the signature for `contracts.businessSign`.
   */
  async createSignature(params: CreateSignatureParams): Promise<CreateSignatureResponse> {
    return this.client.post<CreateSignatureResponse>('/api/v1/signatures', params);
  }

  /**
   * Validate the digital signatures embedded in a PDF via the EU DSS service.
   * Upload the PDF directly — it is not stored. Requires Node.js >= 18.
   */
  async validatePdfSignatures(file: File | Blob): Promise<ValidatePdfSignaturesResponse> {
    return this.client.uploadFiles<ValidatePdfSignaturesResponse>(
      '/api/v1/signatures/validate-pdf',
      [file],
      'file',
    );
  }

  /**
   * Cancel a pending signature request owned by the API key.
   */
  async cancel(requestId: string): Promise<CancelSignatureRequestResponse> {
    return this.client.post<CancelSignatureRequestResponse>(
      `/api/v1/signatures/requests/${requestId}/cancel`,
      {},
    );
  }

  /**
   * Send a reminder to pending signers on the request.
   *
   * Pass `signerEmails` to target specific signers; omit it to remind every
   * pending signer. Backend enforces a 12-hour cooldown per signer — rate-
   * limited signers are returned in the response `skipped` array, not as a
   * thrown error.
   */
  async remind(
    requestId: string,
    params?: RemindSignatureRequestParams,
  ): Promise<RemindSignatureRequestResponse> {
    const body: { signerEmails?: string[] } = {};
    if (params?.signerEmails !== undefined) {
      if (params.signerEmails.length === 0) {
        throw new ChaindocError('signerEmails must contain at least one email when provided');
      }
      params.signerEmails.forEach((email, i) =>
        assertValidEmail(email, `signerEmails[${i}]`),
      );
      body.signerEmails = params.signerEmails.map((e) => normalizeEmail(e));
    }
    return this.client.post<RemindSignatureRequestResponse>(
      `/api/v1/signatures/requests/${requestId}/remind`,
      body,
    );
  }

  /**
   * Download the audit-trail certificate (PDF) for a signed document version.
   * Accepts both pk_ and sk_ keys.
   */
  async downloadCertificate(versionId: string): Promise<DownloadResult> {
    return this.client.download(`/api/v1/signatures/versions/${versionId}/certificate`);
  }

  /**
   * Download the PAdES-signed PDF for a completed signature request.
   * Accepts both pk_ and sk_ keys.
   */
  async downloadSignedDocument(versionId: string): Promise<DownloadResult> {
    return this.client.download(`/api/v1/signatures/versions/${versionId}/signed-document`);
  }
}

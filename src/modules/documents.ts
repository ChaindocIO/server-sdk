/**
 * Documents Module
 */

import type { DownloadResult, HttpClient } from '../client';
import type {
  AccessEmail,
  CreateDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentRightsParams,
  DocumentResponse,
  GetDocumentResponse,
  GetDocumentVersionsResponse,
  ListDocumentVersionsParams,
  DocumentSearchParams,
  DocumentListResponse,
  DocumentActivityResponse,
  DocumentDownloadsResponse,
  SendPublicLinkParams,
  SendPublicLinkResponse,
  VerifyDocumentParams,
  VerifyDocumentResponse,
} from '../types';
import { normalizeEmail, withNormalizedEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';
import { DocumentComments } from './document-comments';

function normalizeAccessEmails(accessEmails: AccessEmail[] | undefined): AccessEmail[] | undefined {
  return accessEmails?.map(withNormalizedEmail);
}

export class Documents {
  /** Top-level commenting on a document plus reading the comment thread. */
  readonly comments: DocumentComments;

  constructor(private client: HttpClient) {
    this.comments = new DocumentComments(client);
  }

  /**
   * Create a new document
   * Creates document with first version. Set status to "published" to verify in blockchain immediately.
   */
  async create(params: CreateDocumentParams): Promise<DocumentResponse> {
    return this.client.post<DocumentResponse>('/api/v1/documents', {
      ...params,
      accessEmails: normalizeAccessEmails(params.accessEmails),
    });
  }

  /**
   * Update document (creates new version)
   * Set status to "published" to verify in blockchain.
   */
  async update(documentId: string, params: UpdateDocumentParams): Promise<DocumentResponse> {
    return this.client.put<DocumentResponse>(`/api/v1/documents/${documentId}`, params);
  }

  /**
   * Update document access rights
   */
  async updateRights(documentId: string, params: UpdateDocumentRightsParams): Promise<DocumentResponse> {
    return this.client.put<DocumentResponse>(`/api/v1/documents/${documentId}/rights`, {
      ...params,
      accessEmails: normalizeAccessEmails(params.accessEmails),
    });
  }

  /**
   * Verify document in blockchain
   */
  async verify(params: VerifyDocumentParams): Promise<VerifyDocumentResponse> {
    return this.client.post<VerifyDocumentResponse>('/api/v1/documents/verify', params);
  }

  /**
   * Get verification status for a document version
   */
  async getVerificationStatus(versionId: string): Promise<VerifyDocumentResponse> {
    return this.client.get<VerifyDocumentResponse>(`/api/v1/documents/versions/${versionId}/verification`);
  }

  /**
   * Get document details (current version metadata, access type, txtId).
   * Accepts both pk_ and sk_ keys.
   */
  async get(documentId: string): Promise<GetDocumentResponse> {
    return this.client.get<GetDocumentResponse>(`/api/v1/documents/${documentId}`);
  }

  /**
   * Get paginated version history for a document.
   * Accepts both pk_ and sk_ keys.
   */
  async getVersions(
    documentId: string,
    params?: ListDocumentVersionsParams,
  ): Promise<GetDocumentVersionsResponse> {
    const query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));

    const qs = query.toString();
    return this.client.get<GetDocumentVersionsResponse>(
      `/api/v1/documents/${documentId}/versions${qs ? `?${qs}` : ''}`,
    );
  }

  /**
   * Download the binary content of a specific document version.
   * Returns the raw ArrayBuffer plus content metadata (contentType, fileName
   * parsed from Content-Disposition). Accepts both pk_ and sk_ keys.
   */
  async download(versionId: string): Promise<DownloadResult> {
    return this.client.download(`/api/v1/documents/versions/${versionId}/download`);
  }

  /**
   * Preview the binary content of a document version.
   * Identical bytes to `download()` but served inline and logged as a preview
   * rather than a download. Accepts both pk_ and sk_ keys.
   */
  async preview(versionId: string): Promise<DownloadResult> {
    return this.client.download(`/api/v1/documents/versions/${versionId}/preview`);
  }

  /**
   * List documents explicitly shared with the API key owner (direct or role-based
   * access). Accepts both pk_ and sk_ keys.
   */
  async listShared(params?: DocumentSearchParams): Promise<DocumentListResponse> {
    return this.client.get<DocumentListResponse>(
      `/api/v1/documents/shared${buildDocumentQuery(params)}`,
    );
  }

  /**
   * Search documents the API key owner can access, filtered by an optional
   * free-text query and lifecycle status. Accepts both pk_ and sk_ keys.
   */
  async search(params?: DocumentSearchParams): Promise<DocumentListResponse> {
    return this.client.get<DocumentListResponse>(
      `/api/v1/documents/search${buildDocumentQuery(params)}`,
    );
  }

  /**
   * Get the activity log (views, downloads, verification checks) for a document
   * current version. Accepts both pk_ and sk_ keys.
   */
  async getActivity(documentId: string): Promise<DocumentActivityResponse> {
    return this.client.get<DocumentActivityResponse>(
      `/api/v1/documents/${documentId}/activity`,
    );
  }

  /**
   * Get the download log recorded for a document. Accepts both pk_ and sk_ keys.
   */
  async getDownloads(documentId: string): Promise<DocumentDownloadsResponse> {
    return this.client.get<DocumentDownloadsResponse>(
      `/api/v1/documents/${documentId}/downloads`,
    );
  }

  /**
   * Email a link to a public document to the given recipient. The document must
   * have a public access type. The recipient email is validated and normalized
   * client-side before sending.
   */
  async sendPublicLink(
    documentId: string,
    params: SendPublicLinkParams,
  ): Promise<SendPublicLinkResponse> {
    assertValidEmail(params.email, 'email');

    return this.client.post<SendPublicLinkResponse>(
      `/api/v1/documents/${documentId}/send-public-link`,
      { ...params, email: normalizeEmail(params.email) },
    );
  }
}

function buildDocumentQuery(params?: DocumentSearchParams): string {
  if (!params) return '';

  const query = new URLSearchParams();
  if (params.pageNumber !== undefined) query.set('pageNumber', String(params.pageNumber));
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  if (params.search !== undefined) query.set('search', params.search);
  if (params.status !== undefined) query.set('status', params.status);

  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

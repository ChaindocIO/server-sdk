/**
 * Documents Module
 */

import type { HttpClient } from '../client';
import type {
  CreateDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentRightsParams,
  DocumentResponse,
  VerifyDocumentParams,
  VerifyDocumentResponse,
} from '../types';

export class Documents {
  constructor(private client: HttpClient) {}

  /**
   * Create a new document
   * Creates document with first version. Set status to "published" to verify in blockchain immediately.
   */
  async create(params: CreateDocumentParams): Promise<DocumentResponse> {
    return this.client.post<DocumentResponse>('/api/v1/documents', params);
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
    return this.client.put<DocumentResponse>(`/api/v1/documents/${documentId}/rights`, params);
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
}

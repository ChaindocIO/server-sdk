/**
 * Chaindoc Server SDK
 *
 * @example
 * ```typescript
 * import { Chaindoc } from '@chaindoc_io/server-sdk';
 *
 * const chaindoc = new Chaindoc({
 *   secretKey: 'sk_your_secret_key',
 * });
 *
 * // Create a document
 * const doc = await chaindoc.documents.create({
 *   name: 'Contract',
 *   description: 'Service agreement',
 *   media: { type: 'document', key: '/path/to/file.pdf' },
 *   hashtags: ['#contract'],
 *   status: 'published',
 * });
 *
 * // Create signature request
 * const request = await chaindoc.signatures.createRequest({
 *   versionId: doc.document.versions[0].uuid,
 *   recipients: [{ email: 'signer@example.com' }],
 *   deadline: new Date('2025-12-31'),
 *   embeddedFlow: true,
 * });
 *
 * // Create embedded session for frontend
 * const session = await chaindoc.embedded.createSession({
 *   email: 'signer@example.com',
 *   metadata: {
 *     documentId: doc.documentId,
 *     signatureRequestId: request.signatureRequest.uuid,
 *   },
 * });
 *
 * // Pass session.sessionId to frontend
 * ```
 */

import { HttpClient } from "./client";
import { Documents } from "./modules/documents";
import { Signatures } from "./modules/signatures";
import { Embedded } from "./modules/embedded";
import { Media } from "./modules/media";
import { Kyc } from "./modules/kyc";
import type { ChaindocConfig, ApiKeyInfo, HealthCheckResponse } from "./types";

export class Chaindoc {
  private client: HttpClient;

  /**
   * Documents API
   * Create, update, and verify documents
   */
  public readonly documents: Documents;

  /**
   * Signatures API
   * Create signature requests and sign documents
   */
  public readonly signatures: Signatures;

  /**
   * Embedded Sessions API
   * Create sessions for embedded document signing
   */
  public readonly embedded: Embedded;

  /**
   * Media API
   * Upload files for use in documents
   */
  public readonly media: Media;

  /**
   * KYC API
   * Share and verify KYC data
   */
  public readonly kyc: Kyc;

  constructor(config: ChaindocConfig) {
    this.client = new HttpClient(config);

    this.documents = new Documents(this.client);
    this.signatures = new Signatures(this.client);
    this.embedded = new Embedded(this.client);
    this.media = new Media(this.client);
    this.kyc = new Kyc(this.client);
  }

  /**
   * Get current API key information
   */
  async getApiKeyInfo(): Promise<ApiKeyInfo> {
    return this.client.get<ApiKeyInfo>("/api/v1/me");
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.client.get<HealthCheckResponse>("/api/v1/health");
  }
}

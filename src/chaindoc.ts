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
 *   versionId: doc.document.currentVersion.id,
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
 *     signatureRequestId: request.requestId,
 *   },
 * });
 *
 * // Pass session.sessionId to frontend
 * ```
 */

import { HttpClient } from "./client";
import { Documents } from "./modules/documents";
import { Signatures } from "./modules/signatures";
import { Contracts } from "./modules/contracts";
import { Templates } from "./modules/templates";
import { Invoices } from "./modules/invoices";
import { Transactions } from "./modules/transactions";
import { Embedded } from "./modules/embedded";
import { Media } from "./modules/media";
import { Webhooks } from "./modules/webhooks";
import type { ChaindocConfig, ApiKeyInfo, HealthCheckResponse } from "./types";

export class Chaindoc {
  private client: HttpClient;

  /**
   * Webhook verification utilities (static)
   *
   * @example
   * ```typescript
   * const result = Chaindoc.webhooks.verify(rawBody, signature, timestamp, secret);
   * ```
   */
  public static readonly webhooks = Webhooks;

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
   * Contracts API
   * Create, manage, and track contract lifecycle
   */
  public readonly contracts: Contracts;

  /**
   * Templates API
   * Use published templates to generate documents, signature requests, and contracts
   */
  public readonly templates: Templates;

  /**
   * Invoices API
   * Create, send, charge, and inspect contract invoices
   */
  public readonly invoices: Invoices;

  /**
   * Transactions API
   * Inspect payment transactions across contract invoices
   */
  public readonly transactions: Transactions;

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

  constructor(config: ChaindocConfig) {
    this.client = new HttpClient(config);

    this.documents = new Documents(this.client);
    this.signatures = new Signatures(this.client);
    this.contracts = new Contracts(this.client);
    this.templates = new Templates(this.client);
    this.invoices = new Invoices(this.client);
    this.transactions = new Transactions(this.client);
    this.embedded = new Embedded(this.client);
    this.media = new Media(this.client);
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

/**
 * Embedded Sessions Module
 */

import type { HttpClient } from '../client';
import type {
  CreateEmbeddedSessionParams,
  EmbeddedSessionResponse,
} from '../types';
import { normalizeEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';

export class Embedded {
  constructor(private client: HttpClient) {}

  /**
   * Create an embedded session for document signing
   *
   * - Session is valid for 10 minutes
   * - OTP will be sent to the provided email
   * - Use returned sessionId with @chaindoc_io/embed-sdk on frontend
   *
   * @example
   * ```typescript
   * const session = await chaindoc.embedded.createSession({
   *   email: 'signer@example.com',
   *   metadata: {
   *     documentId: 'doc_xxx',
   *     signatureRequestId: 'req_xxx',
   *     returnUrl: 'https://yourapp.com/signing-complete',
   *   },
   * });
   *
   * // Pass session.sessionId to frontend
   * // Frontend uses: sdk.openSignatureFlow({ sessionId: session.sessionId })
   * ```
   */
  async createSession(params: CreateEmbeddedSessionParams): Promise<EmbeddedSessionResponse> {
    assertValidEmail(params.email, 'email');
    return this.client.post<EmbeddedSessionResponse>('/api/v1/embedded/sessions', {
      ...params,
      email: normalizeEmail(params.email),
    });
  }
}

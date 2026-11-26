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
   * No session is given (and no code is mailed) for something there is nothing to sign in:
   * - `400 EMBEDDED_SIGNING_REQUEST_CLOSED` (`status`) — the request is signed, declined, cancelled or expired;
   * - `400 EMBEDDED_CONTRACT_NOT_SIGNABLE` (`status` of the contract) — `contractId` of a contract never sent for signing
   *   (a contract whose request ended answers `EMBEDDED_SIGNING_REQUEST_CLOSED`). Both answered `201` with a session
   *   before the server's November fixes; SDK 3.0.0 did not name them.
   * - `400 NOT_YOUR_TURN` — an earlier signer of an ordered request has not signed yet.
   * - `400 EMBEDDED_SESSION_REQUEST_MISMATCH` — a `contractSigningRequestId`, `signatureRequestId` or `documentId` named
   *   beside `contractId` is not that contract's, or two of them name different requests.
   *
   * **Contracts and amendments.** With `contractId` the session is for the contract's open signing request: its own while
   * the contract is being signed, or an amendment's while one is (`pending_amendment`) — the signer signs or declines the
   * amendment in the window. `contractSigningRequestId` (the `signingRequestId` that `contracts.send` and
   * `agreements.initiateSigning` answer) names the request itself, beside `contractId` or alone.
   *
   * The signing window always asks the signer for a reason before a decline, on a document request too.
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

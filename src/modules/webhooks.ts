/**
 * Webhook Verification Utilities
 *
 * Helpers for verifying webhook signatures and parsing webhook payloads
 * from the Chaindoc API.
 *
 * @example
 * ```typescript
 * import { Chaindoc } from '@chaindoc_io/server-sdk';
 *
 * // In your webhook handler:
 * const result = Chaindoc.webhooks.verify(rawBody, signature, timestamp, secret);
 *
 * if (result.valid) {
 *   console.log('Event:', result.envelope.type);
 *   console.log('Data:', result.envelope.data);
 * }
 * ```
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { WebhookEnvelope, WebhookVerificationResult } from "../types";

/** Maximum age of a webhook delivery before it's considered stale (5 minutes) */
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export class Webhooks {
  /**
   * Verify a webhook signature and parse the envelope.
   *
   * @param rawBody - The raw request body string (NOT parsed JSON)
   * @param signature - Value of the `X-Chaindoc-Signature` header (e.g. "v1=abc123...")
   * @param timestamp - Value of the `X-Chaindoc-Timestamp` header (ISO 8601)
   * @param secret - Your webhook secret from the Chaindoc dashboard
   * @returns Verification result with parsed envelope if valid
   */
  static verify(
    rawBody: string,
    signature: string,
    timestamp: string,
    secret: string
  ): WebhookVerificationResult {
    if (!rawBody || !signature || !timestamp || !secret) {
      return { valid: false };
    }

    // Check timestamp freshness to prevent replay attacks
    const deliveryTime = new Date(timestamp).getTime();
    if (isNaN(deliveryTime)) {
      return { valid: false };
    }

    const age = Math.abs(Date.now() - deliveryTime);
    if (age > MAX_TIMESTAMP_AGE_MS) {
      return { valid: false };
    }

    // Extract hex from "v1=<hex>" format
    const match = signature.match(/^v1=([a-f0-9]+)$/i);
    if (!match || !match[1]) {
      return { valid: false };
    }
    const receivedHex: string = match[1];

    // Compute expected signature: HMAC-SHA256(timestamp.rawBody)
    const signingInput = `${timestamp}.${rawBody}`;
    const expectedHex = createHmac("sha256", secret)
      .update(signingInput)
      .digest("hex");

    // Timing-safe comparison
    if (receivedHex.length !== expectedHex.length) {
      return { valid: false };
    }

    const a = Buffer.from(receivedHex, "hex");
    const b = Buffer.from(expectedHex, "hex");

    if (a.length !== b.length) {
      return { valid: false };
    }

    if (!timingSafeEqual(a, b)) {
      return { valid: false };
    }

    // Parse envelope
    try {
      const envelope: WebhookEnvelope = JSON.parse(rawBody);
      return { valid: true, envelope };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Parse a webhook body without verifying the signature.
   * Use this only when you trust the transport layer (e.g. internal queue).
   */
  static parse<T = Record<string, unknown>>(
    rawBody: string
  ): WebhookEnvelope<T> {
    return JSON.parse(rawBody);
  }
}

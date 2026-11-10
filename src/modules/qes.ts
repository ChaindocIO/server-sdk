/**
 * QES Module (qualified electronic signature on a signature request).
 *
 * Three phases: `promise` (consent, field values, appearance; no crypto), `prepare` (public certificate in,
 * ToBeSigned digest out) and `finalize` (device signature in, PAdES container out). The signing device
 * holds the private key: the SDK refuses to send one. None of these calls is retried automatically.
 */

import { ChaindocError } from '../client';
import type { HttpClient } from '../client';
import type {
  QesFinalizeParams,
  QesFinalizeResponse,
  QesPrepareParams,
  QesPrepareResponse,
  QesPromiseParams,
  QesPromiseResponse,
} from '../types';
import { seg } from '../utils/path';

const PRIVATE_KEY_MARKER = /PRIVATE KEY/i;

function assertPublicPem(value: string, field: string): void {
  if (PRIVATE_KEY_MARKER.test(value)) {
    // Refused locally: key material must never leave the signing device, not even toward the API.
    throw new ChaindocError(`${field} holds private key material: send the public certificate only`);
  }
  if (!value.includes('-----BEGIN CERTIFICATE-----')) {
    throw new ChaindocError(`${field} must be a PEM certificate`);
  }
}

export class Qes {
  constructor(private client: HttpClient) {}

  /** Phase 0 - record the signer's promise on the signer row this key acts for. */
  async promise(requestId: string, params: QesPromiseParams = {}): Promise<QesPromiseResponse> {
    return this.client.post<QesPromiseResponse>(`/api/v1/signatures/qes/${seg(requestId)}/promise`, params, {
      noRetry: true,
    });
  }

  /** Phase 1 - the signer's public certificate in, the bytes the device must sign out. */
  async prepare(requestId: string, params: QesPrepareParams): Promise<QesPrepareResponse> {
    assertPublicPem(params.signerCertPem, 'signerCertPem');
    if (params.chainPem !== undefined) assertPublicPem(params.chainPem, 'chainPem');
    return this.client.post<QesPrepareResponse>(`/api/v1/signatures/qes/${seg(requestId)}/prepare`, params, {
      noRetry: true,
    });
  }

  /** Phase 2 - embed the device signature and finalize the PAdES container. */
  async finalize(requestId: string, params: QesFinalizeParams): Promise<QesFinalizeResponse> {
    return this.client.post<QesFinalizeResponse>(`/api/v1/signatures/qes/${seg(requestId)}/finalize`, params, {
      noRetry: true,
    });
  }
}

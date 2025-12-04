/**
 * KYC Module
 */

import type { HttpClient } from '../client';
import type { ShareKycParams, ShareKycResponse } from '../types';

export class Kyc {
  constructor(private client: HttpClient) {}

  /**
   * Share KYC data for a user
   *
   * Used to pre-verify users via Sumsub share token before creating signature requests.
   *
   * @example
   * ```typescript
   * // With Sumsub share token
   * const result = await chaindoc.kyc.share({
   *   email: 'user@example.com',
   *   shareToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
   * });
   *
   * if (result.success && result.kycData?.verified) {
   *   // User is KYC verified, can proceed with signing
   * }
   * ```
   */
  async share(params: ShareKycParams): Promise<ShareKycResponse> {
    return this.client.post<ShareKycResponse>('/api/v1/kyc/share', params);
  }
}

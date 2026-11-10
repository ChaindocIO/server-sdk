/**
 * Tax Treatments Module: the business's VAT settings an invoice can name.
 */

import type { HttpClient } from '../client';
import type { TaxTreatmentListResponse } from '../types';

export class TaxTreatments {
  constructor(private client: HttpClient) {}

  /** The active treatments (the default is flagged `isDefault`); send an `id` as `taxTreatmentId` on an invoice. */
  async list(): Promise<TaxTreatmentListResponse> {
    return this.client.get<TaxTreatmentListResponse>('/api/v1/tax-treatments');
  }
}

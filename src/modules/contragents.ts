/**
 * Contragents Module: the business's counterparties (its address book).
 */

import type { HttpClient } from '../client';
import type {
  ContragentEnvelope,
  ContragentListResponse,
  CreateContragentParams,
  UpdateContragentParams,
} from '../types';
import { normalizeEmail } from '../utils/normalize-email';
import { seg } from '../utils/path';
import { assertValidEmail } from '../utils/validate-email';

export class Contragents {
  constructor(private client: HttpClient) {}

  /** List the counterparties, each with its billing identity and payment-instruction override. */
  async list(): Promise<ContragentListResponse> {
    return this.client.get<ContragentListResponse>('/api/v1/contragents');
  }

  async get(contragentId: string): Promise<ContragentEnvelope> {
    return this.client.get<ContragentEnvelope>(`/api/v1/contragents/${seg(contragentId)}`);
  }

  /** Create a counterparty. An e-mail already in the address book is refused (409), never reused. */
  async create(params: CreateContragentParams): Promise<ContragentEnvelope> {
    assertValidEmail(params.email, 'email');
    return this.client.post<ContragentEnvelope>('/api/v1/contragents', {
      ...params,
      email: normalizeEmail(params.email),
    });
  }

  /** Change the fields sent (not the e-mail). Applies to invoices issued from now on. */
  async update(contragentId: string, params: UpdateContragentParams): Promise<ContragentEnvelope> {
    return this.client.patch<ContragentEnvelope>(`/api/v1/contragents/${seg(contragentId)}`, params);
  }
}

/**
 * Invoices Module
 */

import type { HttpClient } from '../client';
import type {
  CreateInvoiceParams,
  InvoiceActionResponse,
  InvoiceListParams,
  InvoiceListResponse,
  InvoiceResponse,
  MarkInvoicePaidParams,
  SendInvoiceParams,
} from '../types';

export class Invoices {
  constructor(private client: HttpClient) {}

  /**
   * Create an invoice for a contract.
   */
  async create(contractId: string, params: CreateInvoiceParams): Promise<InvoiceResponse> {
    return this.client.post<InvoiceResponse>(`/api/v1/contracts/${contractId}/invoices`, params);
  }

  /**
   * List invoices for a contract.
   */
  async list(contractId: string, params?: InvoiceListParams): Promise<InvoiceListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (typeof params?.overdue === 'boolean') query.set('overdue', String(params.overdue));
    if (params?.dueDateFrom) query.set('dueDateFrom', params.dueDateFrom);
    if (params?.dueDateTo) query.set('dueDateTo', params.dueDateTo);

    const qs = query.toString();
    return this.client.get<InvoiceListResponse>(
      `/api/v1/contracts/${contractId}/invoices${qs ? `?${qs}` : ''}`,
    );
  }

  /**
   * Get a single invoice by UUID.
   */
  async get(contractId: string, invoiceId: string): Promise<InvoiceResponse> {
    return this.client.get<InvoiceResponse>(`/api/v1/contracts/${contractId}/invoices/${invoiceId}`);
  }

  /**
   * Send a draft invoice to the contragent.
   */
  async send(
    contractId: string,
    invoiceId: string,
    params?: SendInvoiceParams,
  ): Promise<InvoiceActionResponse> {
    return this.client.post<InvoiceActionResponse>(
      `/api/v1/contracts/${contractId}/invoices/${invoiceId}/send`,
      params ?? {},
    );
  }

  /**
   * Charge the default payment method for the invoice.
   */
  async charge(contractId: string, invoiceId: string): Promise<InvoiceActionResponse> {
    return this.client.post<InvoiceActionResponse>(
      `/api/v1/contracts/${contractId}/invoices/${invoiceId}/charge`,
      {},
    );
  }

  /**
   * Mark an invoice as paid for offline/external payments.
   */
  async markPaid(
    contractId: string,
    invoiceId: string,
    params?: MarkInvoicePaidParams,
  ): Promise<InvoiceResponse> {
    return this.client.post<InvoiceResponse>(
      `/api/v1/contracts/${contractId}/invoices/${invoiceId}/mark-paid`,
      params ?? {},
    );
  }
}

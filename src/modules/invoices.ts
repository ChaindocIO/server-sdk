/**
 * Invoices Module
 */

import { seg } from '../utils/path';
import type { DownloadResult, HttpClient } from '../client';
import type {
  CreateCreditNoteParams,
  CreateInvoiceParams,
  CreditNote,
  InvoiceActionResponse,
  InvoiceListAllParams,
  InvoiceListAllResponse,
  InvoiceListParams,
  InvoiceListResponse,
  InvoiceResponse,
  MarkInvoicePaidParams,
  SendInvoiceParams,
  UpdateInvoiceParams,
} from '../types';

export class Invoices {
  constructor(private client: HttpClient) {}

  /**
   * Create an invoice for a contract.
   */
  async create(contractId: string, params: CreateInvoiceParams): Promise<InvoiceResponse> {
    return this.client.post<InvoiceResponse>(`/api/v1/contracts/${seg(contractId)}/invoices`, params);
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
      `/api/v1/contracts/${seg(contractId)}/invoices${qs ? `?${qs}` : ''}`,
    );
  }

  /**
   * List every invoice across all of the contracts of the WORKSPACE the key belongs to, with
   * aggregate status counts. Not scoped to a single contract.
   */
  async listAll(params?: InvoiceListAllParams): Promise<InvoiceListAllResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (typeof params?.overdue === 'boolean') query.set('overdue', String(params.overdue));
    if (params?.dueDateFrom) query.set('dueDateFrom', params.dueDateFrom);
    if (params?.dueDateTo) query.set('dueDateTo', params.dueDateTo);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    return this.client.get<InvoiceListAllResponse>(`/api/v1/invoices${qs ? `?${qs}` : ''}`);
  }

  /**
   * Get a single invoice by UUID.
   */
  async get(contractId: string, invoiceId: string): Promise<InvoiceResponse> {
    return this.client.get<InvoiceResponse>(`/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}`);
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
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}/send`,
      params ?? {},
    );
  }

  /**
   * Charge the default payment method for the invoice.
   */
  async charge(contractId: string, invoiceId: string): Promise<InvoiceActionResponse> {
    return this.client.post<InvoiceActionResponse>(
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}/charge`,
      {},
      { noRetry: true },
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
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}/mark-paid`,
      params ?? {},
      { noRetry: true },
    );
  }

  /**
   * Update a draft invoice. Only provided fields are applied; line items,
   * when supplied, replace the existing set.
   */
  async update(
    contractId: string,
    invoiceId: string,
    params: UpdateInvoiceParams,
  ): Promise<InvoiceResponse> {
    return this.client.patch<InvoiceResponse>(
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}`,
      params,
    );
  }

  /**
   * Cancel a draft, unpaid, or overdue invoice. Voids any open checkout sessions.
   */
  async cancel(contractId: string, invoiceId: string): Promise<InvoiceActionResponse> {
    return this.client.post<InvoiceActionResponse>(
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}/cancel`,
      {},
    );
  }

  /**
   * Download the generated invoice PDF. The PDF exists only once the invoice
   * has been sent. Returns the raw bytes plus content metadata.
   */
  async downloadPdf(contractId: string, invoiceId: string): Promise<DownloadResult> {
    return this.client.download(
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}/pdf`,
    );
  }

  /** List the credit notes issued against an invoice. */
  async listCreditNotes(contractId: string, invoiceId: string): Promise<CreditNote[]> {
    return this.client.get<CreditNote[]>(
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}/credit-notes`,
    );
  }

  /**
   * Credit an issued invoice, in full or in part. The invoice itself is not rewritten; excess already paid
   * is refunded on the original rail. Money: not retried automatically.
   */
  async createCreditNote(
    contractId: string,
    invoiceId: string,
    params: CreateCreditNoteParams,
  ): Promise<CreditNote> {
    return this.client.post<CreditNote>(
      `/api/v1/contracts/${seg(contractId)}/invoices/${seg(invoiceId)}/credit-notes`,
      params,
      { noRetry: true },
    );
  }
}

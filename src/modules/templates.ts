/**
 * Templates Module
 */

import type { DownloadResult, HttpClient } from '../client';
import type {
  CreateContractFromTemplateParams,
  CreateDocumentFromTemplateParams,
  CreateTemplateParams,
  CreateTemplateSignatureRequestParams,
  ListTemplatesParams,
  PreviewTemplateParams,
  PreviewTemplateHtmlResponse,
  PreviewUnsavedPdfParams,
  PublishTemplateParams,
  TemplateContractResponse,
  TemplateDeleteResponse,
  TemplateDocumentResponse,
  TemplateEnvelope,
  TemplateGetResponse,
  TemplateListResponse,
  TemplateSignatureRequestResponse,
  TemplateVersionsResponse,
  UpdateTemplateParams,
} from '../types';
import { withNormalizedEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';

export class Templates {
  constructor(private client: HttpClient) {}

  /**
   * List templates owned by the API key with optional status / search filters.
   */
  async list(params?: ListTemplatesParams): Promise<TemplateListResponse> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    return this.client.get<TemplateListResponse>(`/api/v1/templates${qs ? `?${qs}` : ''}`);
  }

  /**
   * Get the full template detail including its current and last-published
   * versions (variables schema and signer slots inlined).
   */
  async get(templateId: string): Promise<TemplateGetResponse> {
    return this.client.get<TemplateGetResponse>(`/api/v1/templates/${templateId}`);
  }

  /**
   * Get the complete version history for a template. Each version carries
   * its own variables schema and signer slots.
   */
  async getVersions(templateId: string): Promise<TemplateVersionsResponse> {
    return this.client.get<TemplateVersionsResponse>(
      `/api/v1/templates/${templateId}/versions`,
    );
  }

  /**
   * Render a published template and create a draft document.
   */
  async createDocument(
    templateId: string,
    params: CreateDocumentFromTemplateParams,
  ): Promise<TemplateDocumentResponse> {
    return this.client.post<TemplateDocumentResponse>(`/api/v1/templates/${templateId}/documents`, params);
  }

  /**
   * Render a published template and immediately create a signature request.
   */
  async sendForSigning(
    templateId: string,
    params: CreateTemplateSignatureRequestParams,
  ): Promise<TemplateSignatureRequestResponse> {
    params.slotAssignments.forEach((a, i) =>
      assertValidEmail(a?.email, `slotAssignments[${i}].email`),
    );
    return this.client.post<TemplateSignatureRequestResponse>(
      `/api/v1/templates/${templateId}/signature-requests`,
      {
        ...params,
        slotAssignments: params.slotAssignments.map(withNormalizedEmail),
      },
    );
  }

  /**
   * Render a published template and create a contract with an active signing flow.
   */
  async createContract(
    templateId: string,
    params: CreateContractFromTemplateParams,
  ): Promise<TemplateContractResponse> {
    assertValidEmail(params.contragent?.email, 'contragent.email');
    return this.client.post<TemplateContractResponse>(`/api/v1/templates/${templateId}/contracts`, {
      ...params,
      contragent: withNormalizedEmail(params.contragent),
    });
  }

  /**
   * Create a template.
   * The template starts in DRAFT status; publish it before rendering documents.
   */
  async create(params: CreateTemplateParams): Promise<TemplateEnvelope> {
    return this.client.post<TemplateEnvelope>('/api/v1/templates', params);
  }

  /**
   * Update a template. Editing a published template forks a new draft version.
   * Only provided fields are applied.
   */
  async update(templateId: string, params: UpdateTemplateParams): Promise<TemplateEnvelope> {
    return this.client.patch<TemplateEnvelope>(`/api/v1/templates/${templateId}`, params);
  }

  /** Publish a template's current draft version so it can be rendered. */
  async publish(templateId: string, params?: PublishTemplateParams): Promise<TemplateEnvelope> {
    return this.client.post<TemplateEnvelope>(
      `/api/v1/templates/${templateId}/publish`,
      params ?? {},
    );
  }

  /** Archive a template (soft delete — hidden from default listings, not editable). */
  async archive(templateId: string): Promise<TemplateEnvelope> {
    return this.client.post<TemplateEnvelope>(`/api/v1/templates/${templateId}/archive`, {});
  }

  /** Restore an archived template back to DRAFT status. */
  async restore(templateId: string): Promise<TemplateEnvelope> {
    return this.client.post<TemplateEnvelope>(`/api/v1/templates/${templateId}/restore`, {});
  }

  /** Permanently delete a template and all of its versions. */
  async delete(templateId: string): Promise<TemplateDeleteResponse> {
    return this.client.delete<TemplateDeleteResponse>(`/api/v1/templates/${templateId}`);
  }

  /**
   * Render a template to a preview PDF with the supplied variable values.
   * Returns the raw PDF bytes — intended for previews, not storage.
   */
  async previewPdf(
    templateId: string,
    params?: PreviewTemplateParams,
  ): Promise<DownloadResult> {
    return this.client.download(`/api/v1/templates/${templateId}/preview-pdf`, {
      method: 'POST',
      body: params ?? {},
    });
  }

  /**
   * Render a saved template to preview HTML with the supplied variable values.
   */
  async previewHtml(
    templateId: string,
    params?: PreviewTemplateParams,
  ): Promise<PreviewTemplateHtmlResponse> {
    return this.client.post<PreviewTemplateHtmlResponse>(
      `/api/v1/templates/${templateId}/preview-html`,
      params ?? {},
    );
  }

  /**
   * Render ad-hoc Tiptap JSON content directly to a preview PDF, without a
   * saved template. Returns the raw PDF bytes — intended for previews.
   */
  async previewUnsavedPdf(params: PreviewUnsavedPdfParams): Promise<DownloadResult> {
    return this.client.download('/api/v1/templates/preview-unsaved-pdf', {
      method: 'POST',
      body: params,
    });
  }
}

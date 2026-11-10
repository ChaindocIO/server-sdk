/**
 * Templates Module
 */

import type { HttpClient } from '../client';
import type {
  CreateContractFromTemplateParams,
  CreateDocumentFromTemplateParams,
  CreateTemplateParams,
  CreateTemplateSignatureRequestParams,
  ListTemplatesParams,
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
   * Print a published template with `variables` as a draft document (always a draft).
   */
  async createDocument(
    templateId: string,
    params: CreateDocumentFromTemplateParams,
  ): Promise<TemplateDocumentResponse> {
    return this.client.post<TemplateDocumentResponse>(`/api/v1/templates/${templateId}/documents`, params);
  }

  /**
   * Print a published template and send it for signature at once. Every signer slot is filled once by
   * `slotAssignments` (`email`, and the `account` option from `accounts.lookup`).
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
   * Print a published template as the paper of a new contract with `contragent` (and the workspace
   * `contragentAccount` proposed to it) and start its signing. The template must hold exactly two signer
   * slots, assigned the roles `business` and `contragent`.
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
   * Create a template from `content` (`{ version: 2, mode: 'template', doc }`).
   * It starts as a DRAFT held in its working copy; publish it before using it.
   */
  async create(params: CreateTemplateParams): Promise<TemplateEnvelope> {
    return this.client.post<TemplateEnvelope>('/api/v1/templates', params);
  }

  /**
   * Update a non-archived template; only provided fields are applied. `content` goes into the working copy
   * and must name the `revision` it was read at (`get(id).template.workingCopy.revision`); a published
   * version never changes.
   */
  async update(templateId: string, params: UpdateTemplateParams): Promise<TemplateEnvelope> {
    return this.client.patch<TemplateEnvelope>(`/api/v1/templates/${templateId}`, params);
  }

  /** Publish the working copy as the template's next version (pass `revision` to refuse a moved copy). */
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

  /** Restore an archived template: PUBLISHED when it has a published version, DRAFT when it never had one. */
  async restore(templateId: string): Promise<TemplateEnvelope> {
    return this.client.post<TemplateEnvelope>(`/api/v1/templates/${templateId}/restore`, {});
  }

  /** Delete a template for good (not recoverable; documents made from it stay). */
  async delete(templateId: string): Promise<TemplateDeleteResponse> {
    return this.client.delete<TemplateDeleteResponse>(`/api/v1/templates/${templateId}`);
  }
}

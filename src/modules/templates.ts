/**
 * Templates Module
 */

import type { HttpClient } from '../client';
import type {
  CreateContractFromTemplateParams,
  CreateDocumentFromTemplateParams,
  CreateTemplateSignatureRequestParams,
  TemplateContractResponse,
  TemplateDocumentResponse,
  TemplateSignatureRequestResponse,
} from '../types';

export class Templates {
  constructor(private client: HttpClient) {}

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
    return this.client.post<TemplateSignatureRequestResponse>(
      `/api/v1/templates/${templateId}/signature-requests`,
      params,
    );
  }

  /**
   * Render a published template and create a contract with an active signing flow.
   */
  async createContract(
    templateId: string,
    params: CreateContractFromTemplateParams,
  ): Promise<TemplateContractResponse> {
    return this.client.post<TemplateContractResponse>(`/api/v1/templates/${templateId}/contracts`, params);
  }
}

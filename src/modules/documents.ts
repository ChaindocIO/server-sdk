/**
 * Documents Module
 */

import { seg } from '../utils/path';
import type { DownloadResult, HttpClient } from '../client';
import type {
  AccessEmail,
  AddSignatureBlockParams,
  AddSignatureBlockResponse,
  ConvertDocumentParams,
  CreateDocumentFromContentParams,
  CreateDocumentFromStorageParams,
  DocumentContentResponse,
  DocumentConversionResponse,
  GetDocumentContentParams,
  UpdateDocumentTextResponse,
  UpdateDocumentWithContentParams,
  UpdateDocumentWithFileParams,
  UploadChunkedOptions,
  UpdateDocumentRightsParams,
  DocumentResponse,
  GetDocumentResponse,
  GetDocumentVersionsResponse,
  ListDocumentVersionsParams,
  DocumentSearchParams,
  DocumentListResponse,
  DocumentActivityResponse,
  DocumentDownloadsResponse,
  SendPublicLinkParams,
  SendPublicLinkResponse,
  VerifyDocumentParams,
  VerifyDocumentResponse,
} from '../types';
import { normalizeEmail, withNormalizedEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';
import { DocumentComments } from './document-comments';
import { Media } from './media';

function normalizeAccessEmails(accessEmails: AccessEmail[] | undefined): AccessEmail[] | undefined {
  return accessEmails?.map(withNormalizedEmail);
}

export class Documents {
  /** Top-level commenting on a document plus reading the comment thread. */
  readonly comments: DocumentComments;
  private readonly media: Media;

  constructor(private client: HttpClient) {
    this.comments = new DocumentComments(client);
    this.media = new Media(client);
  }

  /**
   * Create a text document directly from `content` (201: the document is made).
   * Signature places are chips in the text; use `mode: 'template'` content to hold fields and signer roles.
   */
  async create(params: CreateDocumentFromContentParams): Promise<DocumentResponse> {
    return this.client.post<DocumentResponse>('/api/v1/documents', {
      ...params,
      accessEmails: normalizeAccessEmails(params.accessEmails),
    });
  }

  /**
   * Convert an uploaded Storage file into a text document, as the app does. The answer is 202 with a
   * conversion (`status: 'converting'`): the document is made when it is ready, always as a DRAFT, and
   * `document.conversion.completed` / `.failed` is sent. Follow it with `conversions.get` or
   * `conversions.wait`.
   *
   * Refused before anything is spent: `STORAGE_LIMIT_REACHED`, `AI_LIMIT_REACHED`, `AI_NOT_IN_PLAN`,
   * `DOCUMENT_FILE_NOT_CONVERTED` (type the converter does not take).
   */
  async createFromStorage(
    params: CreateDocumentFromStorageParams,
  ): Promise<DocumentConversionResponse> {
    return this.client.post<DocumentConversionResponse>('/api/v1/documents/from-storage', {
      ...params,
      status: params.status ?? 'draft',
      accessEmails: normalizeAccessEmails(params.accessEmails),
    });
  }

  /**
   * Chunked-upload a (potentially large) file to Storage and start its conversion into a document.
   * Returns the 202 conversion; wait for it with `chaindoc.conversions.wait(id)`.
   *
   * @example
   * ```typescript
   * const file = new Blob([await readFile('./contract.pdf')], { type: 'application/pdf' });
   * const { conversion } = await chaindoc.documents.createFromFile(file, { name: 'Contract' }, { filename: 'contract.pdf' });
   * const ready = await chaindoc.conversions.wait(conversion.id);
   * ```
   */
  async createFromFile(
    file: Blob,
    params: Omit<CreateDocumentFromStorageParams, 'storageFileId'>,
    options?: UploadChunkedOptions,
  ): Promise<DocumentConversionResponse> {
    const { storageFileId } = await this.media.uploadChunked(file, options);
    return this.createFromStorage({ ...params, storageFileId });
  }

  /**
   * Update a document: the next version from `content` (+ `baseVersionId`, the version you read) answers
   * 200; from a Storage file it is converted asynchronously and answers 202.
   */
  async update(documentId: string, params: UpdateDocumentWithContentParams): Promise<UpdateDocumentTextResponse>;
  async update(documentId: string, params: UpdateDocumentWithFileParams): Promise<DocumentConversionResponse>;
  async update(
    documentId: string,
    params: UpdateDocumentWithContentParams | UpdateDocumentWithFileParams,
  ): Promise<UpdateDocumentTextResponse | DocumentConversionResponse> {
    return this.client.put<UpdateDocumentTextResponse | DocumentConversionResponse>(
      `/api/v1/documents/${seg(documentId)}`,
      params,
    );
  }

  /**
   * Read a version's text with its signer `roles[]` (what `recipients[].role` binds to) and `fields[]`.
   * A version that is a file holds no text: `DOCUMENT_FILE_CONVERTS` - convert it with `convert()`.
   */
  async getContent(
    documentId: string,
    params?: GetDocumentContentParams,
  ): Promise<DocumentContentResponse> {
    const qs = params?.versionId ? `?versionId=${encodeURIComponent(params.versionId)}` : '';
    return this.client.get<DocumentContentResponse>(`/api/v1/documents/${seg(documentId)}/content${qs}`);
  }

  /**
   * Convert a file document's own file into its next version (202). For documents made as a file before
   * documents became text. The old version, its requests and its verification stay.
   */
  async convert(
    documentId: string,
    params?: ConvertDocumentParams,
  ): Promise<DocumentConversionResponse> {
    return this.client.post<DocumentConversionResponse>(
      `/api/v1/documents/${seg(documentId)}/conversion`,
      params ?? {},
    );
  }

  /**
   * Add signer roles with their Signature and Date signed chips at the end of the text (next version), so
   * the document can be sent with `recipients[].role`. A role the text holds already is
   * `SIGNATURE_ROLE_TWICE`; a file document is `DOCUMENT_FILE_CONVERTS`.
   */
  async addSignatureBlock(
    documentId: string,
    params: AddSignatureBlockParams,
  ): Promise<AddSignatureBlockResponse> {
    return this.client.post<AddSignatureBlockResponse>(
      `/api/v1/documents/${seg(documentId)}/signature-block`,
      params,
    );
  }

  /**
   * Update document access rights
   */
  async updateRights(documentId: string, params: UpdateDocumentRightsParams): Promise<DocumentResponse> {
    return this.client.put<DocumentResponse>(`/api/v1/documents/${seg(documentId)}/rights`, {
      ...params,
      accessEmails: normalizeAccessEmails(params.accessEmails),
    });
  }

  /**
   * Verify document in blockchain
   */
  async verify(params: VerifyDocumentParams): Promise<VerifyDocumentResponse> {
    return this.client.post<VerifyDocumentResponse>('/api/v1/documents/verify', params);
  }

  /**
   * Get verification status for a document version
   */
  async getVerificationStatus(versionId: string): Promise<VerifyDocumentResponse> {
    return this.client.get<VerifyDocumentResponse>(`/api/v1/documents/versions/${seg(versionId)}/verification`);
  }

  /**
   * Get document details (current version metadata, access type, txtId).
   * Accepts both pk_ and sk_ keys.
   */
  async get(documentId: string): Promise<GetDocumentResponse> {
    return this.client.get<GetDocumentResponse>(`/api/v1/documents/${seg(documentId)}`);
  }

  /**
   * Get paginated version history for a document.
   * Accepts both pk_ and sk_ keys.
   */
  async getVersions(
    documentId: string,
    params?: ListDocumentVersionsParams,
  ): Promise<GetDocumentVersionsResponse> {
    const query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));

    const qs = query.toString();
    return this.client.get<GetDocumentVersionsResponse>(
      `/api/v1/documents/${seg(documentId)}/versions${qs ? `?${qs}` : ''}`,
    );
  }

  /**
   * Download the binary content of a specific document version.
   * Returns the raw ArrayBuffer plus content metadata (contentType, fileName
   * parsed from Content-Disposition). Accepts both pk_ and sk_ keys.
   */
  async download(versionId: string): Promise<DownloadResult> {
    return this.client.download(`/api/v1/documents/versions/${seg(versionId)}/download`);
  }

  /**
   * Preview the binary content of a document version.
   * Identical bytes to `download()` but served inline and logged as a preview
   * rather than a download. Accepts both pk_ and sk_ keys.
   */
  async preview(versionId: string): Promise<DownloadResult> {
    return this.client.download(`/api/v1/documents/versions/${seg(versionId)}/preview`);
  }

  /**
   * List documents explicitly shared with the key's WORKSPACE (direct or role-based
   * access). Accepts both pk_ and sk_ keys.
   */
  async listShared(params?: DocumentSearchParams): Promise<DocumentListResponse> {
    return this.client.get<DocumentListResponse>(
      `/api/v1/documents/shared${buildDocumentQuery(params)}`,
    );
  }

  /**
   * Search documents the key's WORKSPACE can access, filtered by an optional
   * free-text query and lifecycle status. Accepts both pk_ and sk_ keys.
   */
  async search(params?: DocumentSearchParams): Promise<DocumentListResponse> {
    return this.client.get<DocumentListResponse>(
      `/api/v1/documents/search${buildDocumentQuery(params)}`,
    );
  }

  /**
   * Get the activity log (views, downloads, verification checks) for a document
   * current version. Accepts both pk_ and sk_ keys.
   */
  async getActivity(documentId: string): Promise<DocumentActivityResponse> {
    return this.client.get<DocumentActivityResponse>(
      `/api/v1/documents/${seg(documentId)}/activity`,
    );
  }

  /**
   * Get the download log recorded for a document. Accepts both pk_ and sk_ keys.
   */
  async getDownloads(documentId: string): Promise<DocumentDownloadsResponse> {
    return this.client.get<DocumentDownloadsResponse>(
      `/api/v1/documents/${seg(documentId)}/downloads`,
    );
  }

  /**
   * Email a link to a public document to the given recipient. The document must
   * have a public access type. The recipient email is validated and normalized
   * client-side before sending.
   */
  async sendPublicLink(
    documentId: string,
    params: SendPublicLinkParams,
  ): Promise<SendPublicLinkResponse> {
    assertValidEmail(params.email, 'email');

    return this.client.post<SendPublicLinkResponse>(
      `/api/v1/documents/${seg(documentId)}/send-public-link`,
      { ...params, email: normalizeEmail(params.email) },
    );
  }
}

function buildDocumentQuery(params?: DocumentSearchParams): string {
  if (!params) return '';

  const query = new URLSearchParams();
  if (params.pageNumber !== undefined) query.set('pageNumber', String(params.pageNumber));
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  if (params.search !== undefined) query.set('search', params.search);
  if (params.status !== undefined) query.set('status', params.status);

  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

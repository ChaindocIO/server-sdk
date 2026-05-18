/**
 * Document Comments Submodule
 *
 * Top-level commenting on a document plus reading the comment thread.
 * The public API exposes top-level comments only — replies appear nested
 * under their parent but cannot be created via the API (CommentEntity has
 * no UUID, so individual comments are not addressable).
 */

import type { HttpClient } from '../client';
import type {
  AddCommentResponse,
  CommentListParams,
  CommentListResponse,
  CreateCommentParams,
} from '../types';

export class DocumentComments {
  constructor(private client: HttpClient) {}

  /**
   * Add a top-level comment to a document. Requires an sk_ key and collaborate
   * access to the document.
   */
  async add(documentId: string, params: CreateCommentParams): Promise<AddCommentResponse> {
    return this.client.post<AddCommentResponse>(
      `/api/v1/documents/${documentId}/comments`,
      params,
    );
  }

  /**
   * List a document's top-level comments, each with its nested replies.
   * Accepts both pk_ and sk_ keys.
   */
  async list(documentId: string, params?: CommentListParams): Promise<CommentListResponse> {
    const query = new URLSearchParams();
    if (params?.pageNumber !== undefined) query.set('pageNumber', String(params.pageNumber));
    if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));

    const qs = query.toString();
    return this.client.get<CommentListResponse>(
      `/api/v1/documents/${documentId}/comments${qs ? `?${qs}` : ''}`,
    );
  }
}

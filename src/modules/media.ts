/**
 * Media Module
 */

import type { HttpClient } from '../client';
import type { MediaUploadResponse } from '../types';

export class Media {
  constructor(private client: HttpClient) {}

  /**
   * Upload media files
   *
   * Supported file types:
   * - Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
   * - Images: JPG, JPEG, PNG, GIF, WEBP, SVG
   * - Videos: MP4, AVI, MOV, WMV
   *
   * Use returned media object when creating documents.
   *
   * @example
   * ```typescript
   * import { readFile } from 'fs/promises';
   *
   * const buffer = await readFile('./contract.pdf');
   * const file = new Blob([buffer], { type: 'application/pdf' });
   *
   * const { media } = await chaindoc.media.upload([file]);
   *
   * // Use media[0] when creating document
   * await chaindoc.documents.create({
   *   name: 'Contract',
   *   media: media[0],
   *   // ...
   * });
   * ```
   */
  async upload(files: File[] | Blob[]): Promise<MediaUploadResponse> {
    return this.client.uploadFiles<MediaUploadResponse>('/api/v1/media/upload', files);
  }
}

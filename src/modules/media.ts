/**
 * Media Module
 */

import { ChaindocError, type HttpClient } from '../client';
import type {
  MediaUploadResponse,
  InitChunkedUploadParams,
  InitChunkedUploadResponse,
  ChunkAck,
  ChunkedUploadStatus,
  ChunkedUploadResult,
  UploadChunkedOptions,
} from '../types';

const CHUNKED_PATH = '/api/v1/media/chunked';
const MAX_RESUME_ATTEMPTS = 3;

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

  /** Open a resumable chunked upload session. */
  async initChunkedUpload(
    params: InitChunkedUploadParams,
  ): Promise<InitChunkedUploadResponse> {
    return this.client.post<InitChunkedUploadResponse>(CHUNKED_PATH, params);
  }

  /** Inspect an in-progress chunked upload (current offset for resuming). */
  async getChunkedUploadStatus(uploadId: string): Promise<ChunkedUploadStatus> {
    return this.client.get<ChunkedUploadStatus>(`${CHUNKED_PATH}/${uploadId}`);
  }

  /** Abort an in-progress chunked upload and release its temporary data. */
  async cancelChunkedUpload(uploadId: string): Promise<void> {
    await this.client.delete<void>(`${CHUNKED_PATH}/${uploadId}`);
  }

  /**
   * Resumable chunked upload of a (potentially large) file into the caller's Drive.
   * Streams the file in chunks — no in-memory `/media` buffering, so large uploads
   * don't hit the upstream request timeout. Returns a `storageFileId` you can pass to
   * `documents.createFromStorage()` (or use `documents.createFromFile()` for both steps).
   *
   * Transient failures resume from the server's last acknowledged offset.
   *
   * @example
   * ```typescript
   * const file = new Blob([await readFile('./big-contract.pdf')], { type: 'application/pdf' });
   * const { storageFileId } = await chaindoc.media.uploadChunked(file, { filename: 'big-contract.pdf' });
   * ```
   */
  async uploadChunked(
    file: Blob,
    options?: UploadChunkedOptions,
  ): Promise<ChunkedUploadResult> {
    const totalBytes = file.size;
    const session = await this.initChunkedUpload({
      filename: options?.filename ?? 'upload',
      mimeType: file.type || 'application/octet-stream',
      size: totalBytes,
    });

    const chunkSize = session.chunkSize;
    const chunkPath = `${CHUNKED_PATH}/${session.uploadId}`;
    let offset = 0;
    let resumeAttempts = 0;

    try {
      while (offset < totalBytes) {
        const chunk = file.slice(offset, Math.min(offset + chunkSize, totalBytes));

        let ack: ChunkAck;
        try {
          ack = await this.client.sendChunk<ChunkAck>(chunkPath, chunk, offset);
        } catch (error) {
          const retryable = error instanceof ChaindocError && error.isRetryable;
          if (!retryable || resumeAttempts >= MAX_RESUME_ATTEMPTS) {
            throw error;
          }
          resumeAttempts += 1;
          const status = await this.getChunkedUploadStatus(session.uploadId);
          offset = status.currentOffset;
          continue;
        }

        // Guard against a non-final ack whose offset doesn't advance — without this
        // an off/buggy ack could spin the loop forever re-sending the same slice.
        // (A completion ack always jumps offset to totalBytes, so it's exempt.)
        if (!ack.complete && ack.offset <= offset) {
          throw new ChaindocError(
            `Chunked upload stalled: server offset ${ack.offset} did not advance past ${offset}`,
          );
        }

        offset = ack.offset;
        options?.onProgress?.({
          percent: totalBytes === 0 ? 100 : Math.round((offset / totalBytes) * 100),
          bytesUploaded: offset,
          totalBytes,
        });

        if (ack.complete) {
          if (!ack.storageFileId) {
            throw new ChaindocError('Chunked upload completed without a storageFileId');
          }
          return { storageFileId: ack.storageFileId };
        }
      }

      // Reaching here means every byte was sent but no completion ack arrived.
      throw new ChaindocError('Chunked upload did not complete');
    } catch (error) {
      // Only cancel a genuinely incomplete upload. If all bytes were already sent the
      // upload likely finalized server-side (a lost final ack), and its session is gone
      // — cancelling would just 404, and we must not risk touching a finished upload.
      if (offset < totalBytes) {
        await this.cancelChunkedUpload(session.uploadId).catch(() => undefined);
      }
      throw error;
    }
  }
}

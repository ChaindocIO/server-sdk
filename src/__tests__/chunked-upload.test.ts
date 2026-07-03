import { describe, expect, it, vi } from 'vitest';
import { ChaindocError } from '../client';
import { Media } from '../modules/media';
import { Documents } from '../modules/documents';

function blob(size: number, type = 'application/pdf'): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

describe('Media.uploadChunked', () => {
  it('inits, streams chunks in order, and returns the storageFileId on completion', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        uploadId: 'u1',
        chunkSize: 10,
        expiresAt: 'x',
        uploadUrl: '/api/v1/media/chunked/u1',
      }),
      sendChunk: vi
        .fn()
        .mockResolvedValueOnce({ offset: 10, complete: false })
        .mockResolvedValueOnce({ offset: 20, complete: false })
        .mockResolvedValueOnce({ offset: 25, complete: true, storageFileId: 'sf-1' }),
    };
    const media = new Media(client as any);

    const percents: number[] = [];
    const result = await media.uploadChunked(blob(25), {
      filename: 'a.pdf',
      onProgress: (p) => percents.push(p.percent),
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/media/chunked', {
      filename: 'a.pdf',
      mimeType: 'application/pdf',
      size: 25,
    });
    expect(client.sendChunk).toHaveBeenCalledTimes(3);
    // Offsets sent: 0, 10, 20 (third chunk is the 5-byte tail).
    expect(client.sendChunk.mock.calls.map((c: unknown[]) => c[2])).toEqual([0, 10, 20]);
    expect(result).toEqual({ storageFileId: 'sf-1' });
    expect(percents.at(-1)).toBe(100);
  });

  it('resumes from the server offset after a transient chunk failure', async () => {
    const transient = new ChaindocError('boom', 503, undefined, true);
    const client = {
      post: vi.fn().mockResolvedValue({ uploadId: 'u1', chunkSize: 10, expiresAt: 'x', uploadUrl: '' }),
      get: vi.fn().mockResolvedValue({ uploadId: 'u1', currentOffset: 0, totalSize: 15, expiresAt: 'x' }),
      sendChunk: vi
        .fn()
        .mockRejectedValueOnce(transient) // first attempt fails
        .mockResolvedValueOnce({ offset: 10, complete: false }) // resumed from 0
        .mockResolvedValueOnce({ offset: 15, complete: true, storageFileId: 'sf-2' }),
    };
    const media = new Media(client as any);

    const result = await media.uploadChunked(blob(15));

    expect(client.get).toHaveBeenCalledWith('/api/v1/media/chunked/u1');
    expect(result).toEqual({ storageFileId: 'sf-2' });
  });

  it('cancels the session and rethrows on a non-retryable failure', async () => {
    const fatal = new ChaindocError('bad request', 400, undefined, false);
    const client = {
      post: vi.fn().mockResolvedValue({ uploadId: 'u1', chunkSize: 10, expiresAt: 'x', uploadUrl: '' }),
      delete: vi.fn().mockResolvedValue(undefined),
      sendChunk: vi.fn().mockRejectedValue(fatal),
    };
    const media = new Media(client as any);

    await expect(media.uploadChunked(blob(15))).rejects.toBe(fatal);
    expect(client.delete).toHaveBeenCalledWith('/api/v1/media/chunked/u1');
  });

  it('bails (no infinite loop) if a non-final ack offset never advances', async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ uploadId: 'u1', chunkSize: 10, expiresAt: 'x', uploadUrl: '' }),
      delete: vi.fn().mockResolvedValue(undefined),
      sendChunk: vi.fn().mockResolvedValue({ offset: 0, complete: false }), // never advances
    };
    const media = new Media(client as any);

    await expect(media.uploadChunked(blob(25))).rejects.toThrow(/stalled/);
    expect(client.sendChunk).toHaveBeenCalledTimes(1);
    expect(client.delete).toHaveBeenCalledWith('/api/v1/media/chunked/u1');
  });
});

describe('Documents.createFromStorage / createFromFile', () => {
  it('createFromStorage posts to the from-storage endpoint with the storageFileId', async () => {
    const client = { post: vi.fn().mockResolvedValue({ id: 'doc-1' }) };
    const documents = new Documents(client as any);

    await documents.createFromStorage({
      storageFileId: 'sf-1',
      name: 'Doc',
      description: 'd',
      meta: [],
      hashtags: [],
      status: 'draft',
      accessEmails: [{ email: 'user@example.com', level: 'read' }],
    });

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/documents/from-storage',
      expect.objectContaining({
        storageFileId: 'sf-1',
        accessEmails: [{ email: 'user@example.com', level: 'read' }],
      }),
    );
  });

  it('createFromFile chunk-uploads then creates a document from the resulting storageFileId', async () => {
    const client = {
      post: vi
        .fn()
        .mockResolvedValueOnce({ uploadId: 'u1', chunkSize: 100, expiresAt: 'x', uploadUrl: '' }) // init
        .mockResolvedValueOnce({ id: 'doc-9' }), // from-storage
      sendChunk: vi.fn().mockResolvedValue({ offset: 5, complete: true, storageFileId: 'sf-9' }),
    };
    const documents = new Documents(client as any);

    const doc = await documents.createFromFile(blob(5), {
      name: 'D',
      description: 'd',
      meta: [],
      hashtags: [],
      status: 'draft',
    });

    expect(client.sendChunk).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/documents/from-storage',
      expect.objectContaining({ storageFileId: 'sf-9' }),
    );
    expect(doc).toEqual({ id: 'doc-9' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ChaindocError } from '../client';
import { Documents } from '../modules/documents';

describe('Documents module read-surface', () => {
  it('get hits the detail endpoint with the document UUID', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.get('doc-uuid');

    expect(client.get).toHaveBeenCalledWith('/api/v1/documents/doc-uuid');
  });

  it('getVersions appends pageNumber/pageSize when supplied', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.getVersions('doc-uuid');
    await documents.getVersions('doc-uuid', { pageNumber: 2, pageSize: 25 });

    expect(client.get).toHaveBeenNthCalledWith(1, '/api/v1/documents/doc-uuid/versions');
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/documents/doc-uuid/versions?pageNumber=2&pageSize=25',
    );
  });

  it('download delegates to the binary download path', async () => {
    const fakeData = new ArrayBuffer(8);
    const client = {
      download: vi.fn().mockResolvedValue({
        data: fakeData,
        contentType: 'application/pdf',
        fileName: 'contract.pdf',
      }),
    };
    const documents = new Documents(client as any);

    const result = await documents.download('version-uuid');

    expect(client.download).toHaveBeenCalledWith(
      '/api/v1/documents/versions/version-uuid/download',
    );
    expect(result).toEqual({
      data: fakeData,
      contentType: 'application/pdf',
      fileName: 'contract.pdf',
    });
  });

  it('preview delegates to the inline preview path', async () => {
    const fake = { data: new ArrayBuffer(4), contentType: 'application/pdf' };
    const client = { download: vi.fn().mockResolvedValue(fake) };
    const documents = new Documents(client as any);

    const result = await documents.preview('version-uuid');

    expect(client.download).toHaveBeenCalledWith(
      '/api/v1/documents/versions/version-uuid/preview',
    );
    expect(result).toBe(fake);
  });
});

describe('Documents module analytics-surface', () => {
  it('listShared hits the shared route with no query when called without params', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.listShared();

    expect(client.get).toHaveBeenCalledWith('/api/v1/documents/shared');
  });

  it('listShared serializes pagination, search and status filters', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.listShared({ pageNumber: 2, pageSize: 25, search: 'nda', status: 'draft' });

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/documents/shared?pageNumber=2&pageSize=25&search=nda&status=draft',
    );
  });

  it('search hits the search route and serializes the query', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.search();
    await documents.search({ search: 'contract', status: 'published' });

    expect(client.get).toHaveBeenNthCalledWith(1, '/api/v1/documents/search');
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/documents/search?search=contract&status=published',
    );
  });

  it('getActivity hits the activity route with the document UUID', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.getActivity('doc-uuid');

    expect(client.get).toHaveBeenCalledWith('/api/v1/documents/doc-uuid/activity');
  });

  it('getDownloads hits the downloads route with the document UUID', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.getDownloads('doc-uuid');

    expect(client.get).toHaveBeenCalledWith('/api/v1/documents/doc-uuid/downloads');
  });
});

describe('Documents module comments + distribution', () => {
  it('comments.add POSTs the content to the comments route', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.comments.add('doc-uuid', { content: 'Looks good.' });

    expect(client.post).toHaveBeenCalledWith('/api/v1/documents/doc-uuid/comments', {
      content: 'Looks good.',
    });
  });

  it('comments.list hits the comments route, with and without pagination', async () => {
    const client = { get: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.comments.list('doc-uuid');
    await documents.comments.list('doc-uuid', { pageNumber: 2, pageSize: 25 });

    expect(client.get).toHaveBeenNthCalledWith(1, '/api/v1/documents/doc-uuid/comments');
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/documents/doc-uuid/comments?pageNumber=2&pageSize=25',
    );
  });

  it('sendPublicLink normalizes the recipient email before sending', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.sendPublicLink('doc-uuid', {
      email: '  Recipient@Example.COM  ',
      text: 'Please review.',
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/documents/doc-uuid/send-public-link', {
      email: 'recipient@example.com',
      text: 'Please review.',
    });
  });

  it('sendPublicLink throws before sending when the email is malformed', async () => {
    const client = { post: vi.fn() };
    const documents = new Documents(client as any);

    await expect(
      documents.sendPublicLink('doc-uuid', { email: 'not-an-email' }),
    ).rejects.toThrow(ChaindocError);
    expect(client.post).not.toHaveBeenCalled();
  });
});

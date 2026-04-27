import { describe, expect, it, vi } from 'vitest';
import { Contracts } from '../modules/contracts';
import { Documents } from '../modules/documents';
import { Embedded } from '../modules/embedded';
import { Signatures } from '../modules/signatures';
import { Templates } from '../modules/templates';
import {
  normalizeEmail,
  withNormalizedEmail,
  withNormalizedSignerEmail,
} from '../utils/normalize-email';

describe('normalizeEmail util', () => {
  it('trims and lowercases strings', () => {
    expect(normalizeEmail('  Mixed@Case.COM ')).toBe('mixed@case.com');
  });

  it('passes through nullish values', () => {
    expect(normalizeEmail(undefined)).toBeUndefined();
    expect(normalizeEmail(null)).toBeNull();
  });

  it('does not mutate the source object when wrapping email', () => {
    const source = { email: 'A@B.com', extra: 1 };
    const out = withNormalizedEmail(source);
    expect(out).not.toBe(source);
    expect(out.email).toBe('a@b.com');
    expect(source.email).toBe('A@B.com');
    expect(out.extra).toBe(1);
  });

  it('does not mutate the source object when wrapping signerEmail', () => {
    const source = { signerEmail: 'A@B.com', fieldType: 'signature' };
    const out = withNormalizedSignerEmail(source);
    expect(out).not.toBe(source);
    expect(out.signerEmail).toBe('a@b.com');
    expect(source.signerEmail).toBe('A@B.com');
  });
});

describe('SDK modules normalize emails on the wire', () => {
  it('signatures.createRequest normalizes recipients and field signerEmail without mutating input', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const signatures = new Signatures(client as any);
    const recipients = [
      { email: 'Owner@Example.com', signingMethod: 'delegated' as const },
      { email: 'Counterparty@Example.com', signingMethod: 'embedded' as const },
    ];
    const fields = [
      {
        signerEmail: 'Owner@Example.com',
        fieldType: 'signature' as const,
        pageIndex: 0,
        xPct: 0,
        yPct: 0,
        wPct: 0.1,
        hPct: 0.1,
      },
    ];

    await signatures.createRequest({
      versionId: 'v',
      recipients,
      fields,
      deadline: new Date('2026-04-30T00:00:00.000Z'),
    });

    expect(client.post).toHaveBeenCalledWith('/api/v1/signatures/requests', {
      versionId: 'v',
      recipients: [
        { email: 'owner@example.com', signingMethod: 'delegated' },
        { email: 'counterparty@example.com', signingMethod: 'embedded' },
      ],
      fields: [
        expect.objectContaining({ signerEmail: 'owner@example.com' }),
      ],
      deadline: '2026-04-30T00:00:00.000Z',
    });
    expect(recipients[0]?.email).toBe('Owner@Example.com');
    expect(fields[0]?.signerEmail).toBe('Owner@Example.com');
  });

  it('embedded.createSession lowercases the email payload', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const embedded = new Embedded(client as any);
    const params = { email: '  Signer@Example.com ', metadata: { documentId: 'd' } };

    await embedded.createSession(params);

    expect(client.post).toHaveBeenCalledWith('/api/v1/embedded/sessions', {
      email: 'signer@example.com',
      metadata: { documentId: 'd' },
    });
    expect(params.email).toBe('  Signer@Example.com ');
  });

  it('contracts.create normalizes contragent.email without mutating input', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const contracts = new Contracts(client as any);
    const params = {
      documentId: 'doc',
      title: 't',
      contragent: { email: 'C@C.com', name: 'Acme' },
    };

    await contracts.create(params);

    const body = client.post.mock.calls[0]?.[1] as { contragent: { email: string; name: string } };
    expect(body.contragent.email).toBe('c@c.com');
    expect(body.contragent.name).toBe('Acme');
    expect(params.contragent.email).toBe('C@C.com');
  });

  it('templates.sendForSigning normalizes slot assignments without mutating input', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const templates = new Templates(client as any);
    const slotAssignments = [
      { signerKey: 'a', email: 'A@Site.com' },
      { signerKey: 'b', email: 'B@Site.com' },
    ];

    await templates.sendForSigning('tmpl', {
      documentName: 'n',
      variables: {},
      slotAssignments,
      deadline: new Date('2026-04-30T00:00:00.000Z'),
    });

    const body = client.post.mock.calls[0]?.[1] as { slotAssignments: Array<{ email: string }> };
    expect(body.slotAssignments.map((s) => s.email)).toEqual(['a@site.com', 'b@site.com']);
    expect(slotAssignments[0]?.email).toBe('A@Site.com');
  });

  it('templates.createContract normalizes contragent.email', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const templates = new Templates(client as any);
    const params = {
      variables: {},
      slotAssignments: [],
      title: 't',
      contragent: { email: 'CO@C.com' },
      deadline: new Date('2026-04-30T00:00:00.000Z'),
    };

    await templates.createContract('tmpl', params);

    const body = client.post.mock.calls[0]?.[1] as { contragent: { email: string } };
    expect(body.contragent.email).toBe('co@c.com');
    expect(params.contragent.email).toBe('CO@C.com');
  });

  it('documents.create / updateRights normalize accessEmails entries', async () => {
    const client = { post: vi.fn().mockResolvedValue({}), put: vi.fn().mockResolvedValue({}) };
    const documents = new Documents(client as any);

    await documents.create({
      name: 'n',
      description: '',
      media: { url: '', mimeType: 'application/pdf', size: 1 },
      meta: [],
      hashtags: [],
      status: 'draft',
      accessEmails: [{ email: 'X@Y.com', level: 'read' }],
    } as any);
    const createBody = client.post.mock.calls[0]?.[1] as {
      accessEmails: Array<{ email: string; level: string }>;
    };
    expect(createBody.accessEmails[0]).toEqual({ email: 'x@y.com', level: 'read' });

    await documents.updateRights('doc', {
      accessType: 'restricted',
      accessEmails: [{ email: 'X@Y.com', level: 'write' }],
    });
    const rightsBody = client.put.mock.calls[0]?.[1] as {
      accessEmails: Array<{ email: string; level: string }>;
    };
    expect(rightsBody.accessEmails[0]).toEqual({ email: 'x@y.com', level: 'write' });
  });
});

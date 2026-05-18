import { describe, expect, it, vi } from 'vitest';
import { ChaindocError } from '../client';
import { Contracts } from '../modules/contracts';
import { Embedded } from '../modules/embedded';
import { Signatures } from '../modules/signatures';
import { Templates } from '../modules/templates';
import { assertValidEmail, isValidEmail } from '../utils/validate-email';

describe('validateEmail util', () => {
  it('accepts common email values, including values with surrounding whitespace', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('  User.Name+tag@Sub.Example.co  ')).toBe(true);
  });

  it('rejects malformed or non-string values', () => {
    expect(isValidEmail('missing-at.example.com')).toBe(false);
    expect(isValidEmail('user@example')).toBe(false);
    expect(isValidEmail('first last@example.com')).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });

  it('throws ChaindocError with field context', () => {
    expect(() => assertValidEmail('bad-email', 'recipients[0].email')).toThrowError(
      ChaindocError,
    );
    expect(() => assertValidEmail('bad-email', 'recipients[0].email')).toThrow(
      'recipients[0].email',
    );
  });
});

describe('SDK modules validate email fields before sending requests', () => {
  it('embedded.createSession rejects invalid email without posting', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const embedded = new Embedded(client as any);

    await expect(
      embedded.createSession({ email: 'bad-email', metadata: { documentId: 'doc' } }),
    ).rejects.toThrow('email');
    expect(client.post).not.toHaveBeenCalled();
  });

  it('signatures.createRequest rejects invalid recipient email without posting', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const signatures = new Signatures(client as any);

    await expect(
      signatures.createRequest({
        versionId: 'version-uuid',
        recipients: [{ email: 'bad-email', signingMethod: 'embedded' }],
        deadline: new Date('2026-04-30T00:00:00.000Z'),
      }),
    ).rejects.toThrow('recipients[0].email');
    expect(client.post).not.toHaveBeenCalled();
  });

  it('signatures.createRequest rejects invalid field signer email without posting', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const signatures = new Signatures(client as any);

    await expect(
      signatures.createRequest({
        versionId: 'version-uuid',
        recipients: [{ email: 'owner@example.com', signingMethod: 'delegated' }],
        fields: [
          {
            signerEmail: 'bad-email',
            fieldType: 'signature',
            pageIndex: 0,
            xPct: 0.1,
            yPct: 0.2,
            wPct: 0.25,
            hPct: 0.05,
          },
        ],
        deadline: new Date('2026-04-30T00:00:00.000Z'),
      }),
    ).rejects.toThrow('fields[0].signerEmail');
    expect(client.post).not.toHaveBeenCalled();
  });

  it('contracts.create rejects invalid contragent email without posting', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const contracts = new Contracts(client as any);

    await expect(
      contracts.create({
        documentId: 'doc-uuid',
        title: 'MSA',
        contragent: { email: 'bad-email' },
      }),
    ).rejects.toThrow('contragent.email');
    expect(client.post).not.toHaveBeenCalled();
  });

  it('templates.sendForSigning rejects invalid slot email without posting', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const templates = new Templates(client as any);

    await expect(
      templates.sendForSigning('template-uuid', {
        documentName: 'Generated NDA',
        variables: {},
        slotAssignments: [{ signerKey: 'party_a', email: 'bad-email' }],
        deadline: new Date('2026-04-30T00:00:00.000Z'),
      }),
    ).rejects.toThrow('slotAssignments[0].email');
    expect(client.post).not.toHaveBeenCalled();
  });

  it('templates.createContract rejects invalid contragent email without posting', async () => {
    const client = { post: vi.fn().mockResolvedValue({}) };
    const templates = new Templates(client as any);

    await expect(
      templates.createContract('template-uuid', {
        variables: {},
        slotAssignments: [{ signerKey: 'party_a', role: 'business' }],
        title: 'Generated MSA',
        contragent: { email: 'bad-email' },
        deadline: new Date('2026-04-30T00:00:00.000Z'),
      }),
    ).rejects.toThrow('contragent.email');
    expect(client.post).not.toHaveBeenCalled();
  });
});

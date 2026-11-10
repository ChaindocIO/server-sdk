import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chaindoc } from '../chaindoc';

const SNAPSHOT_PATH = path.resolve(__dirname, '../../references/public-api.snapshot.json');

/**
 * Every public operation of the contract is reachable through the SDK, or named here as deliberately not
 * wrapped. The SDK is exercised against a recording fetch; what it calls is matched to the snapshot.
 */
const NOT_WRAPPED: Array<{ prefix: string; reason: string }> = [
  { prefix: '/api/v1/pipedrive/', reason: "the Pipedrive app's own lane (its OAuth and deal routes), not an integrator API" },
  {
    prefix: '/api/v1/embedded/',
    reason:
      'served to the signer inside the embed (embed-sdk / websdk-ui) with a session, not called with a server key; `POST /embedded/sessions` is wrapped as embedded.createSession',
  },
];
const WRAPPED_EMBEDDED = new Set(['POST /api/v1/embedded/sessions']);

type Op = string;

function operationsOf(snapshot: { paths: Record<string, Record<string, unknown>> }): Op[] {
  const ops: Op[] = [];
  for (const [route, methods] of Object.entries(snapshot.paths)) {
    for (const method of Object.keys(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) ops.push(`${method.toUpperCase()} ${route}`);
    }
  }
  return ops;
}

function matchTemplate(templates: string[], method: string, url: string): string | undefined {
  const pathOnly = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? '';
  const candidates = templates
    .filter((t) => t.startsWith(`${method} `))
    .map((t) => ({ t, route: t.slice(method.length + 1) }))
    .filter(({ route }) => new RegExp(`^${route.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(pathOnly))
    .sort((a, b) => (a.route.match(/\{/g)?.length ?? 0) - (b.route.match(/\{/g)?.length ?? 0));
  return candidates[0]?.t;
}

describe('public API coverage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('every public operation is reachable through the SDK or named as deliberately not wrapped', async () => {
    const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    const all = operationsOf(snapshot);
    const seen: Array<{ method: string; url: string }> = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        seen.push({ method, url: String(input) });
        const url = String(input);
        let body: unknown = {};
        if (method === 'POST' && url.endsWith('/media/chunked')) body = { uploadId: 'u1', chunkSize: 100, expiresAt: 'x', uploadUrl: '' };
        if (method === 'PATCH' && url.includes('/media/chunked/')) body = { offset: 5, complete: true, storageFileId: 'sf-1' };
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }),
    );

    const c = new Chaindoc({ secretKey: 'sk_test', retry: { maxRetries: 0 } });
    const id = 'id-1';
    const email = 'a@example.com';
    const deadline = new Date('2027-01-01T00:00:00Z');
    const content = { version: 2 as const, mode: 'template' as const, doc: { type: 'doc' } };
    const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
    const blob = new Blob(['hello']);
    const calls: Array<() => Promise<unknown>> = [
      () => c.getApiKeyInfo(),
      () => c.healthCheck(),
      () => c.accounts.lookup({ emails: [email] }),
      // documents
      () => c.documents.create({ name: 'n', content, status: 'draft' }),
      () => c.documents.createFromStorage({ storageFileId: id, name: 'n' }),
      () => c.documents.createFromFile(blob, { name: 'n' }),
      () => c.documents.update(id, { name: 'n', content, baseVersionId: 'v', status: 'draft' }),
      () => c.documents.get(id),
      () => c.documents.getContent(id),
      () => c.documents.convert(id),
      () => c.documents.addSignatureBlock(id, { roles: [{ key: 'a', name: 'A' }] }),
      () => c.documents.updateRights(id, { accessType: 'team' }),
      () => c.documents.verify({ versionId: id } as never),
      () => c.documents.getVerificationStatus(id),
      () => c.documents.getVersions(id),
      () => c.documents.download(id),
      () => c.documents.preview(id),
      () => c.documents.listShared(),
      () => c.documents.search(),
      () => c.documents.getActivity(id),
      () => c.documents.getDownloads(id),
      () => c.documents.sendPublicLink(id, { email }),
      () => c.documents.comments.add(id, { content: 'hi' } as never),
      () => c.documents.comments.list(id),
      () => c.conversions.get(id),
      // media
      () => c.media.upload([blob]),
      () => c.media.initChunkedUpload({ filename: 'f', mimeType: 'text/plain', size: 5 }),
      () => c.media.getChunkedUploadStatus(id),
      () => c.media.cancelChunkedUpload(id),
      // signatures
      () => c.signatures.createRequest({ versionId: id, recipients: [{ email, role: 'a' }], deadline }),
      () => c.signatures.getRequestStatus(id),
      () => c.signatures.getMyRequests(),
      () => c.signatures.editRequest(id, { signerId: id, recipient: email }),
      () => c.signatures.sign({ requestId: id, signatureId: 1 }),
      () => c.signatures.getSignatures(),
      () => c.signatures.createSignature({ media: { type: 'image' } as never }),
      () => c.signatures.validatePdfSignatures(blob),
      () => c.signatures.cancel(id),
      () => c.signatures.resend(id),
      () => c.signatures.remind(id),
      () => c.signatures.downloadCertificate(id),
      () => c.signatures.downloadSignedDocument(id),
      () => c.signatures.qes.promise(id),
      () => c.signatures.qes.prepare(id, { signerCertPem: pem }),
      () => c.signatures.qes.finalize(id, { sessionId: 's', signatureValueB64: 'AA==' }),
      // templates
      () => c.templates.list(),
      () => c.templates.create({ name: 'n', category: 'nda', content }),
      () => c.templates.get(id),
      () => c.templates.update(id, { content, revision: 1 }),
      () => c.templates.delete(id),
      () => c.templates.publish(id),
      () => c.templates.archive(id),
      () => c.templates.restore(id),
      () => c.templates.getVersions(id),
      () => c.templates.createDocument(id, { documentName: 'n', variables: {} }),
      () => c.templates.createContract(id, { title: 't', variables: {}, slotAssignments: [], contragent: { email }, deadline }),
      () => c.templates.sendForSigning(id, { documentName: 'n', variables: {}, slotAssignments: [{ signerKey: 'a', email }], deadline }),
      // contracts
      () => c.contracts.list(),
      () => c.contracts.create({ documentId: id, title: 't', contragent: { email } }),
      () => c.contracts.createEmpty({ title: 't', contragentEmail: email }),
      () => c.contracts.createMinimal({ documentId: id, title: 't', contragentEmail: email }),
      () => c.contracts.import({ documentId: id, title: 't', contragentEmail: email }),
      () => c.contracts.get(id),
      () => c.contracts.update(id, { title: 't' }),
      () => c.contracts.delete(id),
      () => c.contracts.attachDocument(id, { documentId: id }),
      () => c.contracts.getStats(id),
      () => c.contracts.getStatus(id),
      () => c.contracts.getActivities(id),
      () => c.contracts.addPaymentSetup(id, {} as never),
      () => c.contracts.send(id),
      () => c.contracts.cancel(id),
      () => c.contracts.terminate(id, {} as never),
      () => c.contracts.setupRecurring(id, {} as never),
      () => c.contracts.resendRecurringApproval(id),
      () => c.contracts.cancelRecurringApproval(id),
      () => c.contracts.setPaymentInstruction(id, null),
      () => c.contracts.setStripePayment(id, { stripePaymentAllowed: false }),
      () => c.contracts.listSigningRequests(id),
      () => c.contracts.getSigningRequest(id, id),
      () => c.contracts.resendSigningRequest(id, id),
      () => c.contracts.cancelSigningRequest(id, id),
      () => c.contracts.businessSign(id, id, { signatureHash: 'h' }),
      () => c.contracts.termination.get(id),
      () => c.contracts.termination.getStatus(id),
      () => c.contracts.termination.getHistory(id),
      () => c.contracts.termination.approve(id),
      () => c.contracts.termination.reject(id, { reason: 'r' } as never),
      () => c.contracts.termination.cancel(id),
      () => c.contracts.paymentTerms.list(id),
      () => c.contracts.paymentTerms.create(id, {} as never),
      () => c.contracts.paymentTerms.update(id, id, {}),
      () => c.contracts.paymentTerms.delete(id, id),
      () => c.contracts.agreements.list(id),
      () => c.contracts.agreements.create(id, {} as never),
      () => c.contracts.agreements.get(id, id),
      () => c.contracts.agreements.delete(id, id),
      () => c.contracts.agreements.initiateSigning(id, id),
      // invoices, transactions, money
      () => c.invoices.create(id, { title: 't', amount: '1.00', dueDate: '2027-01-01' }),
      () => c.invoices.list(id),
      () => c.invoices.listAll(),
      () => c.invoices.get(id, id),
      () => c.invoices.update(id, id, { title: 't' }),
      () => c.invoices.send(id, id),
      () => c.invoices.charge(id, id),
      () => c.invoices.markPaid(id, id),
      () => c.invoices.cancel(id, id),
      () => c.invoices.downloadPdf(id, id),
      () => c.invoices.listCreditNotes(id, id),
      () => c.invoices.createCreditNote(id, id, { lines: [{ description: 'd', quantity: 1, unitPrice: '1.00' }] }),
      () => c.transactions.listByContract(id),
      () => c.transactions.get(id),
      () => c.transactions.getPaymentMix({ from: '2026-01-01', to: '2026-12-31' }),
      () => c.transactions.getFeeEstimate({ amount: 1, currency: 'EUR' }),
      () => c.contragents.list(),
      () => c.contragents.get(id),
      () => c.contragents.create({ email }),
      () => c.contragents.update(id, { name: 'n' }),
      () => c.paymentInstructions.list(),
      () => c.paymentInstructions.create({ type: 'other', instructions: 'pay' }),
      () => c.paymentInstructions.assignToContragent({ contragentEmail: email, paymentInstructionId: null }),
      () => c.taxTreatments.list(),
      // embedded sessions
      () => c.embedded.createSession({ email, metadata: { documentId: id } }),
      // processes
      () => c.processes.list(),
      () => c.processes.getEntry('p', 'e'),
      () => c.processes.start('p', 'e', { externalId: 'x', expectedVersionUuid: 'v' }),
      () => c.processes.getCase(id),
      () => c.processes.getEvents(id),
      () => c.processes.getData(id),
      () => c.processes.getMaterials(id),
      () => c.processes.openMaterial(id, id),
      () => c.processes.getThumbnail(id, id),
      () => c.processes.exportData(id),
      () => c.processes.resubmit(id, { commandKey: 'k', expectedVersionUuid: 'v' } as never),
      () => c.processes.beginIntake('p', 'e', { expectedVersionUuid: 'v', fieldId: 'f', file: { name: 'a', mimeType: 'text/plain', size: 1 } }),
      () => c.processes.getIntake('p', 'e', id),
      () => c.processes.abandonIntake('p', 'e', id),
      () => c.processes.uploadIntake('p', 'e', id, new Uint8Array([1])),
      () => c.processes.uploadIntakeChunk('p', 'e', id, new Uint8Array([1]), 0),
      () => c.processes.respond(id, { attemptNumber: 1, deliveryUuid: 'd', resultCode: 'ok', sourceEventId: 's', stepUuid: 't' }, 'secret'),
    ];

    for (const call of calls) await call();

    const covered = new Set<Op>();
    for (const { method, url } of seen) {
      const hit = matchTemplate(all, method, url);
      expect(hit, `SDK called ${method} ${url}, which is not in the contract`).toBeDefined();
      if (hit) covered.add(hit);
    }

    const uncovered = all.filter((op) => {
      if (covered.has(op)) return false;
      if (WRAPPED_EMBEDDED.has(op)) return true;
      const route = op.slice(op.indexOf(' ') + 1);
      return !NOT_WRAPPED.some((n) => route.startsWith(n.prefix));
    });
    expect(uncovered, 'public operations the SDK does not reach and nobody named as not wrapped').toEqual([]);
  });
});

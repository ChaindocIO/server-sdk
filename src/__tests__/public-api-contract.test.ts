import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import type {
  ContractWebhookEventType,
  InvoiceWebhookEventType,
  TransactionWebhookEventType,
  WebhookEventType,
} from '../types';

const SNAPSHOT_PATH = path.resolve(__dirname, '../../references/public-api.snapshot.json');

/**
 * ⛔ The published enum is DERIVED from the backend's vocabulary now, and this list is the third
 * copy of it — kept because this package cannot import that enum, and updated here to the
 * twenty-eight the API actually delivers. It listed seventeen, which is what let `T18`'s ten route
 * events and `additional_agreement.signed` go undeclared on the published surface for as long as
 * they have existed.
 */
const EXPECTED_WEBHOOK_EVENTS: WebhookEventType[] = [
  'document.created',
  'document.verified',
  'document.signed',
  'signature.request.created',
  'signature.request.completed',
  'signature.request.rejected',
  'contract.created',
  'contract.status_changed',
  'contract.signed',
  'additional_agreement.signed',
  'contract.cancelled',
  'contract.terminated',
  'invoice.created',
  'invoice.sent',
  'invoice.paid',
  'invoice.cancelled',
  'transaction.created',
  'transaction.updated',
  'workflow.run.started',
  'workflow.step.opened',
  'workflow.assignment.approved',
  'workflow.run.returned',
  'workflow.run.rejected',
  'workflow.assignment.consented',
  'workflow.proofs.issued',
  'workflow.run.completed',
  'workflow.run.cancelled',
  'workflow.run.expired',
];

const EXPECTED_CONTRACT_WEBHOOK_EVENTS: ContractWebhookEventType[] = [
  'contract.created',
  'contract.status_changed',
  'contract.signed',
  'contract.cancelled',
  'contract.terminated',
];

const EXPECTED_INVOICE_WEBHOOK_EVENTS: InvoiceWebhookEventType[] = [
  'invoice.created',
  'invoice.sent',
  'invoice.paid',
  'invoice.cancelled',
];

const EXPECTED_TRANSACTION_WEBHOOK_EVENTS: TransactionWebhookEventType[] = [
  'transaction.created',
  'transaction.updated',
];

const EXPECTED_ROUTE_MATRIX: Record<string, Record<string, string[]>> = {
  /**
   * ⛔ `W4-12` / `AC-28.5` — **the `400` is the backend's and always was; this matrix was written
   * against a snapshot that predated it.** `openapi/public-api.json` has carried
   * `PublicStripeCascadeErrorDto` on this route since `af230c04` — before the WORKSPACES_FOUNDATION
   * run began — while the snapshot beside this file was 129 paths against the backend's 147.
   * `W3-28` regenerated the snapshot from the finished tree, which is what made the staleness
   * visible: this file went red naming the response set, and the repair is the expectation rather
   * than the snapshot.
   */
  '/api/v1/contracts': {
    get: ['200'],
    post: ['201', '400'],
  },
  '/api/v1/contracts/empty': {
    post: ['201'],
  },
  '/api/v1/contracts/minimal': {
    post: ['201'],
  },
  '/api/v1/contracts/import': {
    post: ['201'],
  },
  '/api/v1/contracts/{contractId}': {
    delete: ['200'],
    get: ['200'],
    patch: ['200'],
  },
  '/api/v1/contracts/{contractId}/document': {
    patch: ['200'],
  },
  '/api/v1/contracts/{contractId}/stats': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/status': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/activities': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/payment-setup': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/send': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/cancel': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/terminate': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/recurring-setup': {
    post: ['201'],
  },
  '/api/v1/contracts/{contractId}/recurring-approval': {
    delete: ['200'],
  },
  '/api/v1/contracts/{contractId}/recurring-approval/resend': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/termination': {
    delete: ['200'],
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/termination/status': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/termination/history': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/termination/approve': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/termination/reject': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/payment-terms': {
    get: ['200'],
    post: ['201'],
  },
  '/api/v1/contracts/{contractId}/payment-terms/{termId}': {
    patch: ['200'],
    delete: ['200'],
  },
  '/api/v1/contracts/{contractId}/signing-requests': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/signing-requests/{requestId}/resend': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/signing-requests/{requestId}': {
    get: ['200'],
    delete: ['200'],
  },
  '/api/v1/contracts/{contractId}/signing-requests/{requestId}/business-sign': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/agreements': {
    get: ['200'],
    post: ['201'],
  },
  '/api/v1/contracts/{contractId}/agreements/{agreementId}': {
    get: ['200'],
    delete: ['200'],
  },
  '/api/v1/contracts/{contractId}/agreements/{agreementId}/initiate-signing': {
    post: ['201'],
  },
  '/api/v1/signatures/requests/{requestId}/edit': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/invoices': {
    get: ['200'],
    post: ['201', '400'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}': {
    get: ['200'],
    patch: ['200'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}/cancel': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}/pdf': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}/send': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}/charge': {
    post: ['200', '403'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}/mark-paid': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/transactions': {
    get: ['200'],
  },
  '/api/v1/transactions/{transactionUuid}': {
    get: ['200'],
  },
  '/api/v1/transactions/payment-mix': {
    get: ['200'],
  },
  '/api/v1/transactions/fee-estimate': {
    get: ['200'],
  },
  '/api/v1/invoices': {
    get: ['200'],
  },
  '/api/v1/templates': {
    get: ['200'],
    post: ['201'],
  },
  '/api/v1/templates/{templateId}': {
    get: ['200'],
    patch: ['200'],
    delete: ['200'],
  },
  '/api/v1/templates/{templateId}/publish': {
    post: ['200'],
  },
  '/api/v1/templates/{templateId}/archive': {
    post: ['200'],
  },
  '/api/v1/templates/{templateId}/restore': {
    post: ['200'],
  },
  '/api/v1/templates/{templateId}/preview-pdf': {
    post: ['200'],
  },
  '/api/v1/templates/{templateId}/preview-html': {
    post: ['200'],
  },
  '/api/v1/templates/preview-unsaved-pdf': {
    post: ['200'],
  },
  '/api/v1/templates/{templateId}/documents': {
    post: ['201'],
  },
  '/api/v1/templates/{templateId}/signature-requests': {
    post: ['201'],
  },
  '/api/v1/templates/{templateId}/contracts': {
    post: ['201'],
  },
  '/api/v1/templates/{templateId}/versions': {
    get: ['200'],
  },
  '/api/v1/documents/shared': {
    get: ['200'],
  },
  '/api/v1/documents/search': {
    get: ['200'],
  },
  '/api/v1/documents/{documentId}': {
    get: ['200'],
  },
  '/api/v1/documents/{documentId}/versions': {
    get: ['200'],
  },
  '/api/v1/documents/{documentId}/activity': {
    get: ['200'],
  },
  '/api/v1/documents/{documentId}/downloads': {
    get: ['200'],
  },
  '/api/v1/documents/{documentId}/comments': {
    get: ['200'],
    post: ['201', '401'],
  },
  '/api/v1/documents/{documentId}/send-public-link': {
    post: ['200', '401'],
  },
  '/api/v1/documents/versions/{versionId}/download': {
    get: ['200'],
  },
  '/api/v1/documents/versions/{versionId}/preview': {
    get: ['200'],
  },
  '/api/v1/signatures': {
    get: ['200', '401'],
    post: ['201'],
  },
  '/api/v1/signatures/validate-pdf': {
    post: ['200'],
  },
  '/api/v1/signatures/requests/{requestId}/cancel': {
    post: ['200'],
  },
  '/api/v1/signatures/requests/{requestId}/remind': {
    post: ['200'],
  },
  '/api/v1/signatures/versions/{versionId}/certificate': {
    get: ['200'],
  },
  '/api/v1/signatures/versions/{versionId}/signed-document': {
    get: ['200'],
  },
  '/api/v1/embedded/sessions': {
    post: ['201', '401'],
  },
};

const EXPECTED_TEMPLATE_RESPONSE_REFS = [
  {
    route: '/api/v1/templates',
    method: 'get',
    status: '200',
    ref: '#/components/schemas/PublicTemplateListEnvelopeDto',
  },
  {
    route: '/api/v1/templates/{templateId}',
    method: 'get',
    status: '200',
    ref: '#/components/schemas/PublicTemplateGetEnvelopeDto',
  },
  {
    route: '/api/v1/templates/{templateId}/documents',
    method: 'post',
    status: '201',
    ref: '#/components/schemas/PublicTemplateDocumentEnvelopeDto',
  },
  {
    route: '/api/v1/templates/{templateId}/signature-requests',
    method: 'post',
    status: '201',
    ref: '#/components/schemas/PublicTemplateSignatureRequestEnvelopeDto',
  },
  {
    route: '/api/v1/templates/{templateId}/contracts',
    method: 'post',
    status: '201',
    ref: '#/components/schemas/PublicTemplateContractEnvelopeDto',
  },
  {
    route: '/api/v1/templates/{templateId}/versions',
    method: 'get',
    status: '200',
    ref: '#/components/schemas/PublicTemplateVersionsEnvelopeDto',
  },
] as const;

function loadSnapshot(): any {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
}

describe('public API contract snapshot', () => {
  it('keeps critical contract and embedded routes aligned with the backend snapshot', () => {
    const snapshot = loadSnapshot();

    for (const [route, methods] of Object.entries(EXPECTED_ROUTE_MATRIX)) {
      expect(snapshot.paths[route]).toBeDefined();

      for (const [method, statuses] of Object.entries(methods)) {
        const operation = snapshot.paths[route][method];

        expect(operation).toBeDefined();
        expect(Object.keys(operation.responses).sort()).toEqual([...statuses].sort());
      }
    }
  });

  it('publishes webhook event enums in the backend snapshot', () => {
    const snapshot = loadSnapshot();
    const webhookEvents =
      snapshot.components.schemas.PublicWebhookEnvelopeDto.properties.type.enum;

    expect(webhookEvents).toEqual(EXPECTED_WEBHOOK_EVENTS);
    expect(
      webhookEvents.filter((event: string) => event.startsWith('contract.')),
    ).toEqual(EXPECTED_CONTRACT_WEBHOOK_EVENTS);
    expect(
      webhookEvents.filter((event: string) => event.startsWith('invoice.')),
    ).toEqual(EXPECTED_INVOICE_WEBHOOK_EVENTS);
    expect(
      webhookEvents.filter((event: string) => event.startsWith('transaction.')),
    ).toEqual(EXPECTED_TRANSACTION_WEBHOOK_EVENTS);
  });

  it('keeps contract route params string-based in the backend snapshot', () => {
    const snapshot = loadSnapshot();
    const contractStatusParams = snapshot.paths['/api/v1/contracts/{contractId}/status'].get
      .parameters;

    expect(
      contractStatusParams.find((param: any) => param.name === 'contractId'),
    ).toMatchObject({
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  });

  it('publishes explicit template runtime response schemas in the backend snapshot', () => {
    const snapshot = loadSnapshot();

    for (const { route, method, status, ref } of EXPECTED_TEMPLATE_RESPONSE_REFS) {
      expect(
        snapshot.paths[route][method].responses[status].content['application/json'].schema.$ref,
      ).toBe(ref);
    }
  });
});

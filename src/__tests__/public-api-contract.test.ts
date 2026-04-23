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
  'contract.cancelled',
  'contract.terminated',
  'invoice.created',
  'invoice.sent',
  'invoice.paid',
  'invoice.cancelled',
  'transaction.created',
  'transaction.updated',
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
  '/api/v1/contracts': {
    get: ['200'],
    post: ['201'],
  },
  '/api/v1/contracts/{contractId}': {
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
  '/api/v1/contracts/{contractId}/invoices': {
    get: ['200'],
    post: ['201'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}': {
    get: ['200'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}/send': {
    post: ['200'],
  },
  '/api/v1/contracts/{contractId}/invoices/{invoiceUuid}/charge': {
    post: ['200'],
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
  '/api/v1/templates/{templateId}/documents': {
    post: ['201'],
  },
  '/api/v1/templates/{templateId}/signature-requests': {
    post: ['201'],
  },
  '/api/v1/templates/{templateId}/contracts': {
    post: ['201'],
  },
  '/api/v1/embedded/sessions': {
    post: ['201', '401'],
  },
};

const EXPECTED_TEMPLATE_RESPONSE_REFS: Record<string, string> = {
  '/api/v1/templates/{templateId}/documents':
    '#/components/schemas/PublicTemplateDocumentEnvelopeDto',
  '/api/v1/templates/{templateId}/signature-requests':
    '#/components/schemas/PublicTemplateSignatureRequestEnvelopeDto',
  '/api/v1/templates/{templateId}/contracts':
    '#/components/schemas/PublicTemplateContractEnvelopeDto',
};

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

    for (const [route, ref] of Object.entries(EXPECTED_TEMPLATE_RESPONSE_REFS)) {
      expect(
        snapshot.paths[route].post.responses['201'].content['application/json'].schema.$ref,
      ).toBe(ref);
    }
  });
});

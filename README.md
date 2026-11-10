# @chaindoc_io/server-sdk

**Official server-side SDK for Chaindoc API - documents, signatures, contracts, invoicing, and webhook-safe integrations.**

> **3.0 is a breaking release.** A file you send is now *converted* into a text document (it is no longer signed as a file), signature places are chips in that text and recipients are bound by `role`, and templates use the new content format. Read [MIGRATION.md](MIGRATION.md) before upgrading from 2.x. For the whole platform change (including the embed and MCP), see [What changed (November 2026)](docs/WHATS-CHANGED-2026-11.md). Every `/api/v1` call needs a Business plan or above (`403 INTEGRATIONS_NOT_IN_PLAN` otherwise).

[![npm version](https://img.shields.io/npm/v/@chaindoc_io/server-sdk.svg)](https://www.npmjs.com/package/@chaindoc_io/server-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

## Features

Processes discovery and repeatable Start are available in source; see the bounded
[Processes contract](docs/PROCESSES.md) for authorization, replay and release status.

- **Document Management** - Create, update, and version documents with blockchain verification
- **Digital Signatures** - Request and collect legally-binding electronic signatures
- **Templates, Contracts, and Billing** - Generate documents and contracts from published templates, then manage invoice lifecycle and transactions
- **Embedded Signing** - Seamless in-app signing experience with frontend SDK integration
- **Blockchain Verification** - Immutable document verification on blockchain
- **Webhook Verification** - Verify signed webhook deliveries with replay protection
- **Embedded KYC Enforcement** - Require Chaindoc-managed KYC inside the signing iframe
- **Zero Dependencies** - Uses native Node.js 18+ APIs (fetch, FormData)
- **TypeScript First** - Full type definitions included
- **Automatic Retries** - Built-in retry logic with exponential backoff

## Installation

```bash
npm install @chaindoc_io/server-sdk
```

```bash
yarn add @chaindoc_io/server-sdk
```

```bash
pnpm add @chaindoc_io/server-sdk
```

## Quick Start

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";

const chaindoc = new Chaindoc({
  secretKey: "sk_your_secret_key",
});

// Create embedded session for document signing
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: {
    documentId: "doc_xxx",
    signatureRequestId: "req_xxx",
  },
});

// Use session.sessionId on frontend with @chaindoc_io/embed-sdk
console.log(session.sessionId);
```

## Complete Example: Document Signing Flow

A document is a text with chips. Send a person's file through Storage; the server converts it (202), you
wait for the draft, give it signer roles, and send it by `role`.

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";
import { readFile } from "fs/promises";

const chaindoc = new Chaindoc({ secretKey: "sk_your_secret_key" });

// 1. Chunked-upload the file to Storage and start its conversion (202)
const file = new Blob([await readFile("./contract.pdf")], { type: "application/pdf" });
const { conversion } = await chaindoc.documents.createFromFile(
  file,
  { name: "Service Agreement" },
  { filename: "contract.pdf" },
);

// 2. Wait until it is ready (polls with backoff; throws ChaindocConversionFailedError on failure)
const ready = await chaindoc.conversions.wait(conversion.id);

// 3. A converted text has no signature chips yet: add the signer roles' chips
await chaindoc.documents.addSignatureBlock(ready.documentId, {
  roles: [{ key: "client", name: "Client" }],
});

// 4. Send it: recipients are bound to the text's roles
const { roles, versionId } = await chaindoc.documents.getContent(ready.documentId); // roles[].key
const request = await chaindoc.signatures.createRequest({
  versionId,
  recipients: [{ email: "signer@example.com", role: roles[0]!.key }],
  deadline: new Date("2027-12-31"),
  embeddedFlow: true,
  isKycRequired: true,
});

// 5. Embedded session for the signer (frontend: @chaindoc_io/embed-sdk)
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: { documentId: ready.documentId, signatureRequestId: request.requestId },
});
```

Or make the text yourself (`content` is the engine's version 2 content; `mode: 'template'` holds fields and roles):

```typescript
const doc = await chaindoc.documents.create({
  name: "NDA",
  status: "draft",
  content: { version: 2, mode: "document", doc: { type: "doc", content: [] } },
});
```

Instead of polling you can subscribe to the `document.conversion.completed` / `.failed` webhooks.

## Complete Example: Contract Billing Flow

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";

const chaindoc = new Chaindoc({
  secretKey: "sk_your_secret_key",
});

// Contract should already be created, sent, and signed by both parties
const contract = await chaindoc.contracts.get("contract_uuid");
const contractId = contract.contractId;

if (contract.contract.status !== "active") {
  throw new Error("Invoices can be created only for active contracts");
}

const invoice = await chaindoc.invoices.create(contractId, {
  title: "April Retainer",
  amount: "1500.00",
  dueDate: "2026-04-30T00:00:00.000Z",
  sendImmediately: false,
});

const invoiceId = invoice.invoiceId ?? invoice.invoice.id;

await chaindoc.invoices.send(contractId, invoiceId, {
  autoCharge: false,
});

const refreshedInvoice = await chaindoc.invoices.get(contractId, invoiceId);

if (refreshedInvoice.invoice.status === "unpaid") {
  await chaindoc.invoices.charge(contractId, invoiceId);
}

const transactions = await chaindoc.transactions.listByContract(contractId);

console.log(transactions.transactions.map((transaction) => transaction.id));
```

## Complete Example: Template Runtime Flow

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";

const chaindoc = new Chaindoc({
  secretKey: "sk_your_secret_key",
});

const templateId = "template_uuid";

const draftDocument = await chaindoc.templates.createDocument(templateId, {
  documentName: "Generated NDA",
  documentDescription: "Rendered from a published Chaindoc template",
  variables: {
    client_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
});

const signatureRequest = await chaindoc.templates.sendForSigning(templateId, {
  documentName: "Generated NDA",
  documentDescription: "Ready for signing",
  variables: {
    client_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
  slotAssignments: [{ signerKey: "party_a", email: "signer@example.com" }],
  deadline: new Date("2026-12-31"),
});

const contract = await chaindoc.templates.createContract(templateId, {
  title: "Generated Master Services Agreement",
  description: "Contract rendered from template",
  variables: {
    company_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
  contragent: {
    email: "partner@example.com",
    name: "Partner Corp",
  },
  slotAssignments: [
    { signerKey: "party_a", role: "business" },
    { signerKey: "party_b", role: "contragent" },
  ],
  deadline: new Date("2026-12-31"),
});

console.log(draftDocument.documentId);
console.log(signatureRequest.requestId);
console.log(contract.contractId);
```

## Configuration

```typescript
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx", // Required - Your secret API key
  environment: "production", // Optional: 'production' | 'staging' | 'development'
  timeout: 30000, // Optional: Request timeout in ms (default: 30000)
  retry: {
    // Optional: Retry configuration
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  },
});
```

### Environments

| Environment   | API URL                             | Use Case                |
| ------------- | ----------------------------------- | ----------------------- |
| `production`  | `https://api.chaindoc.io` (default) | Live production traffic |
| `staging`     | `https://api-demo.chaindoc.io`      | Pre-release testing     |
| `development` | `https://api-demo.chaindoc.io`      | Development & debugging |

### Email handling

The SDK trims and lowercases every email value before sending it to the API. This applies to top-level fields (`email`, `signerEmail`) and to nested email fields inside `recipients`, `slotAssignments`, `accessEmails`, and `contragent`. Your input objects are not mutated — the SDK copies them shallowly before normalizing. This matches the backend's canonical email format and prevents silent auto-link misses for users who registered with a different case.

## API Overview

### Documents

```typescript
// A text document from content (201) ...
await chaindoc.documents.create({ name, content, status: 'draft' | 'published', accessType?: 'private' | 'public' | 'restricted' | 'team' });
// ... or a file: Storage -> conversion (202, always lands as a draft)
const { conversion } = await chaindoc.documents.createFromFile(blob, { name }, { filename });
await chaindoc.conversions.get(conversion.id);   // converting | ready | failed
await chaindoc.conversions.wait(conversion.id);  // resolves ready, throws on failed / timeout

// Read the text with its signer roles and fields; add roles with signature chips; convert an old file document
await chaindoc.documents.getContent(documentId, { versionId });
await chaindoc.documents.addSignatureBlock(documentId, { roles: [{ key: 'client', name: 'Client' }] });
await chaindoc.documents.convert(documentId);

// Next version: from text (+ the version you read) or from a Storage file (202)
await chaindoc.documents.update(documentId, { name, content, baseVersionId, status: 'draft' });

// `get` says whether it is a text or a file, and whether it can be sent
(await chaindoc.documents.get(documentId)).document; // { format: 'text' | 'file', sendable: boolean, ... }

// Update access rights; address a person by account (see Accounts)
await chaindoc.documents.updateRights(documentId, {
  accessType: 'restricted',
  accessEmails: [{ email: 'user@example.com', level: 'read', account: { kind: 'personal' } }],
});

await chaindoc.documents.verify({ versionHash: '0x...' });
await chaindoc.documents.getVerificationStatus(versionId);
```

### Accounts

A person is addressed by `account`: their personal account or a workspace they can be sent to.

```typescript
const { results } = await chaindoc.accounts.lookup({ emails: ['anna@example.com'] });
// results[0] -> { status: 'options' | 'hidden' | 'not_registered', options: [{ kind: 'personal' }, { kind: 'workspace', workspaceId, workspaceName }] }

// Pass an option as `account` on recipients, access grants and template slots, or as `contragentAccount` on a contract.
```

### Signatures

```typescript
// Signature places are chips in the text; recipients bind to them by role (never by coordinates)
await chaindoc.signatures.createRequest({
  versionId,
  recipients: [{ email: 'a@example.com', role: 'client', account: { kind: 'personal' } }],
  deadline: new Date('2027-12-31'),
  embeddedFlow: true,
  isKycRequired: false,
});

await chaindoc.signatures.getRequestStatus(requestId);
await chaindoc.signatures.getMyRequests({ pageNumber: 1, pageSize: 10 });
await chaindoc.signatures.resend(requestId);          // a new request over a fresh copy of a cancelled/expired one
await chaindoc.signatures.sign({ requestId, signatureId });

// Qualified electronic signature: promise -> prepare -> finalize
await chaindoc.signatures.qes.promise(requestId, { fieldValues: { [placementId]: 'Anna' } });
const { dataToSignB64, sessionId } = await chaindoc.signatures.qes.prepare(requestId, { signerCertPem });
// the signing device signs dataToSignB64; the private key never reaches the API or the SDK
await chaindoc.signatures.qes.finalize(requestId, { sessionId, signatureValueB64 });
```

### Embedded Sessions

```typescript
// Create session for frontend signing (sends OTP to email)
const session = await chaindoc.embedded.createSession({
  email: 'signer@example.com',
  metadata: {
    documentId: string;
    signatureRequestId?: string;
    returnUrl?: string;
  },
});
// Returns sessionId for @chaindoc_io/embed-sdk
```

### Contracts

```typescript
const created = await chaindoc.contracts.create({
  documentId: "doc_uuid",
  title: "Master Services Agreement",
  contragent: { email: "partner@example.com", name: "Partner LLC" },
  paymentMethodRequired: true,
  preferredPaymentMethodType: "card",
});

await chaindoc.contracts.list({ page: 1, limit: 10, status: "active" });
await chaindoc.contracts.get(created.contractId);
await chaindoc.contracts.getStatus(created.contractId);
await chaindoc.contracts.getActivities(created.contractId);
await chaindoc.contracts.send(created.contractId, {
  messageToSigners: "Please review and sign this contract",
  deadline: new Date("2026-12-31"),
  isKycRequired: true,
});
await chaindoc.contracts.cancel(created.contractId);
await chaindoc.contracts.terminate(created.contractId, { reason: "Mutual offboarding" });
```

### Templates

Templates use the new content format (`{ version: 2, mode: 'template', doc }`). Content goes into a working
copy and names the `revision` it was read at; publishing makes a version. Old-format templates answer
`410 TEMPLATE_RETIRED`; the three preview methods are gone.

```typescript
const { template } = await chaindoc.templates.create({ name: 'NDA', category: 'nda', content });
const { template: current } = await chaindoc.templates.get(template.id);
await chaindoc.templates.update(template.id, { content: edited, revision: current.workingCopy!.revision });
await chaindoc.templates.publish(template.id, { changelog: 'First version' });
await chaindoc.templates.archive(template.id);
await chaindoc.templates.restore(template.id);
await chaindoc.templates.delete(template.id); // permanent

// Use a published template
await chaindoc.templates.createDocument(templateId, { documentName: 'Generated NDA', variables: { client_name: 'Acme Inc.' } });
await chaindoc.templates.sendForSigning(templateId, {
  documentName: 'Generated NDA',
  variables: { client_name: 'Acme Inc.' },
  slotAssignments: [{ signerKey: 'party_a', email: 'signer@example.com', account: { kind: 'personal' } }],
  deadline: new Date('2027-12-31'),
});
await chaindoc.templates.createContract(templateId, {
  title: 'Generated MSA',
  variables: { company_name: 'Acme Inc.' },
  contragent: { email: 'partner@example.com' },
  contragentAccount: { kind: 'workspace', workspaceId },
  slotAssignments: [
    { signerKey: 'party_a', role: 'business' },
    { signerKey: 'party_b', role: 'contragent' },
  ],
  deadline: new Date('2027-12-31'),
});
```

### Invoices, counterparties and payment instructions

```typescript
await chaindoc.contragents.create({ email: 'client@example.com', name: 'Client', vatNumber: 'DE123' });
const { taxTreatments } = await chaindoc.taxTreatments.list();

// Bank, crypto and other details; the cascade is invoice > contract > counterparty > business default
const { paymentInstructionId } = await chaindoc.paymentInstructions.create({
  type: 'bank', currencyCode: 'EUR', iban: 'DE00...', qr: true,
});
await chaindoc.paymentInstructions.create({ type: 'crypto', network: 'TRC20', asset: 'USDT', address: 'T...' });
await chaindoc.paymentInstructions.assignToContragent({ contragentEmail: 'client@example.com', paymentInstructionId });
await chaindoc.contracts.setPaymentInstruction(contractId, paymentInstructionId);
await chaindoc.contracts.setStripePayment(contractId, { stripePaymentAllowed: false });

await chaindoc.invoices.create(contractId, {
  title: 'April Retainer',
  amount: '1500.00',
  dueDate: '2026-04-30T00:00:00.000Z',
  taxTreatmentId: taxTreatments[0]!.id,
  paymentInstructionId,
});
await chaindoc.invoices.send(contractId, invoiceId, { autoCharge: false });
await chaindoc.invoices.markPaid(contractId, invoiceId, { method: 'bank-transfer', paidAt: '2026-04-03T10:00:00.000Z' });
await chaindoc.invoices.createCreditNote(contractId, invoiceId, {
  reason: 'Returned item',
  lines: [{ description: 'Item', quantity: 1, unitPrice: '50.00' }],
});
```

Money calls (`charge`, `markPaid`, credit notes, payment-instruction writes, the Stripe setting) are never
retried automatically: after an uncertain failure, read the object before trying again.

### Transactions

```typescript
await chaindoc.transactions.listByContract(contractId);
await chaindoc.transactions.get(transactionId);
```

### Media

```typescript
// Upload files (PDF, DOC, images, videos)
const { media } = await chaindoc.media.upload([file1, file2]);
```

### Utility

```typescript
// Get API key info
await chaindoc.getApiKeyInfo();

// Health check
await chaindoc.healthCheck();
```

### Webhooks

```typescript
const verification = Chaindoc.webhooks.verify(
  rawBody,
  req.headers["x-chaindoc-signature"] as string,
  req.headers["x-chaindoc-timestamp"] as string,
  process.env.CHAINDOC_WEBHOOK_SECRET!
);

if (!verification.valid) {
  throw new Error("Invalid webhook signature");
}

switch (verification.envelope?.type) {
  case "document.conversion.completed":
  case "document.conversion.failed":
  case "contract.signed":
  case "additional_agreement.signed":
  case "invoice.created":
  case "invoice.sent":
  case "invoice.paid":
  case "transaction.created":
  case "transaction.updated":
  case "transaction.edited":
  case "transaction.removed":
    console.log(verification.envelope.data);
    break;
}
```

## Error Handling

Every refusal carries the server's `errorKey`. `ChaindocError.errorKey` reads it, and the common families are
their own classes (all `instanceof ChaindocError`):

```typescript
import { Chaindoc, ChaindocError, ChaindocPlanError, ChaindocReadOnlyError, ChaindocLimitError,
  ChaindocDocumentFileError, ChaindocSigningSetupError, ChaindocTemplateError, ChaindocPaymentError,
  ChaindocNotYourTurnError, hasErrorKey } from '@chaindoc_io/server-sdk';

try {
  await chaindoc.signatures.createRequest({ ... });
} catch (error) {
  if (hasErrorKey(error, 'SIGNING_FIELDS_EMPTY')) { /* a required signer field is empty */ }
  else if (error instanceof ChaindocPlanError) { /* INTEGRATIONS_NOT_IN_PLAN: needs a Business plan */ }
  else if (error instanceof ChaindocReadOnlyError) { /* ACCOUNT_READ_ONLY */ }
  else if (error instanceof ChaindocLimitError) { /* STORAGE_LIMIT_REACHED, AI_LIMIT_REACHED, AI_NOT_IN_PLAN */ }
  else if (error instanceof ChaindocDocumentFileError) { /* DOCUMENT_FILE_CONVERTS, DOCUMENT_CONVERSION_PENDING/FAILED, ... */ }
  else if (error instanceof ChaindocSigningSetupError) { /* SETUP_FIELDS_STAND_IN_THE_TEXT, SETUP_BLOCKED, SIGNATURE_ROLE_* */ }
  else if (error instanceof ChaindocError) {
    console.error(error.errorKey, error.statusCode, error.response);
  }
}
```

`conversions.wait()` throws `ChaindocConversionFailedError` (with `failureCode`) or
`ChaindocConversionTimeoutError` (with `conversionId`; the conversion may still finish).

Every id you pass is checked and percent-encoded as one path segment; an empty id, `.` or `..` is refused
before any request is sent.

## Documentation

- [Introduction](https://chaindoc.io/docs/introduction)
- [Quick Start](https://chaindoc.io/docs/quick-start)
- [API Documentation](https://chaindoc.io/docs/api-docs)
- [Chaindoc SDKs](https://chaindoc.io/docs/sdks)
- [Changelog](CHANGELOG.md) - Version history

## Requirements

- Node.js 18+ (uses native fetch API)
- Secret API key (`sk_xxx`) from [Chaindoc Dashboard](https://chaindoc.io)

## Related Packages

- [`@chaindoc_io/embed-sdk`](https://www.npmjs.com/package/@chaindoc_io/embed-sdk) - Frontend SDK for embedded signing

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Documentation](https://chaindoc.io/docs)
- [GitHub Issues](https://github.com/ChaindocIO/server-sdk/issues)
- [Email Support](mailto:support@chaindoc.io)

---

Made with ❤️ by the [Chaindoc](https://chaindoc.io) team

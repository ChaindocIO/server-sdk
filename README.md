# @chaindoc_io/server-sdk

**Official server-side SDK for Chaindoc API - documents, signatures, contracts, invoicing, and webhook-safe integrations.**

[![npm version](https://img.shields.io/npm/v/@chaindoc_io/server-sdk.svg)](https://www.npmjs.com/package/@chaindoc_io/server-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

## Features

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

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";
import { readFile } from "fs/promises";

const chaindoc = new Chaindoc({
  secretKey: "sk_your_secret_key",
});

// 1. Upload document
const buffer = await readFile("./contract.pdf");
const file = new Blob([buffer], { type: "application/pdf" });
const { media } = await chaindoc.media.upload([file]);

// 2. Create document with blockchain verification
const doc = await chaindoc.documents.create({
  name: "Service Agreement",
  description: "Contract for services",
  media: media[0],
  hashtags: ["#contract", "#agreement"],
  status: "published", // Verify in blockchain
});

// 3. Create signature request
const request = await chaindoc.signatures.createRequest({
  versionId: doc.document.currentVersion.id,
  recipients: [{ email: "signer@example.com" }],
  deadline: new Date("2027-12-31"),
  embeddedFlow: true,
  isKycRequired: true,
});

// 4. Create embedded session for signer
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: {
    documentId: doc.documentId,
    signatureRequestId: request.requestId,
    returnUrl: "https://yourapp.com/signing-complete",
  },
});

// 5. Send sessionId to frontend
// Frontend uses: @chaindoc_io/embed-sdk
// sdk.openSignatureFlow({ sessionId: session.sessionId })
```

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

## API Overview

### Documents

```typescript
// Create document
await chaindoc.documents.create({
  name: string;
  description: string;
  media: Media;
  hashtags: string[];
  status: 'draft' | 'published';
  accessType?: 'private' | 'public' | 'restricted';
});

// Update document (creates new version)
await chaindoc.documents.update(documentId, params);

// Update access rights
await chaindoc.documents.updateRights(documentId, {
  accessType: 'restricted',
  accessEmails: [{ email: 'user@example.com', level: 'read' }],
});

// Verify document in blockchain
await chaindoc.documents.verify({ versionHash: '0x...' });

// Get verification status
await chaindoc.documents.getVerificationStatus(versionId);
```

### Signatures

```typescript
// Create signature request
await chaindoc.signatures.createRequest({
  versionId: string;
  recipients: [{ email: string }];
  deadline: Date;
  embeddedFlow?: boolean;
  isKycRequired?: boolean;
});

// Get request status
await chaindoc.signatures.getRequestStatus(requestId);

// Get all requests
await chaindoc.signatures.getMyRequests({ pageNumber: 1, pageSize: 10 });

// Sign document
await chaindoc.signatures.sign({ requestId, signatureId });
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

```typescript
await chaindoc.templates.createDocument(templateId, {
  documentName: "Generated NDA",
  variables: {
    client_name: "Acme Inc.",
  },
});

await chaindoc.templates.sendForSigning(templateId, {
  documentName: "Generated NDA",
  variables: {
    client_name: "Acme Inc.",
  },
  slotAssignments: [{ signerKey: "party_a", email: "signer@example.com" }],
  deadline: new Date("2026-12-31"),
});

await chaindoc.templates.createContract(templateId, {
  title: "Generated MSA",
  variables: {
    company_name: "Acme Inc.",
  },
  contragent: {
    email: "partner@example.com",
  },
  slotAssignments: [
    { signerKey: "party_a", role: "business" },
    { signerKey: "party_b", role: "contragent" },
  ],
  deadline: new Date("2026-12-31"),
});
```

### Invoices

```typescript
await chaindoc.invoices.create(contractId, {
  title: "April Retainer",
  amount: "1500.00",
  dueDate: "2026-04-30T00:00:00.000Z",
  autoCharge: false,
  sendImmediately: false,
});

await chaindoc.invoices.list(contractId, { status: "unpaid", page: 1, limit: 20 });
await chaindoc.invoices.get(contractId, invoiceId);
await chaindoc.invoices.send(contractId, invoiceId, { autoCharge: true });
await chaindoc.invoices.charge(contractId, invoiceId);
await chaindoc.invoices.markPaid(contractId, invoiceId, { note: "Wire received" });
```

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
  case "contract.signed":
  case "invoice.created":
  case "invoice.sent":
  case "invoice.paid":
  case "transaction.created":
  case "transaction.updated":
    console.log(verification.envelope.data);
    break;
}
```

## Error Handling

```typescript
import { Chaindoc, ChaindocError } from '@chaindoc_io/server-sdk';

try {
  await chaindoc.documents.create({ ... });
} catch (error) {
  if (error instanceof ChaindocError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
    console.error('Response:', error.response);
  }
}
```

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

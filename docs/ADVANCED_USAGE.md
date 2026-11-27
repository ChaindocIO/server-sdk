# Advanced Usage Guide

> **Version:** 3.x · upgrading from 2.x: [MIGRATION.md](../MIGRATION.md)

Advanced configuration, workflows, and best practices for production deployments.

---

## Table of Contents

- [Document Workflows](#document-workflows)
- [Signature Workflows](#signature-workflows)
- [Blockchain Verification](#blockchain-verification)
- [Access Control](#access-control)
- [KYC Integration](#kyc-integration)
- [Webhook Handling](#webhook-handling)
- [Rate Limiting & Retries](#rate-limiting--retries)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)
- [Testing](#testing)

---

## Document Workflows

### Document Versioning

Every update creates a new version; previous versions are preserved. The next version comes from text (`content`, with
`baseVersionId` — the version you read; another current version is `409 DOCUMENT_WRITING_BASE_MOVED`) or from a Storage
file, converted asynchronously (202).

```typescript
// Read the current text, change it, write the next version
const current = await chaindoc.documents.getContent(documentId);
const edited = editContent(current.content); // your change to the engine's content; send `version` back as read

await chaindoc.documents.update(documentId, {
  name: "Contract v2",
  description: "Updated terms in section 3",
  content: edited,
  baseVersionId: current.versionId,
  status: "draft",
});

// Or the next version from a new file in Storage (202): wait for its conversion
const { storageFileId } = await chaindoc.media.uploadChunked(newFile, { filename: "contract-v2.pdf" });
const { conversion } = await chaindoc.documents.update(documentId, { name: "Contract v2", storageFileId, status: "draft" });
const ready = await chaindoc.conversions.wait(conversion.id); // ready.versionId is the new version

// Every version stays readable
const { versions } = await chaindoc.documents.getVersions(documentId);
```

### Document Status Flow

```
    ┌─────────┐
    │  draft  │
    └────┬────┘
         │ status = 'published'
         ▼
    ┌─────────────┐
    │  published  │──────────────────────────┐
    └─────┬───────┘                          │
          │ createRequest()                  │
          ▼                                  │
    ┌───────────────────┐                    │
    │ pending_signature │                    │
    └─────────┬─────────┘                    │
              │ all signed                   │
              ▼                              │
    ┌─────────┐                              │
    │  signed │                              │
    └─────────┘                              │
                                             │
                                             ▼
                                    ┌──────────┐
                                    │ archived │
                                    └──────────┘
```

### Bulk Document Upload

Each file is converted on its own; start the conversions, then wait for them. Pass an `idempotencyKey` so that a retry of
your own does not pay for a second conversion.

```typescript
async function uploadDocuments(files: { path: string; name: string }[]) {
  const started = [];

  for (const file of files) {
    const blob = new Blob([await readFile(file.path)], { type: "application/pdf" });
    const { conversion } = await chaindoc.documents.createFromFile(
      blob,
      { name: file.name, idempotencyKey: `upload-${file.path}` },
      { filename: basename(file.path) },
    );
    started.push({ name: file.name, conversionId: conversion.id });
  }

  return Promise.all(
    started.map(async ({ name, conversionId }) => {
      const ready = await chaindoc.conversions.wait(conversionId);
      return { name, documentId: ready.documentId, versionId: ready.versionId };
    }),
  );
}
```

---

## Signature Workflows

### Multiple Signers (Parallel)

All signers can sign independently in any order. Each recipient is bound to a role of the text:

```typescript
const { versionId } = await chaindoc.documents.addSignatureBlock(documentId, {
  roles: [
    { key: "signer_1", name: "First signer" },
    { key: "signer_2", name: "Second signer" },
    { key: "signer_3", name: "Third signer" },
  ],
});

const sigRequest = await chaindoc.signatures.createRequest({
  versionId,
  recipients: [
    { email: "signer1@example.com", role: "signer_1" },
    { email: "signer2@example.com", role: "signer_2" },
    { email: "signer3@example.com", role: "signer_3" },
  ],
  deadline: new Date("2027-12-31"),
  embeddedFlow: true,
});

// Track progress
async function checkProgress(requestId: string) {
  const status = await chaindoc.signatures.getRequestStatus(requestId);

  console.log(`Progress: ${status.signedCount}/${status.totalSigners}`);

  status.signers.forEach((signer) => {
    if (signer.signedAt) {
      console.log(`✓ ${signer.email} (${signer.role}) signed at ${signer.signedAt}`);
    } else {
      console.log(`○ ${signer.email} (${signer.role}) pending`);
    }
  });

  return status.isCompleted;
}
```

### Sequential Signing

Implement order-based signing in your application:

```typescript
class SequentialSigningManager {
  private signingOrder: string[];
  private currentIndex = 0;

  constructor(orderedEmails: string[]) {
    this.signingOrder = orderedEmails;
  }

  async createNextSession(
    chaindoc: Chaindoc,
    documentId: string,
    signatureRequestId: string
  ) {
    if (this.currentIndex >= this.signingOrder.length) {
      return null; // All signed
    }

    const email = this.signingOrder[this.currentIndex];

    return chaindoc.embedded.createSession({
      email,
      metadata: {
        documentId,
        signatureRequestId,
        signerIndex: this.currentIndex,
        totalSigners: this.signingOrder.length,
      },
    });
  }

  async onSigned(email: string) {
    if (email === this.signingOrder[this.currentIndex]) {
      this.currentIndex++;
    }
  }
}

// Usage
const manager = new SequentialSigningManager([
  "ceo@company.com", // Must sign first
  "legal@company.com", // Then legal
  "client@external.com", // Finally client
]);
```

### Reminder System

Chaindoc sends the reminder itself and keeps a 12-hour cooldown per signer: a signer reminded too recently comes back in
`skipped`, not as an error.

```typescript
async function sendReminders(chaindoc: Chaindoc) {
  const { items } = await chaindoc.signatures.getMyRequests({ status: "pending", pageNumber: 1, pageSize: 100 });

  for (const request of items) {
    const { remindedEmails, skipped } = await chaindoc.signatures.remind(request.id);
    console.log(request.id, "reminded:", remindedEmails, "skipped:", skipped);
  }
}
```

### Expiration Handling

A request past its deadline reads `expired` (by the server's clock, before the nightly sweep writes it). `resend` opens a
NEW request over a fresh copy of the version, with the same signers and their roles; the expired one stays as the
record.

```typescript
async function handleExpiredRequests(chaindoc: Chaindoc) {
  const { items } = await chaindoc.signatures.getMyRequests({ pageNumber: 1, pageSize: 100 });

  for (const request of items.filter((r) => r.status === "expired")) {
    await notifyOwner(request);

    if (shouldAutoRenew(request)) {
      const renewed = await chaindoc.signatures.resend(request.id, {
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
      });
      console.log(`${request.id} resent as ${renewed.requestId}`);
    }
  }
}
```

---

## Blockchain Verification

### Verification Workflow

```typescript
// 1. Create document with 'published' status
const doc = await chaindoc.documents.create({
  name: "Contract",
  status: "published", // Triggers automatic verification
  // ...
});

// 2. Check verification status
async function waitForVerification(versionId: string): Promise<boolean> {
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const status = await chaindoc.documents.getVerificationStatus(versionId);

    if (status.verified) {
      console.log("Verified!");
      console.log("Transaction:", status.verification?.txHash);
      console.log("Chain ID:", status.verification?.chainId);
      return true;
    }

    console.log(`Attempt ${i + 1}: pending...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return false;
}

// 3. Manual verification (if needed)
const verifyResult = await chaindoc.documents.verify({
  versionHash: doc.document.versions[0].versionHash!,
});
```

### Verification Data Storage

Store verification proof for audit:

```typescript
interface VerificationRecord {
  documentId: string;
  versionId: string;
  versionHash: string;
  txHash: string;
  chainId: number;
  verifiedAt: Date;
}

async function storeVerificationProof(
  chaindoc: Chaindoc,
  versionId: string
): Promise<VerificationRecord | null> {
  const status = await chaindoc.documents.getVerificationStatus(versionId);

  if (!status.verified || !status.verification) {
    return null;
  }

  const record: VerificationRecord = {
    documentId: status.document!.id,
    versionId: status.document!.versionId,
    versionHash: status.document!.versionHash,
    txHash: status.verification.txHash,
    chainId: status.verification.chainId,
    verifiedAt: new Date(status.verification.verifiedAt),
  };

  // Store in your database
  await db.verificationRecords.insert(record);

  return record;
}
```

---

## Access Control

### Access Types

A document you create or update is one of three things:

| Type         | Description                 |
| ------------ | --------------------------- |
| `private`    | Only owner can access       |
| `public`     | Anyone with link can access |
| `restricted` | Specific emails only        |

A fourth value, `team`, can still be **returned** for a document shared to a team before that
audience was withdrawn. It is historical and non-authorising: the document grants nothing to a
team, and no request can ask for it. That is why the input type is `AccessTypeInput` (three
values) while the output type `AccessType` keeps all four — writing `accessType: "team"` on a
create or an update does not compile.

### Email-Based Access

```typescript
await chaindoc.documents.create({
  name: "Confidential Report",
  // ... other fields
  accessType: "restricted",
  accessEmails: [
    { email: "ceo@company.com", level: "write" },
    { email: "cfo@company.com", level: "write" },
    { email: "auditor@external.com", level: "read" },
  ],
});

// Update access later
await chaindoc.documents.updateRights(documentId, {
  accessType: "restricted",
  accessEmails: [
    { email: "ceo@company.com", level: "write" },
    { email: "cfo@company.com", level: "write" },
    { email: "auditor@external.com", level: "read" },
    { email: "legal@company.com", level: "read" }, // Added
  ],
});
```

### Role-Based Access — removed

Role recipients (`accessRoles`, `{ roleId, level }`) are gone from every input type. A team role no
longer grants access to anything, so the field could only ever have been accepted and ignored.
Name the people instead, with `accessEmails`.

---

## Embedded KYC

Use `isKycRequired` when the signer must complete identity verification in the
Chaindoc-managed iframe before signing.

```typescript
async function createKycProtectedSignatureRequest(
  chaindoc: Chaindoc,
  documentId: string,
  signerEmail: string
) {
  const { roles, versionId } = await chaindoc.documents.getContent(documentId);

  const request = await chaindoc.signatures.createRequest({
    versionId,
    recipients: [{ email: signerEmail, role: roles[0]!.key }],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    embeddedFlow: true,
    isKycRequired: true,
  });

  const session = await chaindoc.embedded.createSession({
    email: signerEmail,
    metadata: {
      documentId,
      signatureRequestId: request.requestId,
    },
  });

  return { request, session };
}
```

---

## Template Runtime Workflows

Use template runtime when the template structure is curated in Chaindoc, but the
render-time data lives in your system:

```typescript
const templateId = "template_uuid";

const draftDocument = await chaindoc.templates.createDocument(templateId, {
  documentName: "Generated NDA",
  variables: {
    client_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
});

const signingFlow = await chaindoc.templates.sendForSigning(templateId, {
  documentName: "Generated NDA",
  variables: {
    client_name: "Acme Inc.",
    effective_date: "2026-04-10",
  },
  slotAssignments: [{ signerKey: "party_a", email: "legal@acme.com" }],
  deadline: new Date("2026-12-31"),
});
```

For template-backed contracts:

```typescript
const contractFlow = await chaindoc.templates.createContract(templateId, {
  title: "Generated MSA",
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

const session = await chaindoc.embedded.createSession({
  email: "partner@example.com",
  metadata: {
    contractId: contractFlow.contractId,
  },
});
```

Recommended boundaries:

- Keep template CRUD and field-placement authoring in the Chaindoc app.
- Use the public runtime API only for published template execution.
- Store template UUIDs and signer-slot keys in your own integration config.
- Treat signer-scoped template variables as part of the embedded signing flow, not the server-side render step.

---

## Webhook Handling

Handle Chaindoc webhooks in your application:

```typescript
// Express.js webhook handler
import express from "express";
import { Chaindoc } from "@chaindoc_io/server-sdk";

const app = express();
app.use(express.raw({ type: "application/json" }));

const WEBHOOK_SECRET = process.env.CHAINDOC_WEBHOOK_SECRET!;

app.post("/webhooks/chaindoc", async (req, res) => {
  const rawBody = req.body.toString("utf8");
  const verification = Chaindoc.webhooks.verify(
    rawBody,
    req.headers["x-chaindoc-signature"] as string,
    req.headers["x-chaindoc-timestamp"] as string,
    WEBHOOK_SECRET
  );

  if (!verification.valid || !verification.envelope) {
    return res.status(401).send("Invalid signature");
  }

  const event = verification.envelope;

  if (await wasAlreadyProcessed(event.id)) {
    return res.status(200).send("Already processed");
  }

  switch (event.type) {
    case "contract.signed":
      await handleContractSigned(event.data);
      break;

    case "invoice.created":
    case "invoice.sent":
    case "invoice.cancelled":
      await upsertInvoiceProjection(event.data);
      break;

    case "invoice.paid":
      await markInvoicePaid(event.data);
      break;

    case "transaction.created":
    case "transaction.updated":
      await upsertTransactionProjection(event.data);
      break;

    default:
      console.log("Unknown event:", event.type);
  }

  await markProcessed(event.id);
  res.status(200).send("OK");
});

async function handleContractSigned(data: any) {
  await db.contracts.update(data.contractId, {
    status: data.status,
    lastSignedAt: data.signedAt,
  });
}

async function upsertInvoiceProjection(data: any) {
  await db.invoices.upsert(data.invoiceId, {
    contractId: data.contractId,
    invoiceNumber: data.invoiceNumber,
    status: data.status,
    amount: data.amount,
    paidAmount: data.paidAmount,
    currencyCode: data.currencyCode,
    dueDate: data.dueDate,
    paidAt: data.paidAt,
  });
}

async function markInvoicePaid(data: any) {
  await upsertInvoiceProjection(data);
  await db.contracts.update(data.contractId, {
    lastPaidInvoiceId: data.invoiceId,
  });
}

async function upsertTransactionProjection(data: any) {
  await db.transactions.upsert(data.transactionId, {
    invoiceId: data.invoiceId,
    contractId: data.contractId,
    status: data.status,
    amount: data.amount,
    currencyCode: data.currencyCode,
    paymentMethodType: data.paymentMethodType,
    failureReason: data.failureReason,
    retryCount: data.retryCount,
    createdAt: data.createdAt,
  });
}
```

Recommended payment webhook flow:

- Use `event.id` for idempotency and keep a processed-delivery table.
- Treat `invoice.created`, `invoice.sent`, and `invoice.cancelled` as projection updates.
- Treat `invoice.paid` as the business-level settlement signal.
- Treat `transaction.created` and `transaction.updated` as operational payment-status updates.
- Always verify both `X-Chaindoc-Signature` and `X-Chaindoc-Timestamp` via `Chaindoc.webhooks.verify()`.

### Delivery, retries and a webhook that is turned off

This is what the server does today:

- The endpoint must be a **public address**. A loopback, private, link-local, unique-local or reserved address — `localhost`,
  `127.0.0.1`, `10.x`, `192.168.x`, `169.254.169.254`, `[::1]`, `[::ffff:127.0.0.1]`, a decimal or hex form of one, or a
  name that resolves to one — is refused when it is saved (`400`, `errorKey: WEBHOOK_URL_NOT_PUBLIC`), and **every
  delivery resolves and checks the address again**: one that is not public is not sent, and the delivery log says so.
- **Redirects are not followed.** A `3xx` answer is a failed delivery (it is retried like any other failure); register
  the address that answers `2xx` itself.
- A delivery is **tried 3 times in all**: at once, then 1 minute later, then 5 minutes after that. Anything but a `2xx`
  answer within 30 seconds counts as a failure. Every attempt carries the **same delivery `id`** (`envelope.id`), so
  make your handler idempotent on it.
- After **50 deliveries in a row that failed every attempt**, Chaindoc **stops sending** to the endpoint. The Chaindoc
  app shows it on the API key's page; a person fixes the endpoint and presses *Resume sending*. Nothing turns it back on
  by itself.
- **While it is stopped, every event is kept** and delivered once sending is resumed, each with its own delivery `id` and
  the usual 3 attempts. They start within a minute of the resume, the oldest first, and may take several minutes to
  drain; they arrive as late as the stop lasted, and order is not promised — trust the object's state over the order of
  events.
  Nothing is kept while the key's owner has **paused** sending (*Send events* off), and nothing for a deactivated key.
  There is no age limit on what is kept.

### Payload types

`WebhookEnvelope.data` is typed per event for the document and signature events: `WebhookEventDataMap['signature.request.rejected']`
is `SignatureRequestRejectedData`, and so on (`DocumentCreatedData`, `DocumentVerifiedData`, `DocumentSignedData`,
`SignatureRequestCreatedData`, `SignatureRequestCompletedData`, `DocumentConversionCompletedData`,
`DocumentConversionFailedData`). Every event whose object belongs to a workspace carries `data.workspace.uuid`.

- `signature.request.created` names the request as `signatureRequestId` (as every `signature.request.*` event does) and
  keeps `requestId`; it carries `documentId` and `versionId`, and `resentFrom` for a request `signatures.resend` made.
- `signature.request.rejected` with `rejectedVia: 'contract'` is a counterparty's refusal of a contract (or an amendment):
  it also carries `contractId`, `signingRequestId` and, for an amendment, `agreementId`.
- `invoice.ksef_accepted` (KSeF, Poland) carries `invoice.sent`'s payload plus `ksef: { number, acceptedAt }`.
- `contract.status_changed` (`ContractStatusChangedData`) is sent once per change, where a contract's status changes,
  whichever way it changed — the API, the Chaindoc app, a template, a scheduled job — when the change has no event of its
  own:

  | `status` | `previousStatus` | When | Also carries |
  | --- | --- | --- | --- |
  | `pending_signature` | `draft` | the contract is sent for signing: `contracts.send`, the app, a contract created from a template | `signingRequestId` (and `templateId`, `templateVersionNumber` from a template) |
  | `draft` | `pending_signature` | that signing request is cancelled (`contracts.cancelSigningRequest` or the app), declined by its recipient, or expires — the contract can be edited and sent again | `signingRequestId` |
  | `pending_amendment` | `active` | an amendment is sent for signing | `signingRequestId`, `additionalAgreementId` |
  | `active` | `pending_amendment` | the amendment's request is cancelled, declined, rejected or expires (an amendment signed is `additional_agreement.signed`) | `signingRequestId`, `additionalAgreementId` |
  | `termination_pending` | `active` | either side asks to terminate (`contracts.terminate`, or in the app) | `terminationRequestId` |
  | `active` | `termination_pending` | that request is rejected by the other side, or withdrawn by the side that asked | `terminationRequestId` |
  | `rejected` | `pending_signature` or `active` | the counterparty refuses the contract | `signingRequestId` (a refused request) |
  | `expired` | `active` | the contract reaches its end date | — |
  | `active` | `draft` | a draft is recorded in the app as already signed outside Chaindoc | `signedOutsideChaindoc: true` |

- `contract.terminated` (`ContractTerminatedData`) is sent **once**, when the contract's status becomes `terminated`: on the
  termination request's effective date, after the notice period — for a mutual-approval contract only once the
  counterparty has approved. Asking to terminate is `contract.status_changed`, not this event. It carries `contractId`,
  `status: 'terminated'`, `previousStatus` and `terminationRequestId`.
- Activation on signing is `contract.signed`, an amendment signed is `additional_agreement.signed`; a deleted draft is
  `contract.cancelled`. Every contract event also carries `side` and `workspace.uuid`, once per side of the contract that
  is your workspace.

```typescript
import type { WebhookEventDataMap } from "@chaindoc_io/server-sdk";

if (event.type === "signature.request.rejected") {
  const data = event.data as unknown as WebhookEventDataMap["signature.request.rejected"];
  if (data.rejectedVia === "contract") await markContractRefused(data.contractId!, data.reason);
}
```

---

## Rate Limiting & Retries

### Default Retry Behavior

The SDK automatically retries on:

- HTTP 5xx errors
- HTTP 429 (rate limit)
- Network errors

```typescript
// Default configuration
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
});
```

### Custom Retry Configuration

```typescript
// Aggressive retry for unreliable networks
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",
  retry: {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 30000,
  },
});

// Minimal retry for time-sensitive operations
const chaindocFast = new Chaindoc({
  secretKey: "sk_xxx",
  retry: {
    maxRetries: 1,
    baseDelayMs: 100,
    maxDelayMs: 500,
  },
});
```

### Rate Limit Best Practices

```typescript
class RateLimitedClient {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerSecond = 10;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
      await new Promise((r) => setTimeout(r, 1000 / this.requestsPerSecond));
    }

    this.processing = false;
  }
}

// Usage
const rateLimiter = new RateLimitedClient();

const results = await Promise.all(
  documents.map((doc) =>
    rateLimiter.enqueue(() => chaindoc.documents.create(doc))
  )
);
```

---

## Performance Optimization

### Connection Reuse

Create one SDK instance and reuse it:

```typescript
// Good: Single instance
let chaindoc: Chaindoc | null = null;

function getClient(): Chaindoc {
  if (!chaindoc) {
    chaindoc = new Chaindoc({
      secretKey: process.env.CHAINDOC_SECRET_KEY!,
    });
  }
  return chaindoc;
}

// Bad: New instance per request
app.post("/api/documents", async (req, res) => {
  const chaindoc = new Chaindoc({ secretKey: "..." }); // Don't do this
});
```

### Parallel Uploads

```typescript
async function uploadMultipleFiles(files: { blob: Blob; filename: string }[]): Promise<string[]> {
  // Upload into Storage in parallel batches; each answer is a storageFileId for documents.createFromStorage
  const batchSize = 5;
  const results: string[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async ({ blob, filename }) => (await chaindoc.media.uploadChunked(blob, { filename })).storageFileId)
    );

    results.push(...batchResults);
  }

  return results;
}
```

### Caching

```typescript
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 60 }); // 60 second TTL

async function getRequestStatus(requestId: string) {
  const cacheKey = `status:${requestId}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const status = await chaindoc.signatures.getRequestStatus(requestId);
  cache.set(cacheKey, status);

  return status;
}
```

---

## Security Best Practices

### API Key Management

```typescript
// Use environment variables
const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});

// Validate key format on startup
if (!process.env.CHAINDOC_SECRET_KEY?.startsWith("sk_")) {
  throw new Error("Invalid CHAINDOC_SECRET_KEY format");
}
```

### Input Validation

```typescript
import { z } from "zod";

const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  hashtags: z.array(z.string().startsWith("#")).max(10),
});

app.post("/api/documents", async (req, res) => {
  const parsed = createDocumentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.errors });
  }

  // Safe to use parsed.data
});
```

### Audit Logging

```typescript
async function auditedOperation<T>(
  operation: string,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();

    await auditLog.insert({
      operation,
      userId,
      status: "success",
      duration: Date.now() - startTime,
      timestamp: new Date(),
    });

    return result;
  } catch (error) {
    await auditLog.insert({
      operation,
      userId,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown",
      duration: Date.now() - startTime,
      timestamp: new Date(),
    });

    throw error;
  }
}

// Usage
const doc = await auditedOperation("document.create", userId, () =>
  chaindoc.documents.create(params)
);
```

---

## Testing

### Unit Testing with Mocks

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock the SDK
vi.mock("@chaindoc_io/server-sdk", () => ({
  Chaindoc: vi.fn().mockImplementation(() => ({
    documents: {
      create: vi.fn().mockResolvedValue({
        success: true,
        documentId: "doc_test",
        document: { id: "doc_test", currentVersion: { id: "ver_test", name: "Test", status: "draft" } },
        message: "Document created successfully",
      }),
      getContent: vi.fn().mockResolvedValue({
        success: true,
        versionId: "ver_test",
        roles: [{ id: "r1", key: "client", name: "Client" }],
        fields: [],
      }),
    },
    signatures: {
      createRequest: vi.fn().mockResolvedValue({
        success: true,
        requestId: "req_test",
        signatureRequest: { id: "req_test", status: "pending", signers: [] },
        message: "Signature request created successfully",
      }),
    },
    embedded: {
      createSession: vi.fn().mockResolvedValue({
        sessionId: "ses_test",
      }),
    },
  })),
  ChaindocError: class extends Error {
    constructor(message: string, public statusCode?: number) {
      super(message);
    }
  },
}));

describe("DocumentService", () => {
  it("creates document and signature request", async () => {
    const service = new DocumentService();
    const result = await service.createSignableDocument({
      name: "Test",
      signerEmail: "test@example.com",
    });

    expect(result.documentId).toBe("doc_test");
    expect(result.sessionId).toBe("ses_test");
  });
});
```

### Integration Testing

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";

describe("Chaindoc Integration", () => {
  let chaindoc: Chaindoc;

  beforeAll(() => {
    chaindoc = new Chaindoc({
      secretKey: process.env.CHAINDOC_TEST_SECRET_KEY!,
      // A test backend's base URL, with a key it issued (without it the SDK calls production).
      baseUrl: process.env.CHAINDOC_TEST_API_BASE_URL!,
    });
  });

  it("health check passes", async () => {
    const health = await chaindoc.healthCheck();
    expect(health.status).toBe("ok");
    expect(health.apiKeyValid).toBe(true);
  });

  it("can upload a file and convert it into a document", async () => {
    const buffer = Buffer.from("test content");
    const blob = new Blob([buffer], { type: "text/plain" });

    const { conversion } = await chaindoc.documents.createFromFile(blob, { name: "Test Document" }, { filename: "test.txt" });
    const ready = await chaindoc.conversions.wait(conversion.id);

    expect(ready.status).toBe("ready");
    expect(ready.documentId).toBeDefined();
  });
});
```

### End-to-End Testing

```typescript
describe("Complete Signing Flow", () => {
  it("creates session and completes signing", async () => {
    // 1. Upload the file: it is converted into a text document
    const { conversion } = await chaindoc.documents.createFromFile(testFile, { name: "E2E Test Contract" }, { filename: "contract.pdf" });
    const ready = await chaindoc.conversions.wait(conversion.id);

    // 2. Give the text its signer role
    const { versionId } = await chaindoc.documents.addSignatureBlock(ready.documentId, {
      roles: [{ key: "client", name: "Client" }],
    });

    // 3. Create signature request
    const sigRequest = await chaindoc.signatures.createRequest({
      versionId,
      recipients: [{ email: "test@example.com", role: "client" }],
      deadline: new Date(Date.now() + 86400000),
      embeddedFlow: true,
    });

    // 4. Create session
    const session = await chaindoc.embedded.createSession({
      email: "test@example.com",
      metadata: {
        documentId: ready.documentId,
        signatureRequestId: sigRequest.requestId,
      },
    });

    expect(session.sessionId).toBeDefined();
    expect(session.status).toBe("active");
  });
});
```

---

## Support

- **Documentation**: [chaindoc.io/docs](https://chaindoc.io/docs)
- **GitHub Issues**: [Report a bug](https://github.com/ChaindocIO/server-sdk/issues)
- **Email**: support@chaindoc.io

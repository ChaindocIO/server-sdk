# Advanced Usage Guide

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

Every update creates a new version. Previous versions are preserved.

```typescript
// Create initial document
const doc = await chaindoc.documents.create({
  name: "Contract v1",
  description: "Initial version",
  media: uploadedMedia,
  status: "draft",
  hashtags: ["#contract"],
  meta: [{ key: "version", value: "1.0" }],
});

// Update creates v2
const updated = await chaindoc.documents.update(doc.documentId, {
  name: "Contract v2",
  description: "Updated terms in section 3",
  media: newMedia,
  status: "published", // Verify on blockchain
  hashtags: ["#contract"],
  meta: [{ key: "version", value: "2.0" }],
});

// Both versions are accessible
console.log("v1:", doc.document.versions[0].uuid);
console.log("v2:", updated.document.versions[1].uuid);
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

```typescript
async function uploadDocuments(files: { path: string; name: string }[]) {
  const results = [];

  for (const file of files) {
    const buffer = await readFile(file.path);
    const blob = new Blob([buffer], { type: "application/pdf" });
    const { media } = await chaindoc.media.upload([blob]);

    const doc = await chaindoc.documents.create({
      name: file.name,
      description: "",
      media: media[0],
      status: "published",
      hashtags: [],
      meta: [],
    });

    results.push({
      name: file.name,
      documentId: doc.documentId,
      versionId: doc.document.versions[0].uuid,
    });
  }

  return results;
}
```

---

## Signature Workflows

### Multiple Signers (Parallel)

All signers can sign independently in any order:

```typescript
const sigRequest = await chaindoc.signatures.createRequest({
  versionId: doc.document.versions[0].uuid,
  recipients: [
    { email: "signer1@example.com" },
    { email: "signer2@example.com" },
    { email: "signer3@example.com" },
  ],
  deadline: new Date("2024-12-31"),
  embeddedFlow: true,
});

// Track progress
async function checkProgress(requestId: string) {
  const status = await chaindoc.signatures.getRequestStatus(requestId);

  console.log(`Progress: ${status.signedCount}/${status.totalSigners}`);

  status.signers.forEach((signer) => {
    if (signer.signedAt) {
      console.log(`✓ ${signer.signerEmail} signed at ${signer.signedAt}`);
    } else {
      console.log(`○ ${signer.signerEmail} pending`);
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

```typescript
async function sendReminders(chaindoc: Chaindoc) {
  const { items } = await chaindoc.signatures.getMyRequests({
    pageNumber: 1,
    pageSize: 100,
  });

  const pendingRequests = items.filter((r) => r.status === "pending");

  for (const request of pendingRequests) {
    const pendingSigners = request.signers.filter((s) => !s.signedAt);

    for (const signer of pendingSigners) {
      // Check if reminder was sent recently
      const lastReminder = signer.remindedAt
        ? new Date(signer.remindedAt)
        : null;
      const now = new Date();
      const hoursSinceReminder = lastReminder
        ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60)
        : Infinity;

      if (hoursSinceReminder > 24) {
        // Send reminder via your email service
        await sendReminderEmail(signer.signerEmail, {
          documentName: request.versionId, // You may need to fetch document name
          deadline: request.dueDate,
          requestId: request.uuid,
        });
      }
    }
  }
}
```

### Expiration Handling

```typescript
async function handleExpiredRequests(chaindoc: Chaindoc) {
  const { items } = await chaindoc.signatures.getMyRequests({
    pageNumber: 1,
    pageSize: 100,
  });

  const expired = items.filter((r) => r.status === "expired");

  for (const request of expired) {
    // Notify document owner
    await notifyOwner(request);

    // Optionally: auto-renew with new deadline
    if (shouldAutoRenew(request)) {
      await chaindoc.signatures.createRequest({
        versionId: request.versionId.toString(),
        recipients: request.signers.map((s) => ({ email: s.signerEmail })),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
        embeddedFlow: request.embeddedFlow,
      });
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

| Type         | Description                 |
| ------------ | --------------------------- |
| `private`    | Only owner can access       |
| `public`     | Anyone with link can access |
| `restricted` | Specific emails/roles only  |
| `team`       | Team members only           |

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

### Role-Based Access

```typescript
await chaindoc.documents.create({
  name: "Company Policy",
  // ... other fields
  accessType: "restricted",
  accessRoles: [
    { roleId: 1, level: "write" }, // Admin role
    { roleId: 2, level: "read" }, // Manager role
    { roleId: 3, level: "read" }, // Employee role
  ],
});
```

---

## KYC Integration

### Pre-Verification Flow

```typescript
async function createVerifiedSignatureRequest(
  chaindoc: Chaindoc,
  versionId: string,
  signerEmail: string,
  sumsubShareToken: string
) {
  // 1. Verify KYC data
  const kycResult = await chaindoc.kyc.share({
    email: signerEmail,
    shareToken: sumsubShareToken,
  });

  if (!kycResult.success) {
    throw new Error(`KYC verification failed: ${kycResult.error}`);
  }

  if (!kycResult.kycData?.verified) {
    throw new Error("User is not verified");
  }

  console.log("KYC verified:", {
    name: `${kycResult.kycData.firstName} ${kycResult.kycData.lastName}`,
    country: kycResult.kycData.country,
    status: kycResult.kycData.reviewStatus,
  });

  // 2. Create signature request with KYC requirement
  return chaindoc.signatures.createRequest({
    versionId,
    recipients: [{ email: signerEmail, shareToken: sumsubShareToken }],
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    embeddedFlow: true,
    isKycRequired: true,
  });
}
```

### KYC Data Usage

```typescript
interface SignerKycInfo {
  email: string;
  verified: boolean;
  fullName?: string;
  country?: string;
  applicantId?: string;
}

async function getSignerKycInfo(
  chaindoc: Chaindoc,
  email: string,
  shareToken: string
): Promise<SignerKycInfo> {
  const result = await chaindoc.kyc.share({ email, shareToken });

  return {
    email,
    verified: result.kycData?.verified ?? false,
    fullName: result.kycData
      ? `${result.kycData.firstName} ${result.kycData.lastName}`.trim()
      : undefined,
    country: result.kycData?.country,
    applicantId: result.kycData?.applicantId,
  };
}
```

---

## Webhook Handling

Handle Chaindoc webhooks in your application:

```typescript
// Express.js webhook handler
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.raw({ type: "application/json" }));

const WEBHOOK_SECRET = process.env.CHAINDOC_WEBHOOK_SECRET!;

app.post("/webhooks/chaindoc", (req, res) => {
  // Verify signature
  const signature = req.headers["x-chaindoc-signature"] as string;
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString());

  switch (event.type) {
    case "signature.completed":
      handleSignatureCompleted(event.data);
      break;

    case "signature.expired":
      handleSignatureExpired(event.data);
      break;

    case "document.verified":
      handleDocumentVerified(event.data);
      break;

    case "session.created":
      handleSessionCreated(event.data);
      break;

    default:
      console.log("Unknown event:", event.type);
  }

  res.status(200).send("OK");
});

async function handleSignatureCompleted(data: any) {
  const { requestId, signatureId, signerEmail, signedAt } = data;

  // Update your database
  await db.signatures.update({
    requestId,
    signedBy: signerEmail,
    signedAt: new Date(signedAt),
  });

  // Notify relevant parties
  await sendNotification(signerEmail, "Your signature was recorded");
}

async function handleSignatureExpired(data: any) {
  const { requestId, versionId } = data;

  // Mark as expired in your system
  await db.signatureRequests.update(requestId, { status: "expired" });

  // Notify document owner
  await notifyDocumentOwner(versionId, "Signature request expired");
}

async function handleDocumentVerified(data: any) {
  const { documentId, versionId, txHash, chainId } = data;

  // Store verification proof
  await db.verifications.insert({
    documentId,
    versionId,
    txHash,
    chainId,
    verifiedAt: new Date(),
  });
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
async function uploadMultipleFiles(files: Buffer[]): Promise<Media[]> {
  // Upload in parallel batches
  const batchSize = 5;
  const results: Media[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (buffer) => {
        const blob = new Blob([buffer], { type: "application/pdf" });
        const { media } = await chaindoc.media.upload([blob]);
        return media[0];
      })
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
        document: { versions: [{ uuid: "ver_test" }] },
      }),
    },
    signatures: {
      createRequest: vi.fn().mockResolvedValue({
        signatureRequest: { uuid: "req_test" },
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
      environment: "staging",
    });
  });

  it("health check passes", async () => {
    const health = await chaindoc.healthCheck();
    expect(health.status).toBe("ok");
    expect(health.apiKeyValid).toBe(true);
  });

  it("can upload and create document", async () => {
    const buffer = Buffer.from("test content");
    const blob = new Blob([buffer], { type: "text/plain" });

    const { media } = await chaindoc.media.upload([blob]);
    expect(media).toHaveLength(1);

    const doc = await chaindoc.documents.create({
      name: "Test Document",
      description: "Integration test",
      media: media[0],
      status: "draft",
      hashtags: ["#test"],
      meta: [],
    });

    expect(doc.success).toBe(true);
    expect(doc.documentId).toBeDefined();
  });
});
```

### End-to-End Testing

```typescript
describe("Complete Signing Flow", () => {
  it("creates session and completes signing", async () => {
    // 1. Upload document
    const { media } = await chaindoc.media.upload([testFile]);

    // 2. Create document
    const doc = await chaindoc.documents.create({
      name: "E2E Test Contract",
      description: "Testing",
      media: media[0],
      status: "published",
      hashtags: [],
      meta: [],
    });

    // 3. Create signature request
    const sigRequest = await chaindoc.signatures.createRequest({
      versionId: doc.document.versions[0].uuid,
      recipients: [{ email: "test@example.com" }],
      deadline: new Date(Date.now() + 86400000),
      embeddedFlow: true,
    });

    // 4. Create session
    const session = await chaindoc.embedded.createSession({
      email: "test@example.com",
      metadata: {
        documentId: doc.documentId,
        signatureRequestId: sigRequest.signatureRequest.uuid,
      },
    });

    expect(session.sessionId).toBeDefined();
    expect(session.status).toBe("active");
  });
});
```

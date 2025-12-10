# Chaindoc Server SDK - API Reference

> **Version:** 1.0.0
> **Package:** `@chaindoc_io/server-sdk`
> **License:** MIT
> **Node.js:** >= 18

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Chaindoc Class](#chaindoc-class)
- [Documents Module](#documents-module)
- [Signatures Module](#signatures-module)
- [Embedded Sessions Module](#embedded-sessions-module)
- [Media Module](#media-module)
- [KYC Module](#kyc-module)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)

---

## Overview

Chaindoc Server SDK provides a type-safe Node.js interface for the Chaindoc API. Use it to manage documents, create signature requests, handle file uploads, and integrate blockchain verification into your backend.

### Key Features

| Feature                    | Description                                       |
| -------------------------- | ------------------------------------------------- |
| **Zero Dependencies**      | Uses only Node.js 18+ built-in APIs               |
| **Full TypeScript**        | Complete type definitions for all APIs            |
| **Automatic Retries**      | Exponential backoff with configurable retry logic |
| **Blockchain Integration** | Document verification on blockchain               |
| **Embedded Signing**       | Session management for frontend SDK               |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Backend                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   const chaindoc = new Chaindoc({ secretKey });                 │
│                                                                  │
│   chaindoc.documents  ─────────────►  Create, Update, Verify    │
│   chaindoc.signatures ─────────────►  Signature Requests        │
│   chaindoc.embedded   ─────────────►  Frontend Sessions         │
│   chaindoc.media      ─────────────►  File Uploads              │
│   chaindoc.kyc        ─────────────►  Identity Verification     │
│                                                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Chaindoc API                                  │
│                 api.chaindoc.io                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
# npm
npm install @chaindoc_io/server-sdk

# yarn
yarn add @chaindoc_io/server-sdk

# pnpm
pnpm add @chaindoc_io/server-sdk
```

### Requirements

- Node.js 18 or higher (uses native `fetch`)
- Secret API key (`sk_...`)

---

## Quick Start

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";
import { readFile } from "fs/promises";

// 1. Initialize the SDK
const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
});

// 2. Upload a document file
const buffer = await readFile("./contract.pdf");
const file = new Blob([buffer], { type: "application/pdf" });
const { media } = await chaindoc.media.upload([file]);

// 3. Create a document
const doc = await chaindoc.documents.create({
  name: "Service Agreement",
  description: "Contract for consulting services",
  media: media[0],
  status: "published", // Triggers blockchain verification
  hashtags: ["#contract", "#2024"],
  meta: [{ key: "client", value: "Acme Corp" }],
});

// 4. Create a signature request
const sigRequest = await chaindoc.signatures.createRequest({
  versionId: doc.document.versions[0].uuid,
  recipients: [{ email: "signer@example.com" }],
  deadline: new Date("2024-12-31"),
  embeddedFlow: true,
});

// 5. Create session for frontend SDK
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: {
    documentId: doc.documentId,
    signatureRequestId: sigRequest.signatureRequest.uuid,
  },
});

// 6. Return sessionId to frontend
console.log("Session ID:", session.sessionId);
```

---

## Chaindoc Class

Main SDK class. All API modules are accessible through this instance.

### Constructor

```typescript
new Chaindoc(config: ChaindocConfig)
```

#### ChaindocConfig

| Property      | Type                     | Required | Default        | Description                                              |
| ------------- | ------------------------ | -------- | -------------- | -------------------------------------------------------- |
| `secretKey`   | `string`                 | **Yes**  | -              | API secret key (format: `sk_*`)                          |
| `environment` | `ChaindocEnvironment`    | No       | `'production'` | API environment (`production`, `staging`, `development`) |
| `timeout`     | `number`                 | No       | `30000`        | Request timeout (ms)                                     |
| `headers`     | `Record<string, string>` | No       | `{}`           | Custom headers                                           |
| `retry`       | `RetryConfig`            | No       | See below      | Retry configuration                                      |

#### Environments

| Environment   | API URL                        |
| ------------- | ------------------------------ |
| `production`  | `https://api.chaindoc.io`      |
| `staging`     | `https://api-demo.chaindoc.io` |
| `development` | `https://api-demo.chaindoc.io` |

#### RetryConfig

| Property      | Type     | Default | Description            |
| ------------- | -------- | ------- | ---------------------- |
| `maxRetries`  | `number` | `3`     | Maximum retry attempts |
| `baseDelayMs` | `number` | `1000`  | Initial retry delay    |
| `maxDelayMs`  | `number` | `10000` | Maximum retry delay    |

#### Example

```typescript
// Production (default)
const chaindoc = new Chaindoc({
  secretKey: "sk_live_xxxxxxxxxxxxx",
  timeout: 60000,
  retry: {
    maxRetries: 5,
    baseDelayMs: 500,
  },
});

// Development
const chaindocDev = new Chaindoc({
  secretKey: "sk_test_xxxxxxxxxxxxx",
  environment: "development",
});
```

---

### Properties

| Property     | Type         | Description         |
| ------------ | ------------ | ------------------- |
| `documents`  | `Documents`  | Document management |
| `signatures` | `Signatures` | Signature requests  |
| `embedded`   | `Embedded`   | Embedded sessions   |
| `media`      | `Media`      | File uploads        |
| `kyc`        | `Kyc`        | KYC verification    |

---

### Methods

#### `getApiKeyInfo()`

Get information about the current API key.

```typescript
async getApiKeyInfo(): Promise<ApiKeyInfo>
```

##### Response: ApiKeyInfo

```typescript
interface ApiKeyInfo {
  keyId: number;
  keyName: string;
  userId: number;
  lastUsedAt: string;
  isActive: boolean;
  accessLevel: string;
}
```

##### Example

```typescript
const info = await chaindoc.getApiKeyInfo();
console.log("Key name:", info.keyName);
console.log("Active:", info.isActive);
```

---

#### `healthCheck()`

Verify API connectivity and key validity.

```typescript
async healthCheck(): Promise<HealthCheckResponse>
```

##### Response: HealthCheckResponse

```typescript
interface HealthCheckResponse {
  status: string; // "ok"
  timestamp: string; // ISO timestamp
  apiKeyValid: boolean;
  userId: number;
}
```

##### Example

```typescript
const health = await chaindoc.healthCheck();
if (health.status === "ok" && health.apiKeyValid) {
  console.log("API connection successful");
}
```

---

## Documents Module

Manage documents and their versions. Access via `chaindoc.documents`.

### `create(params)`

Create a new document with initial version.

```typescript
async create(params: CreateDocumentParams): Promise<DocumentResponse>
```

#### CreateDocumentParams

| Property       | Type             | Required | Description                         |
| -------------- | ---------------- | -------- | ----------------------------------- |
| `name`         | `string`         | **Yes**  | Document name                       |
| `description`  | `string`         | **Yes**  | Document description                |
| `media`        | `Media`          | **Yes**  | Uploaded file (from `media.upload`) |
| `status`       | `DocumentStatus` | **Yes**  | `'draft'` \| `'published'`          |
| `meta`         | `MetaTag[]`      | **Yes**  | Metadata key-value pairs            |
| `hashtags`     | `string[]`       | **Yes**  | Search tags                         |
| `isForSigning` | `boolean`        | No       | Enable signing                      |
| `accessType`   | `AccessType`     | No       | Access level                        |
| `accessEmails` | `AccessEmail[]`  | No       | Email-based access                  |
| `accessRoles`  | `AccessRole[]`   | No       | Role-based access                   |

#### DocumentStatus

```typescript
type DocumentStatus =
  | "draft"
  | "published"
  | "archived"
  | "pending_signature"
  | "signed";
```

- `'draft'` - Document not verified on blockchain
- `'published'` - Triggers blockchain verification
- `'pending_signature'` - Awaiting signatures
- `'signed'` - All signatures collected

#### Response: DocumentResponse

```typescript
interface DocumentResponse {
  success: boolean;
  documentId: string;
  document: Document;
  message: string;
}
```

#### Example

```typescript
const doc = await chaindoc.documents.create({
  name: "NDA Agreement",
  description: "Non-disclosure agreement for Project X",
  media: uploadedMedia[0],
  status: "published",
  hashtags: ["#nda", "#projectx"],
  meta: [
    { key: "project", value: "Project X" },
    { key: "department", value: "Legal" },
  ],
  accessType: "restricted",
  accessEmails: [
    { email: "legal@company.com", level: "write" },
    { email: "partner@external.com", level: "read" },
  ],
});

console.log("Document ID:", doc.documentId);
console.log("Version UUID:", doc.document.versions[0].uuid);
```

---

### `update(documentId, params)`

Update a document by creating a new version.

```typescript
async update(documentId: string, params: UpdateDocumentParams): Promise<DocumentResponse>
```

> **Note:** Updates create new versions. Previous versions are preserved.

#### Example

```typescript
const updated = await chaindoc.documents.update("doc_xxx", {
  name: "NDA Agreement v2",
  description: "Updated terms",
  media: newMedia[0],
  status: "published",
  hashtags: ["#nda", "#projectx", "#v2"],
  meta: [{ key: "version", value: "2.0" }],
});
```

---

### `updateRights(documentId, params)`

Update document access control.

```typescript
async updateRights(documentId: string, params: UpdateDocumentRightsParams): Promise<DocumentResponse>
```

#### UpdateDocumentRightsParams

| Property       | Type            | Required | Description                                             |
| -------------- | --------------- | -------- | ------------------------------------------------------- |
| `accessType`   | `AccessType`    | **Yes**  | `'private'` \| `'public'` \| `'restricted'` \| `'team'` |
| `accessEmails` | `AccessEmail[]` | No       | Email-based permissions                                 |
| `accessRoles`  | `AccessRole[]`  | No       | Role-based permissions                                  |

#### Example

```typescript
await chaindoc.documents.updateRights("doc_xxx", {
  accessType: "public",
});
```

---

### `verify(params)`

Trigger blockchain verification for a document.

```typescript
async verify(params: VerifyDocumentParams): Promise<VerifyDocumentResponse>
```

#### VerifyDocumentParams

| Property          | Type     | Required | Description           |
| ----------------- | -------- | -------- | --------------------- |
| `versionHash`     | `string` | **Yes**  | Document version hash |
| `certificateHash` | `string` | No       | Certificate hash      |

#### Response: VerifyDocumentResponse

```typescript
interface VerifyDocumentResponse {
  success: boolean;
  verified: boolean;
  document?: {
    id: string;
    versionId: string;
    name: string;
    versionHash: string;
    status: string;
  };
  verification?: {
    txHash: string; // Blockchain transaction hash
    chainId: number; // Network ID
    status: string; // "verified"
    verifiedAt: string; // ISO timestamp
  };
}
```

---

### `getVerificationStatus(versionId)`

Get verification status for a document version.

```typescript
async getVerificationStatus(versionId: string): Promise<VerifyDocumentResponse>
```

#### Example

```typescript
const status = await chaindoc.documents.getVerificationStatus("version_uuid");

if (status.verified) {
  console.log("Verified on chain:", status.verification?.txHash);
}
```

---

## Signatures Module

Manage signature requests. Access via `chaindoc.signatures`.

### `createRequest(params)`

Create a signature request with one or more recipients.

```typescript
async createRequest(params: CreateSignatureRequestParams): Promise<SignatureRequestResponse>
```

#### CreateSignatureRequestParams

| Property        | Type          | Required | Description              |
| --------------- | ------------- | -------- | ------------------------ |
| `versionId`     | `string`      | **Yes**  | Document version UUID    |
| `recipients`    | `Recipient[]` | **Yes**  | Signers                  |
| `deadline`      | `Date`        | **Yes**  | Signing deadline         |
| `message`       | `string`      | No       | Message to signers       |
| `embeddedFlow`  | `boolean`     | No       | Enable embedded signing  |
| `isKycRequired` | `boolean`     | No       | Require KYC verification |
| `meta`          | `MetaTag[]`   | No       | Metadata                 |

#### Recipient

```typescript
interface Recipient {
  email: string; // Signer email
  shareToken?: string; // Sumsub KYC share token
}
```

#### Response: SignatureRequestResponse

```typescript
interface SignatureRequestResponse {
  signatureRequest: SignatureRequest;
  recipients: Signer[];
}

interface SignatureRequest {
  id: number;
  uuid: string;
  status: "pending" | "completed" | "expired" | "cancelled";
  dueDate: string;
  embeddedFlow?: boolean;
  isKycRequired: boolean;
  signers: Signer[];
  // ... more fields
}
```

#### Example

```typescript
const request = await chaindoc.signatures.createRequest({
  versionId: doc.document.versions[0].uuid,
  recipients: [
    { email: "signer1@example.com" },
    { email: "signer2@example.com" },
  ],
  deadline: new Date("2024-12-31"),
  message: "Please review and sign this agreement",
  embeddedFlow: true,
  isKycRequired: false,
});

console.log("Request ID:", request.signatureRequest.uuid);
console.log("Status:", request.signatureRequest.status);
```

---

### `getRequestStatus(requestId)`

Get current status of a signature request.

```typescript
async getRequestStatus(requestId: string): Promise<SignatureRequestStatus>
```

#### Response: SignatureRequestStatus

```typescript
interface SignatureRequestStatus {
  success: boolean;
  requestId: number;
  status: "pending" | "completed" | "expired" | "cancelled";
  totalSigners: number;
  signedCount: number;
  pendingCount: number;
  isCompleted: boolean;
  dueDate: string;
  signers: Signer[];
}
```

#### Example

```typescript
const status = await chaindoc.signatures.getRequestStatus("req_uuid");

console.log(`Progress: ${status.signedCount}/${status.totalSigners}`);

if (status.isCompleted) {
  console.log("All signatures collected!");
}
```

---

### `getMyRequests(pagination?)`

List signature requests created by current user.

```typescript
async getMyRequests(pagination?: PaginationParams): Promise<GetMyRequestsResponse>
```

#### PaginationParams

```typescript
interface PaginationParams {
  pageNumber?: number; // Starting page (1-indexed)
  pageSize?: number; // Items per page
}
```

#### Example

```typescript
const { items, total } = await chaindoc.signatures.getMyRequests({
  pageNumber: 1,
  pageSize: 20,
});

items.forEach((request) => {
  console.log(`${request.uuid}: ${request.status}`);
});
```

---

### `getSignatures(pagination?)`

List signature requests where current user is a signer.

```typescript
async getSignatures(pagination?: PaginationParams): Promise<GetSignaturesResponse>
```

#### Response: GetSignaturesResponse

```typescript
interface GetSignaturesResponse {
  items: SignatureRequest[];
  total: number;
  totalPending: number;
  totalCompleted: number;
  totalExpired: number;
  pageNumber: number;
  pageSize: number;
}
```

---

### `sign(params)`

Sign a document (API key owner must be a recipient).

```typescript
async sign(params: SignDocumentParams): Promise<SignResponse>
```

#### SignDocumentParams

| Property      | Type        | Required | Description            |
| ------------- | ----------- | -------- | ---------------------- |
| `requestId`   | `string`    | **Yes**  | Signature request UUID |
| `signatureId` | `number`    | **Yes**  | Signer ID              |
| `messageText` | `string`    | No       | Message with signature |
| `meta`        | `MetaTag[]` | No       | Metadata               |

---

## Embedded Sessions Module

Create sessions for frontend embedded signing. Access via `chaindoc.embedded`.

### `createSession(params)`

Create a session for embedded document signing.

```typescript
async createSession(params: CreateEmbeddedSessionParams): Promise<EmbeddedSessionResponse>
```

#### CreateEmbeddedSessionParams

| Property                      | Type     | Required | Description                |
| ----------------------------- | -------- | -------- | -------------------------- |
| `email`                       | `string` | **Yes**  | Signer's email             |
| `metadata`                    | `object` | **Yes**  | Session metadata           |
| `metadata.documentId`         | `string` | **Yes**  | Document ID                |
| `metadata.signatureRequestId` | `string` | No       | Signature request ID       |
| `metadata.returnUrl`          | `string` | No       | Redirect URL after signing |

#### Response: EmbeddedSessionResponse

```typescript
interface EmbeddedSessionResponse {
  success: boolean;
  sessionId: string; // Pass to frontend SDK
  email: string;
  status: string; // "active"
  expiresAt: string; // ISO timestamp
  expiresInMinutes: number; // Usually 10
  metadata: Record<string, unknown>;
  message: string;
  createdAt: string;
}
```

#### Example

```typescript
// Backend: Create session
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: {
    documentId: "doc_123",
    signatureRequestId: "req_456",
    returnUrl: "https://yourapp.com/signed",
    // Custom metadata
    orderId: "order_789",
  },
});

// Return sessionId to frontend
return { sessionId: session.sessionId };
```

```typescript
// Frontend: Use with Embed SDK
import { ChaindocEmbed } from "@chaindoc_io/embed-sdk";

const chaindoc = new ChaindocEmbed({ publicKey: "pk_xxx" });
chaindoc.openSignatureFlow({
  sessionId: session.sessionId, // From backend
  onSuccess: (data) => {
    /* ... */
  },
});
```

---

## Media Module

Handle file uploads. Access via `chaindoc.media`.

### `upload(files)`

Upload one or more files.

```typescript
async upload(files: File[] | Blob[]): Promise<MediaUploadResponse>
```

#### Supported File Types

| Category  | Extensions                                |
| --------- | ----------------------------------------- |
| Documents | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT |
| Images    | JPG, JPEG, PNG, GIF, WEBP, SVG            |
| Videos    | MP4, AVI, MOV, WMV                        |

#### Response: MediaUploadResponse

```typescript
interface MediaUploadResponse {
  success: boolean;
  media: Media[];
  message: string;
}

interface Media {
  type: "document" | "image" | "video" | "text";
  name: string;
  key: string;
  url: string;
  hash?: string;
  size?: number;
  thumbnail?: string;
  compressed?: string;
}
```

#### Example

```typescript
import { readFile } from "fs/promises";

// From file path
const buffer = await readFile("./document.pdf");
const file = new Blob([buffer], { type: "application/pdf" });

const { media } = await chaindoc.media.upload([file]);

console.log("Uploaded:", media[0].name);
console.log("URL:", media[0].url);

// Use in document creation
await chaindoc.documents.create({
  media: media[0],
  // ... other params
});
```

#### Multiple Files

```typescript
const files = [
  new Blob([await readFile("./doc1.pdf")], { type: "application/pdf" }),
  new Blob([await readFile("./doc2.pdf")], { type: "application/pdf" }),
];

const { media } = await chaindoc.media.upload(files);
// media[0], media[1], etc.
```

---

## KYC Module

Manage identity verification. Access via `chaindoc.kyc`.

### `share(params)`

Share KYC data for a user via Sumsub integration.

```typescript
async share(params: ShareKycParams): Promise<ShareKycResponse>
```

#### ShareKycParams

| Property     | Type     | Required | Description        |
| ------------ | -------- | -------- | ------------------ |
| `email`      | `string` | **Yes**  | User email         |
| `shareToken` | `string` | No       | Sumsub share token |

#### Response: ShareKycResponse

```typescript
interface ShareKycResponse {
  success: boolean;
  message: string;
  shareToken?: string;
  email: string;
  sharedAt: string;
  kycData?: {
    verified: boolean;
    firstName?: string;
    lastName?: string;
    dob?: string;
    country?: string;
    nationality?: string;
    reviewStatus?: string;
    applicantId?: string;
  };
  error?: string;
}
```

#### Example

```typescript
// Verify user before creating signature request
const kyc = await chaindoc.kyc.share({
  email: "signer@example.com",
  shareToken: "sumsub_token_xxx",
});

if (kyc.kycData?.verified) {
  // Create signature request with KYC requirement
  await chaindoc.signatures.createRequest({
    versionId: "version_uuid",
    recipients: [{ email: "signer@example.com" }],
    deadline: new Date("2024-12-31"),
    isKycRequired: true,
  });
}
```

---

## Error Handling

### ChaindocError

All API errors throw `ChaindocError`:

```typescript
import { Chaindoc, ChaindocError } from "@chaindoc_io/server-sdk";

try {
  await chaindoc.documents.create({
    /* ... */
  });
} catch (error) {
  if (error instanceof ChaindocError) {
    console.error("Message:", error.message);
    console.error("Status:", error.statusCode);
    console.error("Response:", error.response);
    console.error("Retryable:", error.isRetryable);
  }
}
```

### Properties

| Property      | Type                  | Description            |
| ------------- | --------------------- | ---------------------- |
| `message`     | `string`              | Error description      |
| `statusCode`  | `number \| undefined` | HTTP status code       |
| `response`    | `unknown`             | Full API response      |
| `isRetryable` | `boolean`             | Whether retry may help |

### Common Error Codes

| Status | Meaning      | Action                       |
| ------ | ------------ | ---------------------------- |
| 400    | Bad Request  | Check request parameters     |
| 401    | Unauthorized | Check API key                |
| 403    | Forbidden    | Check permissions            |
| 404    | Not Found    | Check resource ID            |
| 429    | Rate Limited | Automatic retry with backoff |
| 500+   | Server Error | Automatic retry              |

### Retry Logic

The SDK automatically retries on:

- HTTP 5xx errors
- HTTP 429 (rate limit)
- Network errors (ECONNRESET, timeout, etc.)

```typescript
// Customize retry behavior
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",
  retry: {
    maxRetries: 5, // More retries
    baseDelayMs: 500, // Start faster
    maxDelayMs: 30000, // Wait longer
  },
});
```

---

## TypeScript Types

### Full Type Exports

```typescript
import {
  // Main classes
  Chaindoc,
  ChaindocError,

  // Configuration
  ChaindocConfig,
  ChaindocEnvironment,
  RetryConfig,

  // Documents
  CreateDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentRightsParams,
  DocumentResponse,
  Document,
  DocumentVersion,
  DocumentStatus,
  AccessType,
  AccessEmail,
  AccessRole,
  VerifyDocumentParams,
  VerifyDocumentResponse,

  // Signatures
  CreateSignatureRequestParams,
  SignatureRequestResponse,
  SignatureRequest,
  SignatureRequestStatus,
  Signer,
  Recipient,
  SignDocumentParams,

  // Embedded
  CreateEmbeddedSessionParams,
  EmbeddedSessionResponse,

  // Media
  MediaUploadResponse,
  Media,
  MediaType,

  // KYC
  ShareKycParams,
  ShareKycResponse,
  KycData,

  // Common
  MetaTag,
  PaginationParams,
  ApiKeyInfo,
  HealthCheckResponse,
} from "@chaindoc_io/server-sdk";
```

---

## Complete Workflow Example

```typescript
import { Chaindoc, ChaindocError } from "@chaindoc_io/server-sdk";
import { readFile } from "fs/promises";

async function createSigningSession(
  documentPath: string,
  signerEmail: string
): Promise<string> {
  const chaindoc = new Chaindoc({
    secretKey: process.env.CHAINDOC_SECRET_KEY!,
  });

  try {
    // 1. Verify connectivity
    await chaindoc.healthCheck();

    // 2. Upload document
    const buffer = await readFile(documentPath);
    const file = new Blob([buffer], { type: "application/pdf" });
    const { media } = await chaindoc.media.upload([file]);

    // 3. Create document
    const doc = await chaindoc.documents.create({
      name: "Agreement",
      description: "Service agreement",
      media: media[0],
      status: "published",
      hashtags: ["#agreement"],
      meta: [],
    });

    // 4. Create signature request
    const sigRequest = await chaindoc.signatures.createRequest({
      versionId: doc.document.versions[0].uuid,
      recipients: [{ email: signerEmail }],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      embeddedFlow: true,
    });

    // 5. Create embedded session
    const session = await chaindoc.embedded.createSession({
      email: signerEmail,
      metadata: {
        documentId: doc.documentId,
        signatureRequestId: sigRequest.signatureRequest.uuid,
      },
    });

    return session.sessionId;
  } catch (error) {
    if (error instanceof ChaindocError) {
      console.error("Chaindoc Error:", error.message, error.statusCode);
    }
    throw error;
  }
}
```

---

## API Endpoints Reference

| Module     | Method                | HTTP | Endpoint                                       |
| ---------- | --------------------- | ---- | ---------------------------------------------- |
| Chaindoc   | getApiKeyInfo         | GET  | `/api/v1/me`                                   |
| Chaindoc   | healthCheck           | GET  | `/api/v1/health`                               |
| Documents  | create                | POST | `/api/v1/documents`                            |
| Documents  | update                | PUT  | `/api/v1/documents/{id}`                       |
| Documents  | updateRights          | PUT  | `/api/v1/documents/{id}/rights`                |
| Documents  | verify                | POST | `/api/v1/documents/verify`                     |
| Documents  | getVerificationStatus | GET  | `/api/v1/documents/versions/{id}/verification` |
| Signatures | createRequest         | POST | `/api/v1/signatures/requests`                  |
| Signatures | getRequestStatus      | GET  | `/api/v1/signatures/requests/{id}/status`      |
| Signatures | getMyRequests         | GET  | `/api/v1/signatures/requests`                  |
| Signatures | sign                  | POST | `/api/v1/signatures/sign`                      |
| Signatures | getSignatures         | GET  | `/api/v1/signatures`                           |
| Embedded   | createSession         | POST | `/api/v1/embedded/sessions`                    |
| Media      | upload                | POST | `/api/v1/media/upload`                         |
| KYC        | share                 | POST | `/api/v1/kyc/share`                            |

---

## Support

- **Documentation**: [chaindoc.io/docs](https://chaindoc.io/docs)
- **GitHub Issues**: [Report a bug](https://github.com/ChaindocIO/server-sdk/issues)
- **Email**: support@chaindoc.io

# Chaindoc Server SDK - API Reference

> **Version:** 3.x
> **Package:** `@chaindoc_io/server-sdk`
> **License:** MIT
> **Node.js:** >= 18

Every method of the SDK, what it calls and what it answers. The README walks through the main flows; upgrading from 2.x
is in [MIGRATION.md](../MIGRATION.md). Every type named here is exported from the package root.

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Chaindoc Class](#chaindoc-class)
- [Documents](#documents) · [Conversions](#conversions) · [Document comments](#document-comments)
- [Accounts](#accounts)
- [Signatures](#signatures) · [QES](#qes)
- [Embedded Sessions](#embedded-sessions)
- [Contracts](#contracts) · [Amendments](#amendments) · [Payment terms](#payment-terms) · [Termination](#termination)
- [Templates](#templates)
- [Invoices](#invoices) · [Transactions](#transactions) · [Counterparties](#counterparties) ·
  [Payment instructions](#payment-instructions) · [Tax treatments](#tax-treatments)
- [Media](#media)
- [Processes](#processes)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [API Endpoints Reference](#api-endpoints-reference)

---

## Overview

The SDK is a typed client of the Chaindoc public API (`/api/v1`). A document is a **text**: signature places are chips
in the text, and a signature request binds each recipient to a role of the text. A file (PDF, DOCX, ...) becomes a text
by **conversion**. A contract is a document signed by two sides (`business` and `contragent`), with payment terms and
invoices.

```
chaindoc.documents          text documents, versions, reading, access     (.comments)
chaindoc.conversions        a file becoming a text document
chaindoc.accounts           where a person can be addressed
chaindoc.signatures         signature requests, saved signatures          (.qes)
chaindoc.embedded           sessions for the signing window (embed SDK)
chaindoc.contracts          contracts and their signing                   (.agreements, .paymentTerms, .termination)
chaindoc.templates          templates and what is made from them
chaindoc.invoices           invoices and credit notes
chaindoc.transactions       payments
chaindoc.contragents        the counterparties' address book
chaindoc.paymentInstructions  bank, crypto and other payment details
chaindoc.taxTreatments      tax treatments for invoices
chaindoc.media              uploads (chunked upload into Storage)
chaindoc.processes          granted processes
Chaindoc.webhooks           webhook signature check (static)
```

---

## Installation

```bash
npm install @chaindoc_io/server-sdk
# or: yarn add @chaindoc_io/server-sdk / pnpm add @chaindoc_io/server-sdk
```

Node.js 18 or higher (native `fetch`) and a secret API key (`sk_...`). Every `/api/v1` call needs a Business plan or
above (`403 INTEGRATIONS_NOT_IN_PLAN`, `ChaindocPlanError`).

---

## Quick Start

```typescript
import { Chaindoc } from "@chaindoc_io/server-sdk";
import { readFile } from "fs/promises";

const chaindoc = new Chaindoc({ secretKey: process.env.CHAINDOC_SECRET_KEY! });

// 1. A file becomes a text document by conversion (202); wait for it
const file = new Blob([await readFile("./contract.pdf")], { type: "application/pdf" });
const { conversion } = await chaindoc.documents.createFromFile(file, { name: "Service Agreement" }, { filename: "contract.pdf" });
const ready = await chaindoc.conversions.wait(conversion.id);

// 2. Give the text a signer role with its signature chips (a converted text has none yet)
const { versionId } = await chaindoc.documents.addSignatureBlock(ready.documentId, {
  roles: [{ key: "client", name: "Client" }],
});

// 3. Send it: each recipient is bound to a role of the text
const request = await chaindoc.signatures.createRequest({
  versionId,
  recipients: [{ email: "signer@example.com", role: "client" }],
  deadline: new Date("2027-12-31"),
  embeddedFlow: true,
});

// 4. A session for the signing window (frontend: @chaindoc_io/embed-sdk)
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: { documentId: ready.documentId, signatureRequestId: request.requestId },
});
console.log(session.sessionId);
```

---

## Chaindoc Class

```typescript
new Chaindoc(config: ChaindocConfig)
```

### ChaindocConfig

| Property      | Type                     | Required | Default                     | Description                                                              |
| ------------- | ------------------------ | -------- | --------------------------- | ------------------------------------------------------------------------ |
| `secretKey`   | `string`                 | **Yes**  | -                           | API secret key (`sk_...`)                                                |
| `baseUrl`     | `string`                 | No       | `'https://api.chaindoc.io'` | The API's base URL; pass another backend's URL (with a key issued there) |
| `environment` | `ChaindocEnvironment`    | No       | -                           | **Deprecated, switches nothing**: every value calls `https://api.chaindoc.io` |
| `timeout`     | `number`                 | No       | `30000`                     | Request timeout (ms)                                                     |
| `headers`     | `Record<string, string>` | No       | `{}`                        | Custom headers                                                           |
| `retry`       | `RetryConfig`            | No       | see below                   | Retry configuration                                                      |

#### Base URL

The SDK calls the production API, `https://api.chaindoc.io`, unless you pass `baseUrl`. A key works only against the
backend that issued it: to call a non-production backend, pass its base URL (and a key issued there) as `baseUrl`.

`environment` is **deprecated and switches nothing**: `production`, `staging` and `development` all call
`https://api.chaindoc.io`, the production API, with your key (earlier docs pointed `staging` and `development` at a demo
host that no longer answers). Remove `environment` from your config, or keep it — it has no effect.

#### RetryConfig

| Property      | Type     | Default | Description            |
| ------------- | -------- | ------- | ---------------------- |
| `maxRetries`  | `number` | `3`     | Maximum retry attempts |
| `baseDelayMs` | `number` | `1000`  | Initial retry delay    |
| `maxDelayMs`  | `number` | `10000` | Maximum retry delay    |

Retries use exponential backoff. GET/HEAD are retried on 5xx, 429 and network errors. A write (POST/PUT/PATCH/DELETE)
is retried only on 429 or when the request never reached the server (`ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`); a 5xx,
a timeout or a reset connection surfaces as an error: read the object, then decide. Document writes carry an
`idempotencyKey` (generated if you pass none, reused on every attempt), so they are still retried on 5xx. Money calls
(`invoices.charge`, `markPaid`, credit notes, payment-instruction writes, the Stripe setting) are never retried
automatically.

```typescript
const chaindoc = new Chaindoc({
  secretKey: process.env.CHAINDOC_SECRET_KEY!,
  timeout: 60000,
  retry: { maxRetries: 5, baseDelayMs: 500 },
});

// Another backend (its own key)
const other = new Chaindoc({ secretKey: process.env.OTHER_SECRET_KEY!, baseUrl: process.env.OTHER_API_BASE_URL! });
```

### Email handling

The SDK trims and lowercases every email value before sending it (`email`, `signerEmail`, and the emails inside
`recipients`, `slotAssignments`, `accessEmails` and `contragent`). Your input objects are not mutated.

### Methods

```typescript
async getApiKeyInfo(): Promise<ApiKeyInfo>          // GET /api/v1/me
async healthCheck(): Promise<HealthCheckResponse>   // GET /api/v1/health

interface ApiKeyInfo {
  keyId: string;
  keyName: string;
  lastUsedAt: string;
  isActive: boolean;
  accessLevel: string;
}

interface HealthCheckResponse {
  status: string;       // "ok"
  timestamp: string;    // ISO
  apiKeyValid: boolean;
}
```

---

## Documents

`chaindoc.documents`. A document is a text with chips (`format: 'text'`). Documents made as a file before documents
became text read `format: 'file'`: they can be read, downloaded and verified, and are sent only after `convert()`.

| Method | Answers | Notes |
| --- | --- | --- |
| `create(params: CreateDocumentFromContentParams)` | `DocumentResponse` (201) | A text from `content` |
| `createFromStorage(params: CreateDocumentFromStorageParams)` | `DocumentConversionResponse` (202) | A Storage file, converted; always lands as a draft |
| `createFromFile(file: Blob, params, options?)` | `DocumentConversionResponse` (202) | `media.uploadChunked` + `createFromStorage` in one call |
| `update(documentId, params: UpdateDocumentWithContentParams)` | `UpdateDocumentTextResponse` (200) | Next version from text; `baseVersionId` is the version you read |
| `update(documentId, params: UpdateDocumentWithFileParams)` | `DocumentConversionResponse` (202) | Next version from a Storage file |
| `getContent(documentId, { versionId? })` | `DocumentContentResponse` | The text with its signer `roles[]` and `fields[]` |
| `addSignatureBlock(documentId, params: AddSignatureBlockParams)` | `AddSignatureBlockResponse` | Adds roles with Signature and Date signed chips (next version) |
| `convert(documentId, { idempotencyKey? })` | `DocumentConversionResponse` (202) | A `file` document's own file into its next version |
| `get(documentId)` | `GetDocumentResponse` | `format`, `sendable`, current version |
| `getVersions(documentId, { pageNumber?, pageSize? })` | `GetDocumentVersionsResponse` | Version history |
| `download(versionId)` / `preview(versionId)` | `DownloadResult` | A version's bytes (attachment / inline) |
| `updateRights(documentId, params: UpdateDocumentRightsParams)` | `DocumentResponse` | `accessType` and `accessEmails` |
| `verify({ versionHash, certificateHash? })` | `VerifyDocumentResponse` | Blockchain verification of a version hash |
| `getVerificationStatus(versionId)` | `VerifyDocumentResponse` | |
| `search(params?: DocumentSearchParams)` / `listShared(params?)` | `DocumentListResponse` | The key's workspace's documents / shared with it |
| `getActivity(documentId)` / `getDownloads(documentId)` | `DocumentActivityResponse` / `DocumentDownloadsResponse` | |
| `sendPublicLink(documentId, { email, text? })` | `SendPublicLinkResponse` | A public document only |

### Creating a document

```typescript
// From text: `content` is the engine's content; `mode: 'template'` holds fields and signer roles
interface CreateDocumentFromContentParams {
  name: string;
  content: DocumentContent;           // { version: 1 | 2 | 3, mode: 'document' | 'template', doc }
  status: "draft" | "published";
  description?: string;
  meta?: MetaTag[];                   // { key, value }
  hashtags?: string[];
  accessType?: AccessTypeInput;       // 'private' | 'public' | 'restricted' | 'team'
  accessEmails?: AccessEmail[];       // { email, level?: 'read' | 'write', account?: AccountChoice }
  idempotencyKey?: string;            // the same key again answers the same document
}

// From a file already in Storage (media.uploadChunked); no `meta`, always a draft
interface CreateDocumentFromStorageParams {
  storageFileId: string;
  name: string;
  description?: string;
  hashtags?: string[];
  status?: "draft";
  accessType?: AccessTypeInput;
  accessEmails?: AccessEmail[];
  idempotencyKey?: string;
}

interface DocumentResponse {
  success: boolean;
  documentId: string;
  document: {
    id: string;
    txtId: string;
    accessType: AccessType;
    currentVersion: { id: string; name: string; status: DocumentStatus; versionHash?: string } | null;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}
```

The server reads and writes content **version 3** (`getContent` answers `3`; `1` and `2` are still accepted on a
write): send back what you read, `version` included. A temporary upload (`media.upload`) is not a document source
(`422 DOCUMENT_FILE_VIA_STORAGE`): a file goes through Storage.

```typescript
const doc = await chaindoc.documents.create({
  name: "NDA",
  status: "draft",
  content: { version: 3, mode: "document", doc: { type: "doc", content: [] } },
});
```

### Reading the text and its roles

```typescript
interface DocumentContentResponse {
  success: boolean;
  versionId: string;
  contentVersion: number;
  content: DocumentContent;
  roles: Array<{ id: string; key: string; name: string }>;   // `key` is what `recipients[].role` names
  fields: Array<{ id: string; key: string; name: string; type: string; filledBy: string; required: boolean }>;
}

interface AddSignatureBlockParams {
  roles: Array<{ key: string; name: string }>;
  baseVersionId?: string;     // the version you read; another current version is 409 DOCUMENT_WRITING_BASE_MOVED
  idempotencyKey?: string;
}

interface AddSignatureBlockResponse {
  success: boolean;
  documentId: string;
  versionId: string;          // the new version that holds the roles and their chips
  roles: string[];
}
```

A role the text holds already is `SIGNATURE_ROLE_TWICE`; a `file` document is `422 DOCUMENT_FILE_CONVERTS` (convert it
first).

### Reading a document

```typescript
interface GetDocumentResponse {
  success: boolean;
  document: {
    id: string;
    txtId: string;
    accessType: AccessType;
    format: "text" | "file";
    // true for a text whose roles each have a signature chip (and nothing blocks the send), with no open or completed
    // request on its current version; false for a file, a text without roles, and once it was sent
    sendable: boolean;
    currentVersion: PublicDocumentVersion | null;
    createdAt: string;
    updatedAt: string;
  };
}
```

`DownloadResult` is `{ data: ArrayBuffer; contentType: string; fileName?: string }`.

---

## Conversions

`chaindoc.conversions`. A conversion makes a file into a text document (`kind: 'new'`) or into a document's next
version (`kind: 'version'`).

| Method | Answers | Notes |
| --- | --- | --- |
| `get(conversionId)` | `DocumentConversionResponse` | Where it stands |
| `wait(conversionId, options?)` | `ReadyDocumentConversion` | Polls with backoff until `ready` |

```typescript
interface DocumentConversion {
  id: string;
  status: "converting" | "ready" | "failed";
  kind: "new" | "version";
  documentId: string | null;   // set when ready (always for `version`)
  versionId: string | null;    // the made version, when ready
  review?: string | null;      // on ready: 'ready_for_review' | 'needs_review'
  progress?: { stage: string | null; page: number | null; pages: number | null } | null;   // while converting
  failure?: { code: string } | null;                                                      // when failed
}

interface WaitForConversionOptions {
  timeoutMs?: number;       // default 10 minutes
  intervalMs?: number;      // first poll delay, default 1000
  maxIntervalMs?: number;
  backoffFactor?: number;
  onPoll?: (conversion: DocumentConversion) => void;
}
```

`wait` throws `ChaindocConversionFailedError` (`conversionId`, `failureCode`) for a failed conversion and
`ChaindocConversionTimeoutError` past `timeoutMs` (the conversion may still finish: poll again with the id). Instead of
polling, subscribe to `document.conversion.completed` / `document.conversion.failed`.

---

## Document comments

`chaindoc.documents.comments`.

| Method | Answers | Notes |
| --- | --- | --- |
| `add(documentId, { content })` | `AddCommentResponse` | A top-level comment; `sk_` key and collaborate access |
| `list(documentId, { pageNumber?, pageSize? })` | `CommentListResponse` | Top-level comments with nested replies |

---

## Accounts

`chaindoc.accounts`. A person is addressed by `account`: their personal account or a workspace they can be sent to.

```typescript
async lookup(params: { emails: string[] }): Promise<AccountLookupResponse>   // 1 to 25 addresses

interface AccountLookupResponse {
  results: Array<{
    email: string;
    status: "not_registered" | "hidden" | "options";
    options?: Array<{ kind: "personal" | "workspace"; workspaceId?: string; workspaceName?: string; memberCount?: number; personName?: string }>;
  }>;
}

type AccountChoice = { kind: "personal" } | { kind: "workspace"; workspaceId: string };
```

Pass an option as `account` on recipients, access grants and template slots, or as `contragentAccount` on a contract.

---

## Signatures

`chaindoc.signatures`.

| Method | Answers | Notes |
| --- | --- | --- |
| `createRequest(params: CreateSignatureRequestParams)` | `SignatureRequestResponse` | Recipients bound by role |
| `getRequestStatus(requestId)` | `SignatureRequestStatus` | Each signer's role, progress, decline, KYC |
| `getMyRequests({ pageNumber?, pageSize?, status? })` | `GetMyRequestsResponse` | `status`: `'all' \| 'pending' \| 'completed' \| 'declined'` |
| `editRequest(requestId, { signerId, recipient, account? })` | `EditSignatureRequestResponse` | Reassign a signer slot of a pending request |
| `cancel(requestId)` | `CancelSignatureRequestResponse` | |
| `resend(requestId, { deadline? })` | `ResendSignatureRequestResponse` | A cancelled or expired request: a NEW request over a fresh copy |
| `remind(requestId, { signerEmails? })` | `RemindSignatureRequestResponse` | 12-hour cooldown per signer (`skipped`) |
| `sign({ requestId, signatureId, messageText?, meta? })` | sign result | The key's own act (see below) |
| `getSignatures(pagination?)` | `GetSignaturesResponse` | The workspace's saved signatures (`hash`) |
| `createSignature({ media })` | `CreateSignatureResponse` | A saved signature from an uploaded image |
| `validatePdfSignatures(file)` | `ValidatePdfSignaturesResponse` | DSS validation of a PDF's signatures |
| `downloadCertificate(versionId)` | `DownloadResult` | Certificate of Completion (PDF) |
| `downloadSignedDocument(versionId)` | `DownloadResult` | The PAdES-signed PDF of a completed request |

### `createRequest(params)`

```typescript
interface CreateSignatureRequestParams {
  versionId: string;          // a version of a text document; a file version is DOCUMENT_FILE_CONVERTS
  recipients: Recipient[];
  deadline: Date;
  message?: string;
  embeddedFlow?: boolean;     // the signers sign in your page (embedded sessions)
  isKycRequired?: boolean;    // identity verification before signing
  meta?: MetaTag[];
}

interface Recipient {
  email: string;
  role?: string;              // the text's role key (getContent().roles[].key); required when the text holds roles
  account?: AccountChoice;    // where the person is addressed (an option of accounts.lookup)
  signingMethod?: "embedded" | "delegated";
}

interface SignatureRequestResponse {
  success: boolean;
  requestId: string;
  signatureRequest: {
    id: string;
    status: "pending" | "completed" | "expired" | "cancelled";
    versionId?: string;
    dueDate: string;
    isKycRequired: boolean;
    signers: Array<{ id: string; email: string; signedAt?: string; hasSigned: boolean }>;
  } | null;
  message: string;
}
```

Signature places are chips in the text; there is no coordinate input. Every role stands for exactly one recipient. A
request is refused before anything is sent when the text cannot be signed as it is: `409 SETUP_BLOCKED` (`blockers[]`),
`SIGNATURE_ROLE_REQUIRED` / `SIGNATURE_ROLE_UNKNOWN` / `SIGNATURE_ROLE_UNASSIGNED`, `422 DOCUMENT_FILE_CONVERTS` (`ChaindocSigningSetupError`,
`ChaindocDocumentFileError`).

```typescript
const { roles, versionId } = await chaindoc.documents.getContent(documentId);
const request = await chaindoc.signatures.createRequest({
  versionId,
  recipients: [{ email: "signer@example.com", role: roles[0]!.key }],
  deadline: new Date("2027-12-31"),
  embeddedFlow: true,
});
console.log(request.requestId, request.signatureRequest?.status);
```

### `getRequestStatus(requestId)`

```typescript
interface SignatureRequestStatus {
  success: boolean;
  requestId: string;
  // By the server's clock: past the deadline it reads `expired` before the nightly sweep writes it.
  // A declined request reads `cancelled`; `declinedAt` tells it apart.
  status: "pending" | "completed" | "expired" | "cancelled";
  versionId?: string;
  totalSigners: number;
  signedCount: number;
  pendingCount: number;
  isCompleted: boolean;
  dueDate: string;
  signers: Signer[];
  declinedAt?: string | null;   // null unless declined
  declinedBy?: { email?: string; username?: string };
  declineComment?: string;
  declinedVia?: "document" | "contract";
}

interface Signer {
  id: string;
  email: string;
  role?: string | null;          // the text's role this signer was bound to
  signedAt?: string;
  hasSigned: boolean;
  signatureKind?: "internal" | "qes";
  hasContributed?: boolean;
  requiredSignatureKind?: "internal" | "qes" | null;
  qes?: QesSignerFacts;
  kyc?: "verified" | "pending" | "rejected";   // only where the request asks for identity verification
  signer?: { username?: string; email?: string } | null;
}
```

On a request with `isKycRequired`, each signer carries `kyc`: `verified` (passed), `pending` (not completed yet, or the
provider asked them to resubmit — they can still pass) or `rejected` (refused for good: they cannot pass the check, so
they will not sign this request — cancel it or send it to someone else; `remind` lists them in `skipped`). A request
without the check carries no `kyc`. In the signing window such a signer sees a final screen, and your page hears `ERROR`
with `code: "KYC_REJECTED"` once.

`hasSigned` and `signedCount` count a signer who has nothing left to do: they signed, or they agreed on the
platform-signature lane (that signature is made when the last signer acts). A signer who agreed to sign with their own
certificate is not counted until their device signs. Each signer also carries how they sign: `signatureKind` (`internal`
— the platform's signature, `qes` — their own certificate), `hasContributed` (they agreed), `requiredSignatureKind`
(`null` — nothing required), and, once they signed with their own certificate, `qes`:

```typescript
qes?: {
  certificate: { subject: string | null; issuer: string | null; serial: string | null };
  qualifiedCertificate: boolean | null; // true only when the validator confirmed a qualified certificate
  legalClass: string;                   // e.g. "Electronic Signature (qualification not established)"
  containerProfile: string | null;      // e.g. "PAdES-BES"
  validatorLevel: string | null;
}
```

The list (`getMyRequests`) carries the same `role` and decline fields on each item, plus `createdAt` and `completedAt`
(the last signature; `null` until completed). `remind` on a request that is not pending answers
`400 SIGNATURE_REQUEST_NOT_PENDING` (`status`).

### `sign(params)`

Signs on a signer row as the integration key. The act is the key's and is attributed to the key, not to the key's human
owner; the signer row is named by `signatureId`, and the right to act on it comes from that row, never from the key
owner's e-mail address matching it. The key's workspace must be one of the signatories. See
[SERVICE_ACT_CLAIMS.md](./SERVICE_ACT_CLAIMS.md).

### QES

`chaindoc.signatures.qes` — a signer signs with their own certificate (a key file or a smart card); the private key never
reaches the API or the SDK.

| Method | Answers | Notes |
| --- | --- | --- |
| `promise(requestId, { fieldValues?, meta?, signatureHash? })` | `QesPromiseResponse` | Phase 0: the signer agrees |
| `prepare(requestId, { signerCertPem, chainPem? })` | `QesPrepareResponse` | Phase 1: certificate in, `dataToSignB64` + `sessionId` out |
| `finalize(requestId, { sessionId, signatureValueB64 })` | `QesFinalizeResponse` | Phase 2: the device's signature embedded (PAdES) |

---

## Embedded Sessions

`chaindoc.embedded`. A session for the signing window that `@chaindoc_io/embed-sdk` opens in your page.

```typescript
async createSession(params: CreateEmbeddedSessionParams): Promise<EmbeddedSessionResponse>
```

**What `email` decides.** The address selects, at creation and once, which signer on the signature request this session
is for; the session then acts on that signer and on no other, whatever happens to the address afterwards. The one-time
code sent to it is what authorises the acts performed in the session — signing, filling variables, starting KYC.

A session is refused when the address is on no signer of the request. It is also refused, at the moment it tries to
act, when the signer it names is already linked to a **different** Chaindoc account: holding an address is not the same
as being the person the document was sent to.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | `string` | **Yes** | The signer's email |
| `metadata.documentId` | `string` | No\* | Document UUID (\*required without `contractId` / `contractSigningRequestId`) |
| `metadata.signatureRequestId` | `string` | No | Signature request UUID |
| `metadata.contractId` | `string` | No | Contract UUID: its document and open signing request are found by it |
| `metadata.contractSigningRequestId` | `string` | No | A contract signing request (`signingRequestId` of `contracts.send` / `agreements.initiateSigning`) |
| `metadata.returnUrl` | `string` | No | Redirect URL after signing |

**Contracts and amendments.** With `contractId` the session is for the contract's open signing request: its own while
the contract is being signed (`pending_signature`), or an amendment's while one is (`pending_amendment`) — the window then
shows the amendment of the named contract, and the signer signs or declines it there, as in the app. The two are never
open at once. You may also name the request itself — `contractSigningRequestId`, the `signingRequestId` that
`contracts.send` and `agreements.initiateSigning` answer, beside `contractId` or alone. A named request that is no
longer pending is refused, not replaced by another one.

No session is created, and no code is mailed, when there is nothing to sign: `400 EMBEDDED_SIGNING_REQUEST_CLOSED`
(`status`: signed, declined, cancelled or expired), `400 EMBEDDED_CONTRACT_NOT_SIGNABLE` (a contract never sent for
signing), `400 NOT_YOUR_TURN` (an ordered request whose earlier signer has not signed) — or when what is named does not
fit together: `400 EMBEDDED_SESSION_REQUEST_MISMATCH` (a request, signature request or document named beside
`contractId` that is not that contract's, or two names of different requests). The signing window always asks the signer
for a reason before a decline.

```typescript
interface EmbeddedSessionResponse {
  success: boolean;
  sessionId: string;          // pass to the embed SDK
  email: string;
  status: string;             // "active"
  expiresAt: string;
  expiresInMinutes: number;   // usually 10
  metadata: Record<string, unknown>;
  message: string;
  createdAt: string;
}
```

```typescript
// A document
const session = await chaindoc.embedded.createSession({
  email: "signer@example.com",
  metadata: { documentId, signatureRequestId: request.requestId, returnUrl: "https://yourapp.com/signed" },
});

// The counterparty signs or declines an amendment in your page
const { signingRequestId } = await chaindoc.contracts.agreements.initiateSigning(contractId, agreementId);
const amendmentSession = await chaindoc.embedded.createSession({
  email: "counterparty@example.com",
  metadata: { contractId, contractSigningRequestId: signingRequestId },
});
```

```typescript
// Frontend
import { ChaindocEmbed } from "@chaindoc_io/embed-sdk";

const embed = new ChaindocEmbed({ publicKey: "pk_xxx" });
embed.openSignatureFlow({ sessionId, onSuccess: (data) => { /* ... */ } });
```

---

## Contracts

`chaindoc.contracts`. A contract's document is a text with the two sides placed as signature chips: roles `business`
and `contragent` (`documents.addSignatureBlock`). Statuses (`ContractStatus`): `draft` → `pending_signature` →
`active` (`pending_amendment` while an amendment is being signed) → `termination_pending` → `terminated`; also
`suspended`, `expired` and `rejected`.

| Method | Answers | Notes |
| --- | --- | --- |
| `create(params: CreateContractParams)` | `ContractResponse` | A DRAFT with a document and a counterparty |
| `createMinimal(params)` | `ContractResponse` | A DRAFT with the bare minimum (document + email + title) |
| `createEmpty(params)` | `ContractResponse` | An invoice-only contract, active at once |
| `import(params)` | `ContractResponse` | A contract signed outside the platform, active at once |
| `list({ page?, limit?, status?, search? })` | `ContractListResponse` | |
| `get(contractId)` | `ContractResponse` | Full detail with payment terms and signing request |
| `getStatus(contractId)` | `ContractStatusResponse` | Signing progress and payment summary |
| `getActivities(contractId, { page?, limit? })` | `ContractActivitiesResponse` | Activity log |
| `getStats(contractId)` | `ContractStatsResponse` | Value, paid / pending, invoice count |
| `update(contractId, params: UpdateContractParams)` | `ContractResponse` | DRAFT only; only provided fields apply |
| `attachDocument(contractId, { documentId })` | `ContractResponse` | A document for a draft made without one |
| `addPaymentSetup(contractId, params: PaymentSetupParams)` | `ContractResponse` | Payment terms for a DRAFT made without them |
| `setPaymentInstruction(contractId, id \| null)` | `ContractPaymentInstructionAssignedResponse` | The contract level of the payment-instruction cascade |
| `setStripePayment(contractId, { stripePaymentAllowed })` | `ContractResponse` | Card payment by Stripe on or off |
| `send(contractId, params?: ContractSendParams)` | `ContractSendResponse` | Into signing; answers `signingRequestId` |
| `cancel(contractId)` | `ContractActionResponse` | A DRAFT |
| `delete(contractId)` | `ContractActionResponse` | A DRAFT |
| `terminate(contractId, { reason? })` | `ContractActionResponse` | An ACTIVE contract becomes `termination_pending` |
| `setupRecurring(contractId, params: RecurringSetupParams)` | `ContractResponse` | Recurring payments on an imported ACTIVE contract |
| `resendRecurringApproval(contractId)` / `cancelRecurringApproval(contractId)` | `ContractActionResponse` | |
| `listSigningRequests(contractId)` | `SigningRequestListResponse` | Every signing request, summary |
| `getSigningRequest(contractId, requestId)` | `SigningRequestGetResponse` | With signers |
| `resendSigningRequest(contractId, requestId)` | `SigningRequestActionResponse` | Reminds the counterparty |
| `cancelSigningRequest(contractId, requestId)` | `SigningRequestActionResponse` | Not once any side has signed |
| `businessSign(contractId, requestId, { signatureHash, meta? })` | `BusinessSignResponse` | The business side signed by the integration key |

### `create(params)`

```typescript
interface CreateContractParams {
  documentId: string;
  title: string;
  description?: string;
  contragent: ContragentInfo;            // { email, name?, legalName?, entityType?, phone?, billingAddress?, taxId?, vatNumber?, registrationNumber? }
  contragentAccount?: AccountChoice;     // the workspace option accounts.lookup offered for the counterparty
  startDate?: string;                    // ISO 8601, min 24h from now
  endDate?: string;
  autoRenew?: boolean;
  currencyCode?: string;                 // ISO 4217 (default USD)
  terminationType?: TerminationType;
  noticePeriodDays?: number;             // min 14
  paymentTerms?: PaymentTermInput[];
  paymentMethodRequired?: boolean;       // the counterparty keeps a card on file before signing
  preferredPaymentMethodType?: "card" | "bank_transfer";
  stripePaymentAllowed?: boolean;        // omit to inherit the business default
  signingPolicy?: { business?: "embedded" | "delegated"; contragent?: "embedded" };
}

interface ContractResponse {
  success: boolean;
  contractId?: string;
  contract: Contract;      // id, title, status, origin, document, contragent, dates, currencyCode, paymentTerms,
                           // signingPolicy, signingRequest, ...
  message?: string;
}
```

### `send(contractId, params?)`

```typescript
interface ContractSendParams {
  messageToSigners?: string;
  deadline?: Date;
  isKycRequired?: boolean;
  signingLane?: "internal" | "qes";                                    // both sides
  signingLaneByParty?: { business?: "internal" | "qes"; contragent?: "internal" | "qes" };   // per side
}

interface ContractSendResponse {
  success: boolean;
  contractId: string;
  status: string;
  signingRequestId: string;   // name it as metadata.contractSigningRequestId of an embedded session
  message: string;
}
```

`send` places each side's signature on its chips in the text, as the Chaindoc app's Send does. It refuses before anything
is created (the contract stays a draft):

| Answer | When | What to do |
| --- | --- | --- |
| `409 SETUP_BLOCKED` (`blockers[]`) | a side has no signature chip (a text without roles: both) | `documents.addSignatureBlock` with `business` and `contragent` |
| `400 SIGNATURE_ROLE_UNKNOWN` | the text holds a role other than `business` / `contragent` | use the two side roles |
| `422 DOCUMENT_FILE_CONVERTS` (`convert`) | the document is a file | `documents.convert`, `conversions.wait`, place the chips, send |
| `400 KYC_NOT_VERIFIED` | `isKycRequired` with `signingPolicy.business: 'delegated'`, and the workspace Owner has not passed identity verification | the Owner verifies in the app first |

The sides may sign by different methods (one `qes`, the other `internal`): each signs with its own, and the contract
becomes `active` once both have signed. A contract whose business side signs by delegation takes no `qes` on any side
(`QES_DELEGATED_AUTO_SIGN_REFUSED`). With `signingPolicy.business: 'delegated'` the business side is signed at `send`, so
`cancelSigningRequest` then answers `400 SIGNING_REQUEST_HAS_A_SIGNATURE`: the request ends when the counterparty signs
or declines, or when its deadline passes.

### Amendments

`chaindoc.contracts.agreements`. An amendment is a document layered on an ACTIVE contract and signed by both sides.
**An amendment carries no money**: nothing is charged by it, and it cannot add, change or end a payment term.

| Method | Answers | Notes |
| --- | --- | --- |
| `create(contractId, params: CreateAgreementParams)` | `AgreementEnvelope` | A DRAFT amendment |
| `list(contractId)` | `AgreementListResponse` | |
| `get(contractId, agreementId)` | `AgreementEnvelope` | |
| `initiateSigning(contractId, agreementId, params?)` | `AgreementSigningResponse` | Into signing; the contract is `pending_amendment` |
| `delete(contractId, agreementId)` | `AgreementDeleteResponse` | A DRAFT |

```typescript
interface CreateAgreementParams {
  documentId: string;
  title: string;
  description?: string;
  effectiveDate?: string;     // ISO 8601
  /** @deprecated `true` is refused with 422 AMENDMENT_CARRIES_NO_MONEY. */
  modifiesPaymentTerms?: boolean;
  /** @deprecated A non-empty list is refused with 422 AMENDMENT_CARRIES_NO_MONEY. */
  paymentTermModifications?: PaymentTermModificationInput[];
}
```

`modifiesPaymentTerms: true` or any `paymentTermModifications` is refused with `422 AMENDMENT_CARRIES_NO_MONEY`; the two
fields stay in the types only so that existing code compiles. Change a contract's money through invoices: a one-off by
`invoices.create` under the contract, a recurring payment by a series of invoices (in the Chaindoc app;
`contracts.setupRecurring` for an imported contract).

`initiateSigning` takes the same `messageToSigners`, `deadline`, `isKycRequired`, `signingLane` and `signingLaneByParty`
as `contracts.send`, refuses the same way, and answers the `signingRequestId` the embedded session names. Signed:
`additional_agreement.signed`; declined: `contract.status_changed` (`pending_amendment` → `active`).

### Payment terms

`chaindoc.contracts.paymentTerms` — a DRAFT contract's terms; the currency is the contract's.

| Method | Answers |
| --- | --- |
| `list(contractId)` | `PaymentTermListResponse` |
| `create(contractId, params: PaymentTermInput)` | `PaymentTermEnvelope` |
| `update(contractId, termId, params: UpdatePaymentTermParams)` | `PaymentTermEnvelope` |
| `delete(contractId, termId)` | `PaymentTermDeleteResponse` |

```typescript
interface PaymentTermInput {
  type: PaymentTermType;        // 'deposit' | 'recurring' | 'one_time'
  name: string;
  description?: string;
  amount: string;               // decimal as string
  frequency?: PaymentFrequency;
  dayOfPeriod?: number;         // 1-28
  startDate?: string;
  endDate?: string;
  totalPayments?: number;
  dueDate?: string;             // one_time
  autoCharge?: boolean;         // default true
}
```

### Termination

`chaindoc.contracts.termination`.

| Method | Answers | Notes |
| --- | --- | --- |
| `get(contractId)` | `TerminationRequestEnvelope` | The pending request, else the latest, else `null` |
| `getStatus(contractId)` | `TerminationStatusEnvelope` | Outstanding invoices, upcoming payments, earliest effective date |
| `getHistory(contractId)` | `TerminationHistoryEnvelope` | |
| `approve(contractId, params?)` | `TerminationApproveEnvelope` | Mutual approval: terminated on the effective date (`contract.terminated`) |
| `reject(contractId, { reason })` | `ContractActionResponse` | Back to `active` |
| `cancel(contractId)` | `ContractActionResponse` | The initiator side only; back to `active` |

---

## Templates

`chaindoc.templates`. A template's content is the engine's content in `mode: 'template'` (`{ version: 3, mode:
'template', doc }`; `1` and `2` are accepted). Content goes into a **working copy** and names the `revision` it was read
at; publishing makes the next version. Old-format templates answer `410 TEMPLATE_RETIRED`, the old `contentJson` format
`TEMPLATE_FORMAT_RETIRED`.

| Method | Answers | Notes |
| --- | --- | --- |
| `list({ page?, limit?, status?, search? })` | `TemplateListResponse` | `status`: `'draft' \| 'published' \| 'archived'` |
| `get(templateId)` | `TemplateGetResponse` | Current and last-published versions; `workingCopy` to a key that may edit |
| `getVersions(templateId)` | `TemplateVersionsResponse` | Each version's variables schema and signer slots |
| `create(params: CreateTemplateParams)` | `TemplateEnvelope` | A DRAFT held in its working copy |
| `update(templateId, params: UpdateTemplateParams)` | `TemplateEnvelope` | `content` with the `revision` it was read at |
| `publish(templateId, { changelog?, revision? })` | `TemplateEnvelope` | The working copy as the next version |
| `archive(templateId)` / `restore(templateId)` | `TemplateEnvelope` | |
| `delete(templateId)` | `TemplateDeleteResponse` | For good; documents made from it stay |
| `createDocument(templateId, params)` | `TemplateDocumentResponse` | A published template printed as a draft document |
| `sendForSigning(templateId, params)` | `TemplateSignatureRequestResponse` | Printed and sent for signature at once |
| `createContract(templateId, params)` | `TemplateContractResponse` | Printed as a new contract's paper, its signing started |

```typescript
interface CreateTemplateParams {
  name: string;
  description?: string;
  category: "contract" | "agreement" | "invoice" | "nda" | "proposal" | "letter" | "other";
  content: DocumentContent;               // unreadable content is 422 TEMPLATE_CONTENT_REFUSED
  variablesSchema?: TemplateVariableInput[];   // hints; variables and signer slots are read off the content
  signatureRequirements?: TemplateSignatureRequirement[];
  signerSlots?: TemplateSignerSlot[];
  renderConfig?: TemplateRenderConfig;
  meta?: string[];
}

interface UpdateTemplateParams {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  content?: DocumentContent;
  revision?: number;          // required with content (422 TEMPLATE_REVISION_REQUIRED); moved: 409 TEMPLATE_WORKING_COPY_MOVED
  allowEmpty?: boolean;
  // variablesSchema, signatureRequirements, signerSlots, renderConfig as in create
}

interface CreateDocumentFromTemplateParams {
  documentName: string;
  documentDescription?: string;
  variables: Record<string, string | number | boolean>;   // a value its field cannot hold: TEMPLATE_VALUES_REFUSED
}

interface CreateTemplateSignatureRequestParams extends CreateDocumentFromTemplateParams {
  // every signer slot filled once (TEMPLATE_SLOTS_REFUSED); a required value left empty: TEMPLATE_VALUES_MISSING
  slotAssignments: Array<{ signerKey: string; email: string; account?: AccountChoice; signingMethod?: "embedded" }>;
  message?: string;
  deadline: Date;
  isKycRequired?: boolean;
}

interface CreateContractFromTemplateParams {
  variables: Record<string, string | number | boolean>;
  slotAssignments: Array<{ signerKey: string; role: "business" | "contragent" }>;   // exactly two slots
  title: string;
  description?: string;
  contragent: ContragentInfo;
  contragentAccount?: AccountChoice;
  startDate?: string;
  endDate?: string;
  autoRenew?: boolean;
  noticePeriodDays?: number;
  terminationType?: TerminationType;
  currencyCode?: string;
  paymentTerms?: PaymentTermInput[];
  signingPolicy?: Partial<ContractSigningPolicy>;
  messageToSigners?: string;
  deadline: Date;
  isKycRequired?: boolean;
}
```

```typescript
interface TemplateDocumentResponse {
  success: boolean;
  templateId: string;
  templateVersionNumber: number;
  documentId: string;
  document: TemplateDocument;      // { id, txtId, accessType, currentVersion: { id, name, status, versionHash } | null, ... }
  message: string;
}

interface TemplateSignatureRequestResponse {
  success: boolean;
  templateId: string;
  templateVersionNumber: number;
  documentId: string;
  document: TemplateDocument;
  requestId: string;
  signatureRequest: SignatureRequest | null;
  message: string;
}

interface TemplateContractResponse {
  success: boolean;
  templateId: string;
  templateVersionNumber: number;
  contractId: string;
  signingRequestId?: string;
  contract: Contract;
  message: string;
}
```

```typescript
const { template } = await chaindoc.templates.create({ name: "NDA", category: "nda", content });
const { template: current } = await chaindoc.templates.get(template.id);
await chaindoc.templates.update(template.id, { content: edited, revision: current.workingCopy!.revision });
await chaindoc.templates.publish(template.id, { changelog: "First version" });

await chaindoc.templates.sendForSigning(template.id, {
  documentName: "NDA — Acme",
  variables: { client_name: "Acme Inc." },
  slotAssignments: [{ signerKey: "party_a", email: "signer@example.com" }],
  deadline: new Date("2027-12-31"),
});
```

---

## Invoices

`chaindoc.invoices`. Invoices are made under an ACTIVE contract.

| Method | Answers | Notes |
| --- | --- | --- |
| `create(contractId, params: CreateInvoiceParams)` | `InvoiceResponse` | |
| `list(contractId, params?)` | `InvoiceListResponse` | |
| `listAll(params?)` | `InvoiceListAllResponse` | Every contract of the key's workspace, with status counts |
| `get(contractId, invoiceId)` | `InvoiceResponse` | |
| `update(contractId, invoiceId, params)` | `InvoiceResponse` | A draft; line items replace the existing set |
| `send(contractId, invoiceId, { autoCharge? })` | `InvoiceActionResponse` | To the counterparty |
| `charge(contractId, invoiceId)` | `InvoiceActionResponse` | The default payment method; never retried automatically |
| `markPaid(contractId, invoiceId, params?)` | `InvoiceResponse` | An offline payment |
| `cancel(contractId, invoiceId)` | `InvoiceActionResponse` | A draft, unpaid or overdue invoice |
| `downloadPdf(contractId, invoiceId)` | `DownloadResult` | Once sent |
| `listCreditNotes(contractId, invoiceId)` | `CreditNote[]` | |
| `createCreditNote(contractId, invoiceId, params)` | `CreditNote` | In full or in part; excess paid is refunded |

```typescript
const invoice = await chaindoc.invoices.create(contractId, {
  title: "April Retainer",
  amount: "1500.00",
  dueDate: "2026-04-30T00:00:00.000Z",
  taxTreatmentId,          // chaindoc.taxTreatments.list()
  paymentInstructionId,    // optional: the invoice level of the cascade
});
await chaindoc.invoices.send(contractId, invoice.invoiceId ?? invoice.invoice.id, { autoCharge: false });
```

## Transactions

`chaindoc.transactions`.

| Method | Answers | Notes |
| --- | --- | --- |
| `listByContract(contractId)` | `TransactionListResponse` | |
| `get(transactionId)` | `TransactionResponse` | |
| `getPaymentMix(params: PaymentMixParams)` | `PaymentMixResponse` | Totals by payment-method type over a date range |
| `getFeeEstimate(params: FeeEstimateParams)` | `FeeEstimateResponse` | Stripe + platform fees for an amount |

## Counterparties

`chaindoc.contragents` — the business's address book, with each counterparty's billing identity.

| Method | Answers | Notes |
| --- | --- | --- |
| `list()` | `ContragentListResponse` | |
| `get(contragentId)` | `ContragentEnvelope` | |
| `create(params: CreateContragentParams)` | `ContragentEnvelope` | An e-mail already in the book is refused (409) |
| `update(contragentId, params)` | `ContragentEnvelope` | Not the e-mail; applies to invoices issued from now on |

## Payment instructions

`chaindoc.paymentInstructions` — bank, crypto and other payment details. The cascade is invoice > contract >
counterparty > business default.

| Method | Answers | Notes |
| --- | --- | --- |
| `list()` | `PaymentInstructionListResponse` | The active instructions, default first |
| `create(params)` | `PaymentInstructionCreatedResponse` | A crypto instruction needs `network`, `asset` and a checksummed `address` |
| `assignToContragent({ contragentEmail, paymentInstructionId })` | `ContragentPaymentInstructionAssignedResponse` | `null` clears |

## Tax treatments

`chaindoc.taxTreatments.list()` → `TaxTreatmentListResponse`: the active treatments (the default is `isDefault`); send
an `id` as `taxTreatmentId` on an invoice.

---

## Media

`chaindoc.media`.

| Method | Answers | Notes |
| --- | --- | --- |
| `uploadChunked(file: Blob, { filename?, onProgress? })` | `{ storageFileId }` | Resumable upload into Storage; the file source of a document |
| `initChunkedUpload({ filename, mimeType, size })` | `InitChunkedUploadResponse` | Low-level: open an upload |
| `getChunkedUploadStatus(uploadId)` | `ChunkedUploadStatus` | Current offset, for resuming |
| `cancelChunkedUpload(uploadId)` | `void` | |
| `upload(files: File[] \| Blob[])` | `MediaUploadResponse` | A temporary upload: an image for `signatures.createSignature`; not a document source |

```typescript
const { storageFileId } = await chaindoc.media.uploadChunked(file, {
  filename: "contract.pdf",
  onProgress: ({ percent }) => console.log(`${percent}%`),
});
const { conversion } = await chaindoc.documents.createFromStorage({ storageFileId, name: "Contract" });
```

---

## Processes

`chaindoc.processes` — explicitly granted processes: discovery, Start, cases, their data and materials, and answers to
"Wait for a system" steps (`respond`, signed with the integration's own secret). See [PROCESSES.md](./PROCESSES.md).

---

## Webhooks

`Chaindoc.webhooks` (static) verifies a delivery's signature and parses its envelope.

```typescript
const result = Chaindoc.webhooks.verify(rawBody, signatureHeader, timestampHeader, process.env.CHAINDOC_WEBHOOK_SECRET!);
if (result.valid) {
  switch (result.envelope!.type) {
    case "contract.signed": /* ... */ break;
  }
}
```

The events, their payloads and the delivery rules are in the README and [ADVANCED_USAGE.md](./ADVANCED_USAGE.md).

---

## Error Handling

All API errors throw `ChaindocError` (or one of its subclasses):

```typescript
import { ChaindocError, hasErrorKey } from "@chaindoc_io/server-sdk";

try {
  await chaindoc.contracts.send(contractId);
} catch (error) {
  if (hasErrorKey(error, "SETUP_BLOCKED")) {
    console.error("Place the sides' chips first:", (error.response as { blockers?: unknown }).blockers);
  } else if (error instanceof ChaindocError) {
    console.error(error.statusCode, error.errorKey, error.message);
  }
}
```

| Property      | Type                  | Description            |
| ------------- | --------------------- | ---------------------- |
| `message`     | `string`              | Error description      |
| `statusCode`  | `number \| undefined` | HTTP status code       |
| `errorKey`    | `ChaindocErrorKey \| undefined` | The server's machine-readable reason |
| `response`    | `unknown`             | Full API response (read it as `ChaindocRefusalBody` for `status`, `blockers`, `convert`, ...) |
| `isRetryable` | `boolean`             | Whether retry may help |

`ERROR_KEYS` lists every `errorKey` the public API and `embedded.createSession` answer today; branch with
`hasErrorKey(error, 'KEY')`. A body or query that fails validation is `400 VALIDATION_FAILED` (`message` is the list of
broken constraints: each entry is `property`, `value`, `constraints` and `children` for a nested object). A key the
server adds later still arrives as a `string`.

| Class | When |
| --- | --- |
| `ChaindocPlanError` | `403 INTEGRATIONS_NOT_IN_PLAN` — the API needs a Business plan or above |
| `ChaindocReadOnlyError` | `403 ACCOUNT_READ_ONLY` — the account reads but cannot create, change, sign or send |
| `ChaindocLimitError` | a plan limit is spent (`STORAGE_LIMIT_REACHED`, `SIGNATURE_CREDITS_EXHAUSTED`, ...) |
| `ChaindocPaymentError` | a money refusal (`STRIPE_*`, `INVOICE_MONEY_OR_CREDIT_NOTE`) — never retried blindly |
| `ChaindocDocumentFileError` | the document is a file, a conversion is pending or failed, or a file must come through Storage |
| `ChaindocSigningSetupError` | `SETUP_BLOCKED`, `SIGNATURE_ROLE_*`, `SETUP_FIELDS_STAND_IN_THE_TEXT`, `SIGNING_FIELDS_EMPTY` |
| `ChaindocNotYourTurnError` | `409 NOT_YOUR_TURN` — the signing order has not reached this signer |
| `ChaindocTemplateError` | any `TEMPLATE_*` refusal |
| `ChaindocConversionFailedError` / `ChaindocConversionTimeoutError` | thrown by `conversions.wait` |

---

## API Endpoints Reference

| Module | Method | HTTP | Endpoint |
| --- | --- | --- | --- |
| Chaindoc | getApiKeyInfo | GET | `/api/v1/me` |
| Chaindoc | healthCheck | GET | `/api/v1/health` |
| Documents | create | POST | `/api/v1/documents` |
| Documents | createFromStorage | POST | `/api/v1/documents/from-storage` |
| Documents | update | PUT | `/api/v1/documents/{documentId}` |
| Documents | get | GET | `/api/v1/documents/{documentId}` |
| Documents | getContent | GET | `/api/v1/documents/{documentId}/content` |
| Documents | convert | POST | `/api/v1/documents/{documentId}/conversion` |
| Documents | addSignatureBlock | POST | `/api/v1/documents/{documentId}/signature-block` |
| Documents | getVersions | GET | `/api/v1/documents/{documentId}/versions` |
| Documents | updateRights | PUT | `/api/v1/documents/{documentId}/rights` |
| Documents | getActivity | GET | `/api/v1/documents/{documentId}/activity` |
| Documents | getDownloads | GET | `/api/v1/documents/{documentId}/downloads` |
| Documents | sendPublicLink | POST | `/api/v1/documents/{documentId}/send-public-link` |
| Documents | search | GET | `/api/v1/documents/search` |
| Documents | listShared | GET | `/api/v1/documents/shared` |
| Documents | download | GET | `/api/v1/documents/versions/{versionId}/download` |
| Documents | preview | GET | `/api/v1/documents/versions/{versionId}/preview` |
| Documents | verify | POST | `/api/v1/documents/verify` |
| Documents | getVerificationStatus | GET | `/api/v1/documents/versions/{versionId}/verification` |
| Comments | add | POST | `/api/v1/documents/{documentId}/comments` |
| Comments | list | GET | `/api/v1/documents/{documentId}/comments` |
| Conversions | get | GET | `/api/v1/documents/conversions/{conversionId}` |
| Accounts | lookup | POST | `/api/v1/accounts/lookup` |
| Signatures | createRequest | POST | `/api/v1/signatures/requests` |
| Signatures | getMyRequests | GET | `/api/v1/signatures/requests` |
| Signatures | getRequestStatus | GET | `/api/v1/signatures/requests/{requestId}/status` |
| Signatures | editRequest | POST | `/api/v1/signatures/requests/{requestId}/edit` |
| Signatures | cancel | POST | `/api/v1/signatures/requests/{requestId}/cancel` |
| Signatures | resend | POST | `/api/v1/signatures/requests/{requestId}/resend` |
| Signatures | remind | POST | `/api/v1/signatures/requests/{requestId}/remind` |
| Signatures | sign | POST | `/api/v1/signatures/sign` |
| Signatures | getSignatures | GET | `/api/v1/signatures` |
| Signatures | createSignature | POST | `/api/v1/signatures` |
| Signatures | validatePdfSignatures | POST | `/api/v1/signatures/validate-pdf` |
| Signatures | downloadCertificate | GET | `/api/v1/signatures/versions/{versionId}/certificate` |
| Signatures | downloadSignedDocument | GET | `/api/v1/signatures/versions/{versionId}/signed-document` |
| QES | promise | POST | `/api/v1/signatures/qes/{requestId}/promise` |
| QES | prepare | POST | `/api/v1/signatures/qes/{requestId}/prepare` |
| QES | finalize | POST | `/api/v1/signatures/qes/{requestId}/finalize` |
| Embedded | createSession | POST | `/api/v1/embedded/sessions` |
| Contracts | create | POST | `/api/v1/contracts` |
| Contracts | createMinimal | POST | `/api/v1/contracts/minimal` |
| Contracts | createEmpty | POST | `/api/v1/contracts/empty` |
| Contracts | import | POST | `/api/v1/contracts/import` |
| Contracts | list | GET | `/api/v1/contracts` |
| Contracts | get | GET | `/api/v1/contracts/{contractId}` |
| Contracts | update | PATCH | `/api/v1/contracts/{contractId}` |
| Contracts | delete | DELETE | `/api/v1/contracts/{contractId}` |
| Contracts | getStatus | GET | `/api/v1/contracts/{contractId}/status` |
| Contracts | getActivities | GET | `/api/v1/contracts/{contractId}/activities` |
| Contracts | getStats | GET | `/api/v1/contracts/{contractId}/stats` |
| Contracts | attachDocument | PATCH | `/api/v1/contracts/{contractId}/document` |
| Contracts | addPaymentSetup | POST | `/api/v1/contracts/{contractId}/payment-setup` |
| Contracts | setPaymentInstruction | PATCH | `/api/v1/contracts/{contractId}/payment-instruction` |
| Contracts | setStripePayment | PATCH | `/api/v1/contracts/{contractId}/stripe-payment` |
| Contracts | send | POST | `/api/v1/contracts/{contractId}/send` |
| Contracts | cancel | POST | `/api/v1/contracts/{contractId}/cancel` |
| Contracts | terminate | POST | `/api/v1/contracts/{contractId}/terminate` |
| Contracts | setupRecurring | POST | `/api/v1/contracts/{contractId}/recurring-setup` |
| Contracts | resendRecurringApproval | POST | `/api/v1/contracts/{contractId}/recurring-approval/resend` |
| Contracts | cancelRecurringApproval | DELETE | `/api/v1/contracts/{contractId}/recurring-approval` |
| Contracts | listSigningRequests | GET | `/api/v1/contracts/{contractId}/signing-requests` |
| Contracts | getSigningRequest | GET | `/api/v1/contracts/{contractId}/signing-requests/{requestId}` |
| Contracts | resendSigningRequest | POST | `/api/v1/contracts/{contractId}/signing-requests/{requestId}/resend` |
| Contracts | cancelSigningRequest | DELETE | `/api/v1/contracts/{contractId}/signing-requests/{requestId}` |
| Contracts | businessSign | POST | `/api/v1/contracts/{contractId}/signing-requests/{requestId}/business-sign` |
| Amendments | create | POST | `/api/v1/contracts/{contractId}/agreements` |
| Amendments | list | GET | `/api/v1/contracts/{contractId}/agreements` |
| Amendments | get | GET | `/api/v1/contracts/{contractId}/agreements/{agreementId}` |
| Amendments | initiateSigning | POST | `/api/v1/contracts/{contractId}/agreements/{agreementId}/initiate-signing` |
| Amendments | delete | DELETE | `/api/v1/contracts/{contractId}/agreements/{agreementId}` |
| Payment terms | list | GET | `/api/v1/contracts/{contractId}/payment-terms` |
| Payment terms | create | POST | `/api/v1/contracts/{contractId}/payment-terms` |
| Payment terms | update | PATCH | `/api/v1/contracts/{contractId}/payment-terms/{termId}` |
| Payment terms | delete | DELETE | `/api/v1/contracts/{contractId}/payment-terms/{termId}` |
| Termination | get | GET | `/api/v1/contracts/{contractId}/termination` |
| Termination | getStatus | GET | `/api/v1/contracts/{contractId}/termination/status` |
| Termination | getHistory | GET | `/api/v1/contracts/{contractId}/termination/history` |
| Termination | approve | POST | `/api/v1/contracts/{contractId}/termination/approve` |
| Termination | reject | POST | `/api/v1/contracts/{contractId}/termination/reject` |
| Termination | cancel | DELETE | `/api/v1/contracts/{contractId}/termination` |
| Templates | list | GET | `/api/v1/templates` |
| Templates | create | POST | `/api/v1/templates` |
| Templates | get | GET | `/api/v1/templates/{templateId}` |
| Templates | update | PATCH | `/api/v1/templates/{templateId}` |
| Templates | delete | DELETE | `/api/v1/templates/{templateId}` |
| Templates | getVersions | GET | `/api/v1/templates/{templateId}/versions` |
| Templates | publish | POST | `/api/v1/templates/{templateId}/publish` |
| Templates | archive | POST | `/api/v1/templates/{templateId}/archive` |
| Templates | restore | POST | `/api/v1/templates/{templateId}/restore` |
| Templates | createDocument | POST | `/api/v1/templates/{templateId}/documents` |
| Templates | sendForSigning | POST | `/api/v1/templates/{templateId}/signature-requests` |
| Templates | createContract | POST | `/api/v1/templates/{templateId}/contracts` |
| Invoices | create | POST | `/api/v1/contracts/{contractId}/invoices` |
| Invoices | list | GET | `/api/v1/contracts/{contractId}/invoices` |
| Invoices | listAll | GET | `/api/v1/invoices` |
| Invoices | get | GET | `/api/v1/contracts/{contractId}/invoices/{invoiceId}` |
| Invoices | update | PATCH | `/api/v1/contracts/{contractId}/invoices/{invoiceId}` |
| Invoices | send | POST | `/api/v1/contracts/{contractId}/invoices/{invoiceId}/send` |
| Invoices | charge | POST | `/api/v1/contracts/{contractId}/invoices/{invoiceId}/charge` |
| Invoices | markPaid | POST | `/api/v1/contracts/{contractId}/invoices/{invoiceId}/mark-paid` |
| Invoices | cancel | POST | `/api/v1/contracts/{contractId}/invoices/{invoiceId}/cancel` |
| Invoices | downloadPdf | GET | `/api/v1/contracts/{contractId}/invoices/{invoiceId}/pdf` |
| Invoices | listCreditNotes | GET | `/api/v1/contracts/{contractId}/invoices/{invoiceId}/credit-notes` |
| Invoices | createCreditNote | POST | `/api/v1/contracts/{contractId}/invoices/{invoiceId}/credit-notes` |
| Transactions | listByContract | GET | `/api/v1/contracts/{contractId}/transactions` |
| Transactions | get | GET | `/api/v1/transactions/{transactionId}` |
| Transactions | getPaymentMix | GET | `/api/v1/transactions/payment-mix` |
| Transactions | getFeeEstimate | GET | `/api/v1/transactions/fee-estimate` |
| Counterparties | list | GET | `/api/v1/contragents` |
| Counterparties | create | POST | `/api/v1/contragents` |
| Counterparties | get | GET | `/api/v1/contragents/{contragentId}` |
| Counterparties | update | PATCH | `/api/v1/contragents/{contragentId}` |
| Payment instructions | list | GET | `/api/v1/payment-instructions` |
| Payment instructions | create | POST | `/api/v1/payment-instructions` |
| Payment instructions | assignToContragent | PUT | `/api/v1/payment-instructions/contragent-assignment` |
| Tax treatments | list | GET | `/api/v1/tax-treatments` |
| Media | upload | POST | `/api/v1/media/upload` |
| Media | initChunkedUpload | POST | `/api/v1/media/chunked` |
| Media | getChunkedUploadStatus | GET | `/api/v1/media/chunked/{uploadId}` |
| Media | cancelChunkedUpload | DELETE | `/api/v1/media/chunked/{uploadId}` |
| Processes | (see PROCESSES.md) | | `/api/v1/processes/...` |

---

## Support

- **Documentation**: [chaindoc.io/docs](https://chaindoc.io/docs)
- **GitHub Issues**: [Report a bug](https://github.com/ChaindocIO/server-sdk/issues)
- **Email**: support@chaindoc.io

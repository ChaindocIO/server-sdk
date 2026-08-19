# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

**BREAKING** — the team audience is withdrawn from the input types. Not published yet: the version
is unchanged and nothing has been released from this section.

### Removed

- **`AccessRole` — the exported interface is gone.** It was `{ roleId: number; level: "read" |
  "write" }`. **What breaks:** any code that imports the type by name
  (`import type { AccessRole } from "@chaindoc/server-sdk"`) stops compiling. **What to write
  instead:** nothing — there is no replacement, because a team role no longer grants access to
  anything. Grant to a person: `accessEmails: [{ email, level }]`.
- **`accessRoles` — the field is gone from all three input types**: `CreateDocumentParams`,
  `CreateDocumentFromStorageParams`, `UpdateDocumentRightsParams`. **What breaks:** passing it is
  now an excess-property error at compile time, and the API refuses it at runtime rather than
  accepting and ignoring it. **What to write instead:** `accessEmails`, one entry per person.

### Changed

- **`accessType` on inputs narrows from `AccessType` (four values) to the new `AccessTypeInput`
  (three).** Affects the same three types. **What breaks:** `accessType: "team"` on a create, a
  create-from-storage or a rights update no longer compiles. **What to write instead:**
  `"restricted"` plus `accessEmails` for a named audience, `"public"` for anyone with the link, or
  `"private"`.
- **`AccessType` itself is unchanged and still has four values, deliberately.** It is the RESPONSE
  type. A document shared to a team before that audience was withdrawn still exists, and a response
  type that could not express the stored state would be a new lie in place of a removed one.
  `"team"` there is **historical and non-authorising**: it grants nothing, and no new document can
  be given it. Reading it is safe; writing it is what stopped being possible.

### Added

- **`AccessTypeInput`** — exported, and is what every input now takes.

### Migration

| you had | you write |
|---|---|
| `accessType: "team"` | `accessType: "restricted"` + `accessEmails: [{ email, level }]` per person |
| `accessRoles: [{ roleId, level }]` | `accessEmails: [{ email, level }]` per person |
| `import type { AccessRole }` | delete the import — no replacement type exists |
| reading `doc.accessType === "team"` | ⚠️ **unchanged** — keep it; that is the historical value |


## [3.0.0-alpha.0]

**BREAKING** — removes the deprecated `isForSigning` field. The flag never
affected signability (a document is signable purely from its signature-request
state), so there is no behavioural replacement.

### Removed

- `isForSigning` from the document write params `CreateDocumentParams`,
  `CreateDocumentFromStorageParams` and `UpdateDocumentParams`.
- `isForSigning` from the response types `DocumentVersion` and
  `PublicDocumentVersion`; the public API no longer returns the field.

**Migration:** delete `isForSigning` from any create/update calls; if you read
`version.isForSigning` on a response, remove that read (there is no replacement
— signability is determined by the signature request).

## [2.3.0-alpha.0]

Additive, non-breaking — relaxes the document write params to match the
backend, which now accepts a title-only document. `create` and `update` need
only `name` + `media` + `status`; `createFromStorage` needs `storageFileId` +
`name` + `status`.

### Changed

- **`description`, `meta` and `hashtags` are now optional** on
  `CreateDocumentParams`, `CreateDocumentFromStorageParams` and
  `UpdateDocumentParams`. Existing callers that pass them keep working
  unchanged; you may now omit them for a title-only create/update. Mirrors the
  relaxed backend DTOs.
- Public OpenAPI reference snapshot (`references/public-api.snapshot.json`)
  re-synced to the current backend public API.

### Internal

- Added a title-only compile-time fixture and runtime write-surface tests so a
  regression back to required `description`/`meta`/`hashtags` fails CI.

## [2.2.0] - 2026-07-03

Additive release — resumable chunked uploads for large files and a direct
file-to-document convenience path. No breaking changes.

### Added

- **Resumable chunked upload** — `media.uploadChunked(file, options)` streams a
  (potentially large) file into the caller's Drive in ordered chunks, resuming
  from the server-reported offset after transient failures and aborting the
  session on non-retryable errors. Low-level session controls:
  `media.initChunkedUpload`, `media.getChunkedUploadStatus`,
  `media.cancelChunkedUpload`.
- **`documents.createFromStorage(storageFileId, ...)`** — create a document from
  a file already in Drive. The document gets its own copy (model C).
- **`documents.createFromFile(file, ...)`** — convenience: chunk-upload a large
  file and create a document from the resulting storage file in one call.
- **`HttpClient.sendChunk()`** — send a single raw binary chunk for a resumable
  upload, with the same retry semantics as `request()`.

## [2.1.0] - 2026-05-18

Additive release — extends the public API surface across templates, contracts,
documents, signatures, invoices and transactions. No breaking changes.

### Added

- **Templates module** — full CRUD (`create`, `update`, `publish`, `archive`,
  `restore`, `delete`), reads (`list`, `get`, `getVersions`), and previews
  (`previewPdf`, `previewHtml`, `previewUnsavedPdf`).
- **Contracts** — core lifecycle (`update`, `delete`, `createEmpty`, `createMinimal`,
  `import`, `attachDocument`, `getStats`); recurring billing (`recurringSetup`,
  `resendRecurringApproval`, `cancelRecurringApproval`); signing-request inspection
  (`listSigningRequests`, `getSigningRequest`) and actions (`resendSigningRequest`,
  `cancelSigningRequest`, `businessSign`). New submodules: `contracts.termination`,
  `contracts.paymentTerms`, `contracts.agreements`.
- **Documents** — read surface (`get`, `getVersions`, `download`, `preview`);
  analytics (`listShared`, `search`, `getActivity`, `getDownloads`);
  `documents.comments` submodule (`add`, `list`); `sendPublicLink`.
- **Signatures** — `editRequest`, `getMyRequests` status filter, `createSignature`,
  `validatePdfSignatures` (DSS validation of an uploaded PDF).
- **Invoices module** — `update`, `cancel`, `downloadPdf`, `listAll` (business-wide).
- **Transactions module** — `getPaymentMix` and `getFeeEstimate` analytics.
- **`HttpClient`** — `patch()` verb, `download()` now supports `POST` bodies,
  exported `DownloadResult` type.

### Changed

- `DocumentStatusForCreate` narrowed to `"draft" | "published"` — the backend rejects
  server-derived statuses on create/update.

---

## [2.0.1] - 2026-04-27

### Fixed

- **Email normalization at the SDK boundary.** All email values sent through the SDK are now trimmed and lowercased before reaching the API. Affected inputs: `signatures.createRequest` (`recipients[].email`, `fields[].signerEmail`), `embedded.createSession` (`email`), `contracts.create` (`contragent.email`), `templates.sendForSigning` (`slotAssignments[].email`), `templates.createContract` (`contragent.email`), `documents.create` and `documents.updateRights` (`accessEmails[].email`). Caller-owned input objects are not mutated. Aligns the SDK with the backend rule that `users.email` is canonical lowercase, fixing silent auto-link misses when partner-side emails were stored mixed-case.

---

## [2.0.0] - 2026-04-23

Major release expanding the SDK to cover contracts, invoices, transactions, templates, and webhook verification. Identifiers are now UUID-only across all public resources, and webhook delivery follows a canonical signed envelope format. KYC is no longer exposed as an SDK module — it is handled by the signer inside the Chaindoc embedded flow and enforced by the backend at signing time.

### Breaking Changes

- **UUID-only identifiers**. All public resource identifiers are UUIDs. Numeric `id` fields were removed from `Document`, `DocumentVersion`, `Signer`, `SignatureRequest`, `SignatureRequestStatus`, and `ApiKeyInfo`. Also removed: `Document.userId`, `Document.coreTeamId`, `Document.currentVersionId`, `SignatureRequest.userId`, `SignerUser.id`, `ApiKeyInfo.userId`, `HealthCheckResponse.userId`.
- **Simplified `Signer` type**. Now `{ id (UUID), email, signatureHash, signedAt, hasSigned, signer }`.
- **`SignatureRequestResponse`** now matches the actual backend shape (`success`, `requestId`, `signatureRequest`, `message`).
- **KYC module removed**. `client.kyc`, `ShareKycParams`, `KycData`, `ShareKycResponse`, `Recipient.shareToken`, and the `kyc.shared` webhook event are gone.
- **`GetSignaturesResponse.items`** now correctly typed as `SavedSignature[]` (saved signature images), not `SignatureRequest[]`. The misplaced `totalPending` / `totalCompleted` / `totalExpired` counters moved to `GetMyRequestsResponse`.
- **Webhook delivery contract** switched to canonical headers (`X-Chaindoc-Event`, `X-Chaindoc-Signature`, `X-Chaindoc-Delivery-Id`, `X-Chaindoc-Timestamp`), envelope `{ id, type, createdAt, data }`, and signature format `v1=HMAC-SHA256(timestamp.body)`.

### Added

- **Contracts module** (`client.contracts.*`) — full lifecycle: `create`, `list`, `get`, `getStatus`, `getActivities`, `addPaymentSetup`, `setupRecurring`, `linkPaymentMethod`, `send`, `cancel`, `terminate`. Types: `Contract`, `ContractStatus`, `PaymentTermResponse`, `ContractSigner`, `CreateContractParams`, `ContractSendParams`, `ContractListResponse`, `ContractStatusResponse`, `ContractActivitiesResponse`, `ContractActionResponse`, `ContractSendResponse`, `ContractPreferredPaymentMethodType`.
- **Contract signing policy** — `ContractSigningMethod`, `ContractSignerSource`, `ContractSigningPolicy` types. `signingPolicy` on `Contract`, `CreateContractParams`, `ContractStatusResponse`; `signingSource` and `status` on signers.
- **Payment controls on contracts** — `paymentMethodRequired` and `preferredPaymentMethodType` on `Contract`, `CreateContractParams`, and `PaymentSetupParams`.
- **Invoices module** (`client.invoices.*`) — `create`, `list`, `get`, `send`, `charge`, manual mark-paid. Types: `Invoice`, `InvoiceStatus`, `InvoiceType`, and request/response envelopes.
- **Transactions module** (`client.transactions.*`) — contract-scoped list and direct lookup by UUID. Types: `Transaction`, `TransactionStatus`.
- **Templates runtime API** (`client.templates.*`) — create draft documents from published templates, send rendered documents for signing, create template-backed contracts. Types: `CreateDocumentFromTemplateParams`, `CreateTemplateSignatureRequestParams`, `CreateContractFromTemplateParams`, `TemplateSlotAssignment`, `TemplateContractSlotAssignment`, `TemplateSlotSigningMethod`, and `signerVariables` for per-signer variable injection.
- **Webhooks module** — `Chaindoc.webhooks.verify(rawBody, signature, timestamp, secret)` with timing-safe HMAC-SHA256 verification and replay protection, plus `Chaindoc.webhooks.parse(rawBody)` for envelope parsing without verification. Types: `WebhookEventType`, `WebhookEnvelope<T>`, `WebhookVerificationResult`.
- **Contract and billing webhook events** — `contract.created`, `contract.status_changed`, `contract.signed`, `contract.cancelled`, `contract.terminated`, `invoice.created`, `invoice.sent`, `invoice.paid`, `invoice.cancelled`, `transaction.created`, `transaction.updated`.
- **Signature request fields** — `SignatureRequestField` and `SignatureRequestFieldType` for placing signature, initials, date, text, and checkbox fields with normalized coordinates; `fields` on `CreateSignatureRequestParams`.
- **Document signing method** — `DocumentSigningMethod` (`embedded` | `delegated`) and `signingMethod` on `Recipient`.
- **Saved signatures** — `SavedSignature` type for images stored on the user account (`hash`, `createdAt`, `updatedAt`, optional `imageMedia`).
- **Embedded contract signing** — `CreateEmbeddedSessionParams.metadata.contractId`; the backend auto-resolves `documentId` and `signatureRequestId`.
- **Public API snapshot** at `references/public-api.snapshot.json` plus `scripts/sync-openapi-snapshot.mjs` to keep the SDK and backend types aligned.
- **Test suite** — integration-style unit tests for contracts, invoices, templates, transactions, signatures, webhooks, and a public API contract test.

### Fixed

- **Environment URLs**: Replaced build-time `process.env` injection with hardcoded safe defaults so the SDK no longer ships with `undefined` URLs when env vars are missing at build time.

### Changed

- Documentation (README, `GETTING_STARTED.md`, `API_REFERENCE.md`, `ADVANCED_USAGE.md`) rewritten to cover contracts, invoices, templates, canonical webhook verification, and the updated signing flow.

---

## [1.0.0] - 2024-12-10

### Added
- **Stable API**: All modules are now production-ready with a stable API
- Comprehensive documentation including Getting Started, API Reference, and Advanced Usage guides
- CONTRIBUTING.md for open-source collaboration guidelines
- SECURITY.md for vulnerability reporting policy
- MIGRATION.md guide for upgrading from alpha versions

### Changed
- **Production Ready**: SDK is now ready for production use
- Improved error messages and error handling
- Enhanced TypeScript type definitions

### Fixed
- Various stability improvements from alpha testing feedback

---

[2.0.0]: https://github.com/ChaindocIO/server-sdk/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/ChaindocIO/server-sdk/releases/tag/v1.0.0

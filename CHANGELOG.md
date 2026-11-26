# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Says what the API answers today (the server's November fixes after 3.0.0). Types widen or get corrected; nothing at
runtime changes except which error class four limit keys arrive as. No version bump yet. What an integration on 3.0.0
changes is in [MIGRATION.md](MIGRATION.md) («Upgrading from 3.0.0»).

### Added

- **`ERROR_KEYS` is the whole list** an integrator can meet on the public API and `embedded.createSession`: 55 → 201 keys,
  swept from the server's code paths behind every route (guards, validation pipe, services). New among them:
  `VALIDATION_FAILED` (any body that fails validation), `DOCUMENT_NOT_A_FILE`, `DOCUMENT_EDIT_REFUSED`,
  `KYC_NOT_VERIFIED`, `CONTRACT_NOT_A_DRAFT`, `SIGNING_REQUEST_HAS_A_SIGNATURE`, `SIGNING_REQUEST_NOT_PENDING`,
  `SIGNING_REQUEST_EXPIRED`, `SIGNATURE_REQUEST_NOT_PENDING`, `SIGNER_ALREADY_ACTED`, `KEY_NAMES_NO_SIGNER`,
  `BUSINESS_PROFILE_INCOMPLETE`, `EMBEDDED_SIGNING_REQUEST_CLOSED`, `EMBEDDED_CONTRACT_NOT_SIGNABLE`, `WORKSPACE_SUSPENDED`,
  `WORKSPACE_CLOSED`, the plan limits (`CONTRACTS_LIMIT_REACHED`, `OPEN_SIGN_REQUESTS_LIMIT_REACHED`,
  `SIGNATURE_CREDITS_EXHAUSTED`, `KYC_CREDITS_EXHAUSTED`, `DOCUMENT_SHARE_LIMIT_REACHED`), the document-writing,
  signing-edit, invoice and PDF-check refusals. No known key was retired.
- `ChaindocRefusalBody` and `SetupBlocker`: the facts that ride with a key (`status`, `blockers`, `convert`, `state`).
- `WEBHOOK_URL_NOT_PUBLIC` (`ERROR_KEYS`): the app refuses to save a webhook address that is not public (loopback,
  private, link-local, reserved, or a name resolving to one). Not answered by an SDK call — the endpoint is set on the API
  key's page — but it is the word your team will see.
- Signature requests: `signers[].role`; `declinedAt`, `declinedBy`, `declineComment`, `declinedVia` on `getRequestStatus`
  and on list items (a decline reads `status: 'cancelled'`); `createdAt`, `completedAt` on list items.
- `signers[].kyc` on `getRequestStatus` (`SignerKycState`: `verified` | `pending` | `rejected`, the words also as the
  `SIGNER_KYC_STATES` constant), where the request asks for identity verification: `rejected` is a refusal for good — that
  signer will not sign. Absent on a request without the check. `references/public-api.snapshot.json` synced with the API.
- `DocumentConversionProgress` / `DocumentConversionStage`; `DocumentContentVersion`.
- `BusinessSignResponse.completionPending`.
- Webhooks: `invoice.ksef_accepted` (the 23rd event; also in `InvoiceWebhookEventType`); payload types
  `DocumentCreatedData`, `DocumentVerifiedData`, `DocumentSignedData`, `SignatureRequestCreatedData`,
  `SignatureRequestCompletedData`, `SignatureRequestRejectedData` (with `contractId`, `signingRequestId`, `agreementId`),
  `WebhookEventSigner`, `WebhookEventDataMap`.
- Webhook payload types `ContractStatusChangedData` and `ContractTerminatedData` (in `WebhookEventDataMap`): `contractId`,
  `status`, `previousStatus`, and `terminationRequestId` / `signingRequestId` / `additionalAgreementId` where an act names
  it; `signedOutsideChaindoc` on a draft recorded as signed elsewhere.

### Changed

- **Server: contract status events fire where the status changes**, whichever way it changed (the API, the Chaindoc app,
  a scheduled job). `contract.status_changed` now also comes for a termination asked (`termination_pending`), a
  termination rejected or withdrawn (back to `active`), a refused contract (`rejected`) and an expired one (`expired`),
  and always carries `previousStatus`. `contract.terminated` comes once, when the contract has actually ended (the
  termination's effective date) — 3.0.0's `contracts.terminate` sent it at once, with `status: 'termination_pending'`.
- **Server: every other change of a contract's status is told too, once.** `contract.status_changed` now also comes when a
  contract is sent from the Chaindoc app (`draft → pending_signature`; before, only `contracts.send` and a contract made from
  a template told it, each from its own route), when its signing request is cancelled, declined or expires (`pending_signature
  → draft`), when an amendment is sent (`active → pending_amendment`) and when its request ends unsigned (back to `active`),
  and for a draft recorded as signed outside Chaindoc (`draft → active`, `signedOutsideChaindoc: true`). A send still gives
  exactly one event, whichever way it was made.
- **Server: a validation refusal no longer echoes the request.** Each entry of a `400 VALIDATION_FAILED` `message` was
  `property`, `value`, `constraints`, `children` — and `target`, the whole object the field sat on (a document's create
  answered with its entire text). `target` is gone at every depth; the rest is unchanged.
- **Server: events are kept while Chaindoc has stopped sending to an endpoint** (after 50 failed deliveries in a row) and
  delivered after *Resume sending*. Before, only `contract.signed`, `invoice.*` and `transaction.*` were.
- `CONTRACTS_LIMIT_REACHED`, `OPEN_SIGN_REQUESTS_LIMIT_REACHED`, `SIGNATURE_CREDITS_EXHAUSTED`, `KYC_CREDITS_EXHAUSTED`,
  `DOCUMENT_SHARE_LIMIT_REACHED` now arrive as `ChaindocLimitError` (still `instanceof ChaindocError`).
- **Server: a document's `status` is `'draft'` or `'published'`, nothing else.** `documents.create`, `update`,
  `createFromStorage` (and the Pipedrive lane) answered `201` to any other string and made a draft — `'Published'` published
  nothing. Now `400 VALIDATION_FAILED`. `DocumentStatusForCreate` already allowed only the two.
- **Server: the embed's identity-check token is refused to a signer refused for good** (`400 KYC_REJECTED`,
  `rejectType: 'final'`). The signing window shows its final screen before it would ask, so only a direct call to the
  embedded route meets it; a resubmission the provider asks for still gets its token.
- **Server: the signing window lists «Payment method» only on a contract with payment terms.** A contract with none said
  «You choose how to pay each invoice» though there was nothing to pay.

### Fixed (types that were wrong)

- `DocumentConversion.progress` was `number`; the server sends `{ stage, page, pages } | null`. `review` may be `null`.
- `DocumentContent.version` was `2`; the server answers `3` and accepts `1 | 2 | 3`.
- `Signer.signer` may be `null`.

### Deprecated

- `environment` (and `ChaindocEnvironment`): it switches nothing — every value calls `https://api.chaindoc.io`. Use
  `baseUrl` for another backend.

### Documentation

- Removed the dead demo host from README, API reference, getting started and migration; documented `baseUrl`.
- `contracts.send` / `contracts.agreements.initiateSigning`: the text needs the `business` and `contragent` signature
  chips (`409 SETUP_BLOCKED`, `400 SIGNATURE_ROLE_UNKNOWN`), a file is refused (`422 DOCUMENT_FILE_CONVERTS`), and
  `isKycRequired` with a delegated business side needs the workspace Owner verified (`400 KYC_NOT_VERIFIED`).
- `embedded.createSession` gives no session for a closed request or a never-sent contract.
- The signing window always asks the signer for a reason to decline.
- `documents.get().sendable` and `conversions.get` (progress, review) say what they mean.
- Webhook delivery as the server runs it: 3 attempts (at once, +1 min, +5 min), the same delivery `id`, turned off after
  50 failed deliveries in a row and resumed in the app; every event of the stop is kept and delivered after the resume.
- When `contract.status_changed` and `contract.terminated` fire, with their fields; `contracts.terminate` and the
  termination methods say which event follows.
- `contracts.cancelSigningRequest`: refused once any side has signed, including the business side signed at `send` under
  `signingPolicy.business: 'delegated'`; what ends such a request instead (the counterparty, the deadline) and
  `resendSigningRequest` meanwhile.
- Webhook endpoints: a public address only, checked again on every delivery; redirects are not followed (a `3xx` is a
  failed delivery).
- Build: dropped three dead `define`s (`CHAINDOC_API_*`) from `tsup.config.ts`.

## [3.0.0] - 2026-11-10

**BREAKING.** Aligns the SDK with the platform contract of November 2026 (194 public operations). Files are
converted into text documents, signature places are chips in the text, templates use the new content format,
and every call needs a Business plan. See [MIGRATION.md](MIGRATION.md) for every change with before/after.
Not published: version bump only.

### Added

- **Documents as text.** `documents.create({ content })`; a file goes Storage -> conversion:
  `documents.createFromStorage` / `createFromFile` answer 202 with a conversion. `conversions.get` and
  `conversions.wait` (poll with backoff and a timeout; typed errors). `documents.getContent` (text, `roles[]`,
  `fields[]`), `documents.convert`, `documents.addSignatureBlock`; `format` and `sendable` on `documents.get`.
- **Accounts.** `accounts.lookup`; the `account` option on recipients, access grants and template slots;
  `contragentAccount` on contracts; `accessType: 'team'` (the workspace's audience) is an input again.
- **Templates in the new format.** `content` + `revision`, `workingCopy`, publish / archive / restore,
  permanent `delete`; contracts and signature requests from a template with slots by `email` / `account`.
- **Money.** `contragents`, `paymentInstructions` (bank, crypto with network/asset/address, `currencyCode`,
  `qr`, `localCode`, contragent assignment), `taxTreatments`, `contracts.setPaymentInstruction` /
  `setStripePayment`, `invoices.listCreditNotes` / `createCreditNote`, the new invoice and transaction fields
  (`creditedAmount`, `canCancel`, `paidOn`, `method`, `removedAt`, tax summary, buyer/seller, ...).
- **QES.** `signatures.qes.promise` / `prepare` / `finalize` (private key material is refused locally),
  `signatures.resend`.
- **Processes** (merged from `processes/integration`): `processes.*` with entry `kind`, `requiredSubjects`,
  `creates`, `entrySubject`, and `processes.respond` (HMAC-signed answer of a connected system).
- **Typed errors.** `ChaindocError.errorKey`; `ChaindocPlanError`, `ChaindocReadOnlyError`,
  `ChaindocLimitError`, `ChaindocDocumentFileError`, `ChaindocSigningSetupError`, `ChaindocNotYourTurnError`,
  `ChaindocTemplateError`, `ChaindocPaymentError`, `ChaindocConversionFailedError`,
  `ChaindocConversionTimeoutError`; `hasErrorKey` and `ERROR_KEYS`.
- **Webhooks.** `document.conversion.completed` / `.failed` (22 events in all).

### Changed

- `documents.createFromFile` / `createFromStorage` return the 202 conversion, not a document.
- `documents.create` / `update` no longer take `media`; `update` from text names `baseVersionId`.
- `recipients[].role` binds a signer to the text; every role of the text needs one recipient.
- **Fewer automatic retries on writes (behaviour change).** GET/HEAD keep their retries (5xx, 429, timeouts,
  network errors). POST/PUT/PATCH/DELETE are retried only when the request provably never reached the server
  (`ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`) or on 429; not on 5xx, timeout, `ECONNRESET` or `ETIMEDOUT`.
  Document writes (`create`, `createFromStorage`/`createFromFile`, `update`, `convert`, `addSignatureBlock`)
  carry an `idempotencyKey` (generated when you give none, the same on every attempt), so the server dedupes
  and they are retried on 5xx too. Money calls (`charge`, `markPaid`, credit notes, payment-instruction writes,
  Stripe setting, QES) are never retried automatically.
- Every path id is validated and percent-encoded (`seg()`): empty, `.` and `..` are refused before any request.
- `scripts/sync-openapi-snapshot.mjs` takes its source from an argument or `CHAINDOC_PUBLIC_OPENAPI_PATH`
  (default `../backend`).

### Removed

- The coordinate `fields` input of `signatures.createRequest` and the `SignatureRequestField` type (the API
  refuses them: `SETUP_FIELDS_STAND_IN_THE_TEXT`).
- `templates.previewPdf`, `previewHtml`, `previewUnsavedPdf` (routes removed), and `contentJson` on templates.
- `media` on `documents.create` / `update`; `meta` and `status: 'published'` on `createFromStorage`;
  `deleteSourceFile` (the original stays in Storage).
- Delegated signing and `signerVariables` on template slots (refused: `TEMPLATE_SLOT_NOT_SUPPORTED`).
- `AccessRole` and `accessRoles` (role audiences); `isForSigning`. No `workflow.*` and no escrow surface.

## [Before 3.0.0 (folded in above)]

### Added

- Source-only dedicated document/invoice/bill entry schema kinds and separate
  `entrySubject` cardinality/family/side metadata. Input-field `requiredSubjects`
  and the native request envelope are unchanged; no runtime or release claim.

- Source-only explicit entry subject pin metadata and typed required-subject fields.
  Native subject requests accept optional `fieldId`; existing declarations without
  it remain valid envelopes. No client case-subject identity conversion, route,
  snapshot regeneration or publication is included.

- Source-only public case data/material reads, binary material/thumbnail/PDF download,
  and paginated historical event structure. `getEvents` accepts optional
  `afterEventUuid`/`limit`; its observation is now `public_event_history` with safe
  `data`, `hasMore` and `nextAfter`. OpenAPI snapshot and publication remain unchanged.

- Source-only public Processes case receipt/scalar metadata, event history,
  own-key resubmit and entry intake methods. Binary full/chunk upload sends raw bytes
  without automatic retries. Contract: [Processes](docs/PROCESSES.md).

- Source-only `chaindoc.processes.list`, `getEntry`, and keyed `start`, with pinned
  schema, request, receipt and refusal types. No SDK publication is included. Contract: [Processes](docs/PROCESSES.md).

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

- **(Superseded in 3.0.0: `"team"` is an input again, meaning the workspace's own audience.)
  `accessType` on inputs narrowed from `AccessType` (four values) to the new `AccessTypeInput`
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

| you had                             | you write                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `accessType: "team"`                | `accessType: "restricted"` + `accessEmails: [{ email, level }]` per person |
| `accessRoles: [{ roleId, level }]`  | `accessEmails: [{ email, level }]` per person                              |
| `import type { AccessRole }`        | delete the import — no replacement type exists                             |
| reading `doc.accessType === "team"` | ⚠️ **unchanged** — keep it; that is the historical value                   |

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

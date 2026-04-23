# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

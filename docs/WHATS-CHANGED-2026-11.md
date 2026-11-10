# What changed (November 2026)

For developers who use the Chaindoc API, `@chaindoc_io/server-sdk`, `@chaindoc_io/mcp-server` or the embed
(`@chaindoc_io/embed-sdk`). One page, eleven points. Each says what changed, what you must do, and the call that does it.

Versions that go with this change:

| Package | From | To |
|---|---|---|
| `@chaindoc_io/server-sdk` | 2.2.0 | 3.0.0 ([MIGRATION.md](../MIGRATION.md), [CHANGELOG.md](../CHANGELOG.md)) |
| `@chaindoc_io/mcp-server` and the Claude plugin | 0.2.0 | 0.3.0 (124 tools) |
| `@chaindoc_io/embed-sdk` | 2.2.0 | 2.3.0 (backwards compatible) |

The public contract is `openapi/public-api.json` in the backend (194 operations for SDK 3.0). The new versions are
version bumps in their repositories; check npm for what is actually published before you upgrade.

**Before anything else**, one change breaks existing integrations: point 3 (files are converted, coordinates are
refused). Read it first.

---

## 1. Business plan

**What it is.** Every `/api/v1` call, every MCP call and every embedded session issue needs a workspace on the Business plan
or above. Below it the answer is `403 INTEGRATIONS_NOT_IN_PLAN`. Webhooks are dropped, not queued. A key stops working
when the workspace is downgraded and works again after the upgrade. An embedded session that was already issued is not
asked again: the plan is checked when you create the session, not on each step inside it.

**What you do.**
- Handle `INTEGRATIONS_NOT_IN_PLAN` on every call; it is not a bug in your request. Tell the account owner to upgrade, then retry.
- Do not treat missing webhooks after a downgrade as a delivery fault.

**SDK 3.** `ChaindocPlanError` (`error.errorKey === 'INTEGRATIONS_NOT_IN_PLAN'`).

```typescript
try {
  await chaindoc.documents.get(id);
} catch (error) {
  if (error instanceof ChaindocPlanError) { /* ask the owner to upgrade */ }
}
```

**MCP.** The error envelope carries `errorKey: "INTEGRATIONS_NOT_IN_PLAN"` and a one-line `hint`.

---

## 2. Workspaces and accounts

**What it is.** A key acts for its workspace. Lists cover the workspace, and every act is attributed to the key.
A person is no longer just an e-mail: she can be addressed as her personal account or as a workspace she belongs to.
That address is an `account`, and you find it with `POST /accounts/lookup`. For each e-mail the answer is
`not_registered`, `hidden` (she chose not to show where she can be sent) or `options` (the person herself, `personal`, plus each
workspace she can be sent to). Omit `account` and the personal account is used, as before.

`account` is accepted on:
- `recipients[]` of a signature request;
- `accessEmails[]` (document access grants);
- template `slotAssignments[]`;
- `signatures.editRequest`;
- `contragentAccount` on a contract (proposes a workspace to the counterparty).

`accessType: 'team'` is an input again and means the workspace's own audience. Role audiences (`accessRoles`) stay removed.

**What you do.**
- Where you need a workspace, look the person up first and pass back the option you chose. Where you do not, change nothing.
- Treat `hidden` and `not_registered` as normal answers, not errors.
- Do not hard-code app links; they are workspace-scoped (`/w/{workspaceUuid}/...`).

**SDK 3.**

```typescript
const { results } = await chaindoc.accounts.lookup({ emails: ['anna@example.com'] });
recipients: [{ email: 'anna@example.com', role: 'client', account: results[0].options![1] }]
```

**MCP.** `chaindoc_accounts_lookup` (`POST /accounts/lookup`); pass the option back as `account` on the signature, access, template and
contract tools. The resource `chaindoc://guide/workspace-links` explains where things are in the app.

---

## 3. Documents are converted and fields are in the text (BREAKING)

**What it is.** The API now makes documents the way the Chaindoc app does.
- **A file is converted into a text document.** `POST /documents` with a Storage file, `POST /documents/from-storage` and a
  next version from a file answer **202 with a conversion**, not a document. The document appears when the conversion is
  ready, always as a **draft** (`status: 'published'` with a file is `DOCUMENT_CONVERSION_LANDS_AS_DRAFT`). The original
  stays in Storage. The converter uses the workspace's AI budget and storage, as in the app.
- **Signature places are chips in the text, bound by role. There are no coordinates.** A request that carries `fields`
  by page coordinates is refused with `422 SETUP_FIELDS_STAND_IN_THE_TEXT`. A text declares roles; each recipient
  is bound to one role.
- A document made as a file before November stays readable, downloadable and verifiable; requests already sent on it finish
  as before. It cannot start a **new** request: `422 DOCUMENT_FILE_CONVERTS`. Convert it into its next version first
  (the old version stays).
- A temporary upload (`POST /media/upload`) is no longer a document source: `DOCUMENT_FILE_VIA_STORAGE`. Use the chunked
  upload into Storage, or give `content` (a text).

### Before and after

Create from a file:

```typescript
// Before (2.x): a document came back at once
const doc = await chaindoc.documents.createFromFile(file, { name: 'Contract', status: 'published', meta: [] }, { filename: 'contract.pdf' });
const versionId = doc.document.currentVersion.id;

// After (3.0): a 202 conversion; wait for it (or use the webhooks)
const { conversion } = await chaindoc.documents.createFromFile(file, { name: 'Contract' }, { filename: 'contract.pdf' });
const ready = await chaindoc.conversions.wait(conversion.id); // ChaindocConversionFailedError / ChaindocConversionTimeoutError
const versionId = ready.versionId;
```

Send for signature:

```typescript
// Before (2.x): boxes on a page
await chaindoc.signatures.createRequest({
  versionId,
  recipients: [{ email: 'signer@example.com' }],
  fields: [{ signerEmail: 'signer@example.com', fieldType: 'signature', pageIndex: 0, xPct: 0.1, yPct: 0.8, wPct: 0.3, hPct: 0.08 }],
  deadline,
});

// After (3.0): roles in the text, each recipient bound by role
const { roles } = await chaindoc.documents.getContent(documentId);                    // roles[].key
await chaindoc.documents.addSignatureBlock(documentId, { roles: [{ key: 'client', name: 'Client' }] }); // a converted text has no chips yet
await chaindoc.signatures.createRequest({
  versionId,                                                                         // the version that holds the chips
  recipients: [{ email: 'signer@example.com', role: 'client' }],
  deadline,
});
```

A text document directly (no file):

```typescript
await chaindoc.documents.create({ name: 'NDA', status: 'draft', content: { version: 2, mode: 'document', doc } });
```

A next version: from text name the version you read; from a file it is converted again.

```typescript
await chaindoc.documents.update(id, { name, content, baseVersionId });   // 409 DOCUMENT_WRITING_BASE_MOVED if it moved
await chaindoc.documents.update(id, { name, storageFileId });            // 202 conversion
const { conversion } = await chaindoc.documents.convert(id);             // an old file document, into its next version
```

**What you do.**
1. Stop sending `fields`. Read `GET /documents/{id}/content` (`roles[]`, `fields[]`) and send `recipients[].role`.
2. Treat every file create or file version as asynchronous. Subscribe to `document.conversion.completed` and
   `document.conversion.failed` (point 9) or poll `GET /documents/conversions/{conversionId}`.
3. Stop using `media` on `documents.create` / `update`.
4. A text that holds roles needs exactly one recipient per role: `SIGNATURE_ROLE_REQUIRED`, `_UNKNOWN`, `_UNASSIGNED`, `_TWICE`.
   What the app would block is `409 SETUP_BLOCKED` with `blockers[]`.
5. A version that is still converting is `409 DOCUMENT_CONVERSION_PENDING`; a failed conversion is `422 DOCUMENT_CONVERSION_FAILED`
   with the reason code; a file version is `422 DOCUMENT_FILE_CONVERTS`.
6. A required signer field left empty at signing is `SIGNING_FIELDS_EMPTY` (point 10, and the embed in point 11).
7. Full limits: a full storage is `400 STORAGE_LIMIT_REACHED`, the AI budget `AI_LIMIT_REACHED` / `AI_NOT_IN_PLAN`. Both are
   refused before anything is spent.

`GET /documents/{id}` now also returns `format` (`text` or `file`) and `sendable`.

**SDK 3.** `documents.create({ content })`, `createFromFile`, `createFromStorage`, `update`, `convert`, `getContent`,
`addSignatureBlock`, `conversions.get`, `conversions.wait`. Removed: `SignatureRequestField` and `fields`, `media`.
A write that is retried carries an `idempotencyKey` (generated when you give none); see the retry note in
[MIGRATION.md](../MIGRATION.md) section 9.

**MCP.** `chaindoc_documents_create` (`content`), `chaindoc_documents_create_from_file`, `_create_from_storage`,
`chaindoc_conversions_get` / `_wait`, `chaindoc_storage_upload_file`, `chaindoc_documents_get_content`,
`_convert`, `_add_signature_block`, `chaindoc_signatures_create_request` (recipients by `role`, no coordinates).
`chaindoc_media_upload` is only for a saved-signature image.

---

## 4. Templates

**What it is.** Only the new template format works.
- A template is edited as a working copy. `content` is `{ version: 2, mode: 'template', doc }`; every update and publish
  names the `revision` you read, and a copy that moved is `409 TEMPLATE_WORKING_COPY_MOVED`.
- `contentJson` (Tiptap) is refused (`TEMPLATE_FORMAT_RETIRED`). `content` without `revision` is `TEMPLATE_REVISION_REQUIRED`.
  Old-format templates answer `410 TEMPLATE_RETIRED`.
- New: publish, archive, restore. `DELETE` is permanent; every later call is 404.
- **Removed:** the three preview routes (`previewPdf`, `previewHtml`, `previewUnsavedPdf`).
- Slots are filled by `email` or `account`. `signingMethod: 'delegated'` and `signerVariables` are refused
  (`TEMPLATE_SLOT_NOT_SUPPORTED`): a signer fills their own fields as they sign. A slot unfilled or filled twice is
  `TEMPLATE_SLOTS_REFUSED`; a value its field cannot hold is `TEMPLATE_VALUES_REFUSED`; a required one left empty is
  `TEMPLATE_VALUES_MISSING`.
- **Contracts and signature requests from a template work again**, on the new templates: `POST /templates/{id}/documents`,
  `/signature-requests`, `/contracts`. A contract template must hold exactly two slots, `business` and `contragent`
  (otherwise `TEMPLATE_SLOTS_REFUSED`). A route a template's format does not fit answers
  `TEMPLATE_FORMAT_NOT_SUPPORTED_BY_ROUTE`.

**What you do.** Rewrite template content into the new format; drop preview calls, delegated slots and `signerVariables`;
carry `revision` through update and publish.

**SDK 3.**

```typescript
await chaindoc.templates.create({ name, category, content: { version: 2, mode: 'template', doc } });
const { template } = await chaindoc.templates.get(id);
await chaindoc.templates.update(id, { content, revision: template.workingCopy!.revision });
await chaindoc.templates.publish(id, { changelog, revision });
await chaindoc.templates.archive(id);
await chaindoc.templates.restore(id);   // PUBLISHED if it has a published version, otherwise DRAFT
await chaindoc.templates.delete(id);    // permanent
await chaindoc.templates.createDocument(...); await chaindoc.templates.sendForSigning(...); await chaindoc.templates.createContract(...);
```

**MCP.** `chaindoc_templates_create` / `_update` (`content` + `revision`), `_publish`, `_archive`, `_restore`,
`_delete` (needs `confirm: true`), `chaindoc_templates_create_document`, `_send_for_signing`, `_create_contract`.
The three preview tools are gone.

---

## 5. Money

**What it is.**
- **Payment instructions** (where a customer pays): bank details per currency, plus an any-currency default; crypto
  wallets (network, asset, address checked for its network); `qr`; `localCode`. The instruction used on an invoice is
  chosen by cascade: invoice, then contract, then counterparty, then the business default.
- **Contragents** (counterparties) and **tax treatments** (the default comes from the counterparty).
- **Credit notes.** An invoice that money or a credit note has reached cannot be cancelled: `INVOICE_MONEY_OR_CREDIT_NOTE`.
  Use a credit note.
- Invoices: `discount`, `showUnpaid`, `takePaidAhead`, `stripePaymentAllowed`, `taxTreatmentId`, `paymentInstructionId`;
  `canCancel`, `creditedAmount`, `paidAheadAmount`, `taxSummary`, `buyer`, `seller` in the answer; overdue is computed.
- Transactions: `method`, `paidOn`, `removedAt`, `kind`, plus edit and remove (webhooks in point 9).
- Business owners are **emailed whenever bank details are created, changed, made default or assigned** to a counterparty by a key.

**What you do.**
- **Never retry a money call blindly.** SDK 3.0 does not (`charge`, `markPaid`, credit notes, payment-instruction writes,
  `setStripePayment`, QES). After an uncertain failure, read the object, then decide.
- Cancel with a credit note once money has arrived.
- A `charge` the Stripe cascade refuses is a `ChaindocPaymentError` (`STRIPE_*`, for example `STRIPE_NOT_READY`).

**SDK 3.**

```typescript
const { paymentInstructionId } = await chaindoc.paymentInstructions.create({ type: 'bank', currencyCode: 'EUR', iban, qr: true });
await chaindoc.paymentInstructions.assignToContragent(/* ... */);
await chaindoc.invoices.create(contractId, { title, amount, dueDate, paymentInstructionId, taxTreatmentId });
await chaindoc.invoices.markPaid(contractId, invoiceId, { method /* ... */ });
await chaindoc.invoices.createCreditNote(contractId, invoiceId, { /* ... */ });
await chaindoc.contracts.setPaymentInstruction(/* ... */);  await chaindoc.contracts.setStripePayment(/* ... */);
await chaindoc.contragents.list(); await chaindoc.taxTreatments.list(); await chaindoc.invoices.listCreditNotes(contractId, invoiceId);
```

**MCP.** `chaindoc_contragents_list` / `_get` / `_create` / `_update`, `chaindoc_tax_treatments_list`,
`chaindoc_payment_instructions_list` (**read only**: no tool creates, changes, defaults or assigns bank or wallet details),
`chaindoc_invoices_list_credit_notes`, `chaindoc_invoices_create_credit_note`, `chaindoc_invoices_mark_paid`,
`chaindoc_invoices_charge`. `charge`, `mark_paid`, `create_credit_note` and `autoCharge: true` refuse with
`confirmation_required` until the agent passes `confirm: true` after the user said yes.

---

## 6. Contracts

**What it is.**
- **Annexes are invisible to keys until both sides sign.** An annex that both sides sign does not show as an invoice of the
  API (and is not counted in its statuses) until the partner has signed it.
- **A cancelled untouched request can be sent again over a fresh copy** (`POST /signatures/requests/{id}/resend`).
- `additional_agreement.signed` is a new webhook (point 9).
- A contract from a template: point 4. A counterparty can be a workspace: `contragentAccount` (point 2). A counterparty can be
  a full billing identity (`contragent`: `legalName`, `vatNumber`, `registrationNumber`, `entityType`) as well as `contragentEmail`.

**What you do.** Do not expect an annex invoice in your lists before the partner signs. Use `resend` instead of creating a
second request for a cancelled one.

**SDK 3.** `signatures.resend(requestId)`; `contracts.agreements.*` for amendments (existing); `contracts.update` /
`create` accept `contragent` and `contragentAccount`.

**MCP.** `chaindoc_signatures_resend`; `chaindoc_contracts_create` with the counterparty identity and `contragentAccount`.

---

## 7. QES (qualified electronic signature)

**What it is.** A signer can sign with a qualified signature made on their own device. The flow is three calls: promise, prepare,
finalize. It exists on the public API (`/signatures/qes/{requestId}/...`) and inside an embedded session
(`/embedded/signatures/qes/{requestId}/...`). The embedded signing screen runs the embedded flow for you (point 11). When a
document needs a qualified signature the embed cannot make, the iframe reports `SIGNING_METHOD_BELOW_REQUIREMENT`.
The access answer carries `qesEligibility`.

**What you do.** Use the QES calls only if you build your own signing device flow. Private key material never goes to the SDK:
it refuses it locally and you only send `signerCertPem`, the data to sign and the signature value.

**SDK 3.**

```typescript
await chaindoc.signatures.qes.promise(requestId, { fieldValues });
const { dataToSignB64, sessionId } = await chaindoc.signatures.qes.prepare(requestId, { signerCertPem });
await chaindoc.signatures.qes.finalize(requestId, { sessionId, signatureValueB64 });
```

`fieldValues` is how a signer's own fields are sent with the signature; a required one left empty is `SIGNING_FIELDS_EMPTY`.

**MCP.** None. MCP has no QES tools in 0.3.0 (it is on the roadmap).

---

## 8. Processes replace workflows

**What it is.** The old approval `workflows` routes and `workflow.*` events are gone. **Processes** is their replacement:
a process has entries, you start a case at an entry, and the case moves through the process. Connected systems answer the process
with an HMAC-signed response.

Routes: `GET /processes`, `GET /processes/{processKey}/entries/{entryKey}`, `POST .../entries/{entryKey}/cases`, intakes
for file material, `GET /processes/cases/{caseUuid}` with `/data`, `/events`, `/materials`, `POST /processes/cases/{caseUuid}/resubmit`,
`POST /processes/integrations/{integrationUuid}/responses`.

**What you do.**
- Replace workflow calls with processes. There is no 1:1 mapping; read the entry's schema (`getEntry`) before starting a case.
- Remove any handler for `workflow.*` events; none are sent.
- For `respond`, keep the integration secret on your server. It is never a request field you log.

**SDK 3.** `chaindoc.processes.list`, `getEntry`, `start`, `getCase`, `getEvents`, `getData`, `getMaterials`, `openMaterial`,
`getThumbnail`, `exportData`, `resubmit`, `beginIntake`, `getIntake`, `abandonIntake`, `uploadIntake`, `uploadIntakeChunk`,
`respond`. Details: [PROCESSES.md](PROCESSES.md).

**MCP.** `chaindoc_processes_list`, `_get_entry`, `_start`, `_get_case`, `_get_events`, `_respond`. `respond` reads the
secret from `CHAINDOC_PROCESS_INTEGRATION_SECRETS` (local stdio only); without it the tool answers `unavailable`.
File intakes are not in MCP.

---

## 9. Webhooks

**What it is.** The event list is the contract's 22 events:

`document.created`, `document.verified`, `document.signed`, `document.conversion.completed`, `document.conversion.failed`,
`signature.request.created`, `signature.request.completed`, `signature.request.rejected`, `contract.created`,
`contract.status_changed`, `contract.signed`, `additional_agreement.signed`, `contract.cancelled`, `contract.terminated`,
`invoice.created`, `invoice.sent`, `invoice.paid`, `invoice.cancelled`, `transaction.created`, `transaction.updated`,
`transaction.edited`, `transaction.removed`.

- New: the two `document.conversion.*` events, `additional_agreement.signed`, `transaction.edited`, `transaction.removed`.
- Gone: all `workflow.*` events. There is no escrow surface.
- Every event whose object belongs to a workspace carries `data.workspace.uuid` (null only if the workspace could not be
  resolved at delivery).
- **Contract events are delivered per side.** `contract.*`, `additional_agreement.signed`, `invoice.*` and `transaction.*` go
  to the active keys of each side that is a workspace, once per side, with `data.side` set to `business` or `contragent`.
  If both sides use your keys you receive two events for one change; tell them apart by `workspace.uuid` and `side`.
- `document.created` still fires when the document is made (at landing, for a file).
- Money events carry the payment date and method (`paidOn`, `method`).
- An event goes only to keys that can read its object. Webhooks are dropped below Business (point 1).
- Delivery is configured in the Chaindoc dashboard, not by API. Verification is unchanged.

`document.conversion.completed` carries `conversionId`, `documentId`, `versionId`, `kind` (`new` or `version`) and `review`
(`ready_for_review` or `needs_review`). `document.conversion.failed` carries `conversionId`, `kind` and `failure.code`.

**What you do.** Re-subscribe to the new events; make your handler idempotent on the delivery `id` (retries reuse it); expect
more than one delivery per contract change.

**SDK 3.** `Chaindoc.webhooks.verify(...)`; the event union has the 22 types.

**MCP.** `chaindoc_webhooks_verify` (HMAC-SHA256, 5-minute replay window; headers `X-Chaindoc-Signature`, `X-Chaindoc-Timestamp`,
`X-Chaindoc-Event`, `X-Chaindoc-Delivery-Id`).

---

## 10. New refusal codes

Every error carries the server's `errorKey`. In SDK 3.0 branch on `hasErrorKey(error, 'KEY')` or on the class. In MCP the
envelope has `errorKey` and a `hint`.

| Code | When | What to do |
|---|---|---|
| `INTEGRATIONS_NOT_IN_PLAN` (403) | The workspace is below the Business plan | Upgrade the workspace; the key works again afterwards |
| `ACCOUNT_READ_ONLY` | The account is read only | Stop writing; reads still work. Ask the owner to restore write access |
| `STORAGE_LIMIT_REACHED` (400) | Storage is full for a file, a conversion or a copy | Free space or upgrade; nothing was created |
| `AI_LIMIT_REACHED` / `AI_NOT_IN_PLAN` (400) | A conversion needs AI the workspace has used up or does not have | Wait for the budget or upgrade; nothing was spent |
| `SETUP_FIELDS_STAND_IN_THE_TEXT` (422) | A signature request carries coordinate `fields` | Remove `fields`; bind recipients by `role` |
| `SETUP_BLOCKED` (409) | The app would block the send; `blockers[]` lists why | Fix each blocker (for example, a signature chip missing) and send again |
| `SIGNATURE_ROLE_REQUIRED` / `_UNKNOWN` / `_UNASSIGNED` / `_TWICE` | A recipient has no role, an unknown role, or a role has no or two recipients | One recipient per role of the text (`getContent().roles`) |
| `SIGNING_FIELDS_EMPTY` | A required signer field is empty or invalid at signing (`details.fields[]`: `key`, `name`, `problem: missing` or `invalid`) | Send `fieldValues`, or have the signer fill them |
| `NOT_YOUR_TURN` | An earlier signer has not signed yet | Wait for the turn; retry |
| `KYC_WAITS_FOR_A_UNIT` | The identity check cannot start: no KYC unit left | The sender needs a KYC unit; retry once one is available |
| `DOCUMENT_FILE_CONVERTS` (422) | A new request on a file document | `documents.convert(id)`, wait, then send the next version |
| `DOCUMENT_CONVERSION_PENDING` (409) / `DOCUMENT_CONVERSION_FAILED` (422) | The version is still converting / the conversion failed (see `failure.code`) | Wait for the webhook; on failure fix the cause and convert again |
| `DOCUMENT_CONVERSION_LANDS_AS_DRAFT` | `status: 'published'` on a file | Omit `status`; the document lands as a draft |
| `DOCUMENT_FILE_VIA_STORAGE` | A temporary upload as a document source | Upload into Storage and use `createFromStorage`, or send `content` |
| `DOCUMENT_WRITING_BASE_MOVED` (409) | Your `baseVersionId` is no longer the current version | Read the document again and redo the change |
| `TEMPLATE_RETIRED` (410) / `TEMPLATE_FORMAT_RETIRED` | An old-format template / `contentJson` sent | Rebuild the template in the new format (`content`) |
| `TEMPLATE_REVISION_REQUIRED` / `TEMPLATE_WORKING_COPY_MOVED` (409) | `revision` missing / the working copy moved | Read the template and send its current `workingCopy.revision` |
| `TEMPLATE_SLOT_NOT_SUPPORTED` / `TEMPLATE_SLOTS_REFUSED` | Delegated slot or `signerVariables` / a slot unfilled, filled twice, or a contract template without `business` and `contragent` | Fill each slot once by `email` or `account` |
| `TEMPLATE_VALUES_REFUSED` / `TEMPLATE_VALUES_MISSING` | A value its field cannot hold / a required value empty | Correct the `variables` |
| `INVOICE_MONEY_OR_CREDIT_NOTE` | Cancel of an invoice that money or a credit note has reached | Create a credit note |
| `STRIPE_NOT_READY` (and other `STRIPE_*`) | The seller's Stripe is not ready for a charge | The seller finishes Stripe setup; do not retry the charge blindly |

Codes that the embed reports in its `ERROR` event are in point 11. A source note on verification: these keys are in the
backend source and, where marked in the OpenAPI, in `openapi/public-api.json`; the contract does not list every one.

---

## 11. The embed

**What it is.**
- **New look.** The signing screen is rebuilt on the same component (`DocumentSigningView`) the Chaindoc app draws, driven by one
  read (`GET /embedded/signing-window/{requestId}`: lane, requirements, what holds the signer, standing, decline, result).
  The embed now looks like the app and shows 14 languages. Your iframe needs no code change for the look.
- **Decline.** A signer can decline from the embed (`POST /embedded/signatures/requests/{requestId}/decline`). The reason is
  optional on a document request (up to 500 characters), required on a contract or an amendment (up to 1000). The request
  ends for everybody, the sender is told, and the declined webhooks fire.
- **Card step.** A counterparty who must add a payment method does it inside the embed (previously a dead end). Two embedded
  routes: `POST /embedded/contracts/signing/{requestId}/payment-method/setup-intent` (answers `clientSecret`, `setupIntentId`,
  `stripeAccountId`, `publishableKey`) and `.../payment-method/attach`. Card only for now. Card data goes to Stripe's own fields;
  it never reaches Chaindoc or your page. The embed does not list saved cards.
- **QES** on the signer's device and **fields** (`fieldValues`) are handled by the embed; typed refusals are shown to the signer.
- **embed-sdk 2.3.0** adds events and codes. Nothing you wrote against 2.2.0 breaks: the new fields are optional and an iframe
  older than 2.3.0 sends neither.

### embed-sdk 2.3.0 events

Every message is `{ source: "chaindoc-embed", type, data? }`.

| `type` | `data` | Callback | New in 2.3.0 |
|---|---|---|---|
| `READY` | none | `onReady` | |
| `RESIZE` | `{ height }` | none | |
| `SUCCESS` | `{ sessionId, documentId, signatureId, signedAt, result?, signatureKind? }` | `onSuccess` | `result.kind`, `signatureKind` |
| `DECLINED` | `{ sessionId, documentId?, reason?, declinedAt? }` | `onDecline` | the event |
| `ERROR` | `{ code, message, details? }` | `onError` | new codes |
| `CANCEL` | none | `onCancel` (not after `SUCCESS` or `DECLINED`) | |
| `CLOSED` | none | `onClose` | |
| `RESEND_OTP` | `{ email, sentAt }` | `onResendOtp` | |

- `result.kind`: `document_signature` or `contract_signature`.
- `signatureKind`: `simple` or `qualified`.
- `DECLINED` is not a success: there is no `SUCCESS` after it.
- New `ERROR` codes: `NOT_YOUR_TURN`, `ACCOUNT_READ_ONLY`, `KYC_WAITS_FOR_A_UNIT`, `SIGNING_FIELDS_EMPTY`
  (`details.fields[]`; read with `getSigningFieldProblems(error)`), `SIGNING_METHOD_BELOW_REQUIREMENT`, `INTEGRATIONS_NOT_IN_PLAN`,
  `PAYMENT_PROVIDER_ERROR`, `PAYMENT_PROVIDER_NOT_CONFIGURED`, `EMBEDDED_PAYMENT_METHOD_NOT_REQUIRED`,
  `EMBEDDED_PAYMENT_METHOD_ALREADY_LINKED`, `EMBEDDED_SIGNING_REQUEST_CLOSED`, `EMBEDDED_CONTRACT_NOT_SIGNABLE`
  (the last two may carry `details.status`). An unknown code stays a string.

```typescript
sdk.openSignatureFlow({
  sessionId,
  onSuccess: ({ result, signatureKind }) => console.log(result?.kind, signatureKind),
  onDecline: ({ reason }) => console.log('declined', reason),
  onError: (error) => {
    if (error.code === 'SIGNING_FIELDS_EMPTY') console.log(getSigningFieldProblems(error));
  },
});
```

**What you do.**
- Add an `onDecline` handler; a decline used to be a `CANCEL`.
- Show your own message for the typed `ERROR` codes you care about.
- Use `result.kind` to tell a document signature from a contract one.
- Create embedded sessions with `chaindoc.embedded.createSession(...)` as before; the session needs the Business plan (point 1).
- A document converted from a file must hold the signer's chips before you send it, or the embed has nothing to sign (point 3).

**SDK 3.** `chaindoc.embedded.createSession({ email, ... })` (unchanged), then `sdk.openSignatureFlow({ sessionId, ... })` in
`@chaindoc_io/embed-sdk` 2.3.0.

**MCP.** `chaindoc_embedded_create_session` (`POST /embedded/sessions`, 10-minute TTL).

---

## Upgrade checklist

- [ ] Documents: stop sending `fields` and `media`; use `content` or `createFromFile` plus `conversions.wait` or the conversion webhooks
- [ ] Signature requests: add `role` to each recipient; add chips to converted texts
- [ ] Templates: `content` plus `revision`; remove previews, delegated slots, `signerVariables`
- [ ] Handle `INTEGRATIONS_NOT_IN_PLAN`, `ACCOUNT_READ_ONLY`, `STORAGE_LIMIT_REACHED`, `AI_LIMIT_REACHED`, `NOT_YOUR_TURN`
- [ ] Replace `workflow` calls and handlers with processes
- [ ] Re-subscribe to the new webhook events; handle one delivery per contract side
- [ ] Money: no blind retries; cancel with a credit note once money arrived
- [ ] Embed: update to embed-sdk 2.3.0, add `onDecline`, handle the new `ERROR` codes

See [MIGRATION.md](../MIGRATION.md) for every SDK change with before and after.

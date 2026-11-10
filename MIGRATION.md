# Migration Guide

## Upgrading from 2.x to 3.0.0

```bash
npm install @chaindoc_io/server-sdk@3.0.0
```

**The headline:** in 3.0 **a file you send is converted into a text document** (as in the Chaindoc app), and
**signature places are chips in that text, not boxes on a page**. A request that carries coordinate `fields`
is refused (`422 SETUP_FIELDS_STAND_IN_THE_TEXT`) and a file-only document cannot be sent for signature until it
is converted. Everything below follows from that, plus the Business plan gate, accounts, new templates and the
money surface.

Also new for every call: `403 INTEGRATIONS_NOT_IN_PLAN` below a Business plan (a key stops on downgrade and comes
back on upgrade), `ACCOUNT_READ_ONLY` on a read-only account, `STORAGE_LIMIT_REACHED` and `AI_LIMIT_REACHED` on a
full storage or AI budget. All are typed errors (see "Errors").

### 1. A file becomes a document by conversion (202)

`createFromFile` and `createFromStorage` no longer return a document: they answer **202 with a conversion**.
The document is made when the conversion is ready, **always as a draft** (`status: 'published'` with a file is
`DOCUMENT_CONVERSION_LANDS_AS_DRAFT`), and the original stays in Storage. `meta` and `deleteSourceFile` are
refused for a conversion.

```typescript
// Before (2.x)
const doc = await chaindoc.documents.createFromFile(file, {
  name: 'Contract', description: 'Q3', meta: [], hashtags: [], status: 'published',
}, { filename: 'contract.pdf' });
const versionId = doc.document.currentVersion.id;

// After (3.0)
const { conversion } = await chaindoc.documents.createFromFile(file, { name: 'Contract' }, { filename: 'contract.pdf' });
const ready = await chaindoc.conversions.wait(conversion.id); // throws ChaindocConversionFailedError / ChaindocConversionTimeoutError
const { document } = await chaindoc.documents.get(ready.documentId);
const versionId = ready.versionId;
// Prefer webhooks to polling: document.conversion.completed / document.conversion.failed
```

`documents.create({ media })` and `documents.update({ media })` are gone (a temp upload is not a Storage file:
`DOCUMENT_FILE_VIA_STORAGE`). Use the chunked upload + `createFromStorage`, or give `content`:

```typescript
// Before
await chaindoc.documents.create({ name: 'NDA', media: media[0], status: 'draft' });

// After: a text document...
await chaindoc.documents.create({ name: 'NDA', status: 'draft', content: { version: 2, mode: 'document', doc } });
// ...or a file through Storage
await chaindoc.documents.createFromFile(file, { name: 'NDA' });
```

Next versions: from text, name the version you read; from a file, it is converted (202).

```typescript
// Before
await chaindoc.documents.update(id, { name, media, status: 'draft' });
// After
await chaindoc.documents.update(id, { name, content, baseVersionId, status: 'draft' }); // 409 DOCUMENT_WRITING_BASE_MOVED if it moved
await chaindoc.documents.update(id, { name, storageFileId, status: 'draft' });          // 202 conversion
```

A document made as a file before 3.0 stays readable, downloadable and verifiable; requests already sent on it
finish as before. To send it again, convert it into its next version (the old one stays):

```typescript
const { document } = await chaindoc.documents.get(id);        // document.format === 'file', sendable === false
const { conversion } = await chaindoc.documents.convert(id);   // 202
await chaindoc.conversions.wait(conversion.id);
```

### 2. Signature requests: roles, not coordinates

```typescript
// Before (2.x)
await chaindoc.signatures.createRequest({
  versionId,
  recipients: [{ email: 'signer@example.com' }],
  fields: [{ signerEmail: 'signer@example.com', fieldType: 'signature', pageIndex: 0, xPct: 0.1, yPct: 0.8, wPct: 0.3, hPct: 0.08 }],
  deadline,
});

// After (3.0): the text holds roles and their chips; bind each recipient by role
const { roles } = await chaindoc.documents.getContent(documentId);           // roles[].key
// a converted text has no chips yet: add the roles' Signature / Date signed chips (next version)
await chaindoc.documents.addSignatureBlock(documentId, { roles: [{ key: 'client', name: 'Client' }] });
await chaindoc.signatures.createRequest({
  versionId,                                                                // the version that holds the chips
  recipients: [{ email: 'signer@example.com', role: 'client' }],
  deadline,
});
```

- `fields` and the `SignatureRequestField` type are removed; passing `fields` from JS is refused before any call
  with `SETUP_FIELDS_STAND_IN_THE_TEXT`.
- A text that holds roles needs one recipient per role (`SIGNATURE_ROLE_REQUIRED` / `_UNKNOWN` / `_UNASSIGNED` /
  `_TWICE`). A required signer field left empty at signing is `SIGNING_FIELDS_EMPTY`; what the app would block
  is `SETUP_BLOCKED` with `blockers[]`.
- A converting version is `DOCUMENT_CONVERSION_PENDING` (409) or `DOCUMENT_CONVERSION_FAILED` (422); a file
  version is `DOCUMENT_FILE_CONVERTS` (422).

### 3. Templates: new content format, working copy and revision

```typescript
// Before (2.x)
await chaindoc.templates.create({ name, category, contentJson: tiptapJson });
await chaindoc.templates.update(id, { contentJson: tiptapJson });
await chaindoc.templates.previewPdf(id, { variables });           // removed
await chaindoc.templates.restore(id);                              // "back to DRAFT"

// After (3.0)
await chaindoc.templates.create({ name, category, content: { version: 2, mode: 'template', doc } });
const { template } = await chaindoc.templates.get(id);
await chaindoc.templates.update(id, { content, revision: template.workingCopy!.revision }); // 409 TEMPLATE_WORKING_COPY_MOVED
await chaindoc.templates.publish(id, { changelog, revision });
await chaindoc.templates.archive(id);
await chaindoc.templates.restore(id);   // PUBLISHED when it has a published version, DRAFT when never published
await chaindoc.templates.delete(id);    // permanent: every later call is 404
```

- `contentJson` (Tiptap) is refused (`TEMPLATE_FORMAT_RETIRED`); old-format templates answer
  `410 TEMPLATE_RETIRED`. `content` without `revision` is `TEMPLATE_REVISION_REQUIRED`.
- **Removed:** `templates.previewPdf`, `previewHtml`, `previewUnsavedPdf` (the routes are gone).
- Slot assignments: `{ signerKey, email, account? }`. `signingMethod: 'delegated'` and `signerVariables` are
  refused (`TEMPLATE_SLOT_NOT_SUPPORTED`: a signer fills their own fields as they sign). A slot left unfilled
  or filled twice is `TEMPLATE_SLOTS_REFUSED`; a value its field cannot hold `TEMPLATE_VALUES_REFUSED`, a
  required one left empty `TEMPLATE_VALUES_MISSING`.
- `templates.createContract` / `sendForSigning` work on the new templates: a contract template must hold exactly
  two slots (`business` and `contragent`); `contragentAccount` can propose a workspace to the counterparty.

### 4. People are addressed by `account`

```typescript
// Before: an e-mail was the whole address
recipients: [{ email: 'anna@example.com' }]

// After: look up where she can be sent, then pass the option (optional; omitted = her personal account)
const { results } = await chaindoc.accounts.lookup({ emails: ['anna@example.com'] });
recipients: [{ email: 'anna@example.com', role: 'client', account: results[0].options![1] }]
```

`account` is accepted on `recipients[]`, `accessEmails[]`, template `slotAssignments[]`, `signatures.editRequest`,
and `contragentAccount` on every contract create/update. `accessType: 'team'` (the workspace's audience) is an
input again; a role audience (`accessRoles`) stays removed.

### 5. Money

New resources: `contragents`, `paymentInstructions`, `taxTreatments`; new calls
`contracts.setPaymentInstruction`, `contracts.setStripePayment`, `invoices.listCreditNotes`,
`invoices.createCreditNote`. New invoice inputs: `taxTreatmentId`, `paymentInstructionId`, `discount`,
`showUnpaid`, `takePaidAhead`, `stripePaymentAllowed`; `markPaid` takes `method`. New fields on `Invoice`
(`creditedAmount`, `paidAheadAmount`, `canCancel`, `taxSummary`, `buyer`, `seller`, ...) and on `Transaction`
(`method`, `paidOn`, `removedAt`, `kind`).

```typescript
// Before: bank details were whatever the business settings held
await chaindoc.invoices.create(contractId, { title, amount, dueDate });

// After: pick where the customer pays (cascade invoice > contract > counterparty > business default)
const { paymentInstructionId } = await chaindoc.paymentInstructions.create({ type: 'bank', currencyCode: 'EUR', iban, qr: true });
await chaindoc.invoices.create(contractId, { title, amount, dueDate, paymentInstructionId, taxTreatmentId });
```

- **Money calls are no longer retried automatically** (`charge`, `markPaid`, `send`-adjacent writes are explicit):
  `invoices.charge`, `markPaid`, `createCreditNote`, payment-instruction writes, `setStripePayment`, QES calls.
  After an uncertain failure, read the object first.
- `invoices.cancel` of an invoice money or a credit note reached is `INVOICE_MONEY_OR_CREDIT_NOTE` (use a credit
  note); `charge` refused by the Stripe cascade is a `ChaindocPaymentError` (`STRIPE_*`).
- The business owners are emailed when bank details are created, changed or assigned by a key.

### 6. QES and resend (new)

```typescript
await chaindoc.signatures.qes.promise(requestId, { fieldValues });
const { dataToSignB64, sessionId } = await chaindoc.signatures.qes.prepare(requestId, { signerCertPem });
await chaindoc.signatures.qes.finalize(requestId, { sessionId, signatureValueB64 });
await chaindoc.signatures.resend(cancelledOrExpiredRequestId); // a new request over a fresh copy
```

### 7. Errors

`ChaindocError` gains `errorKey`. Branch on it or on the class:

```typescript
// Before
if (error instanceof ChaindocError && error.statusCode === 403) { /* which 403? */ }
// After
if (error instanceof ChaindocPlanError) { /* INTEGRATIONS_NOT_IN_PLAN */ }
if (hasErrorKey(error, 'ACCOUNT_READ_ONLY')) { /* ... */ }
```

Classes: `ChaindocPlanError`, `ChaindocReadOnlyError`, `ChaindocLimitError`, `ChaindocDocumentFileError`,
`ChaindocSigningSetupError`, `ChaindocNotYourTurnError`, `ChaindocTemplateError`, `ChaindocPaymentError`,
`ChaindocConversionFailedError`, `ChaindocConversionTimeoutError`.

### 8. Webhooks

The union is the contract's 22 events: new `document.conversion.completed` and `document.conversion.failed`
(plus `transaction.edited`, `transaction.removed`, `additional_agreement.signed`). There are no `workflow.*`
events and no escrow surface. `workspace.uuid` is on every event whose object has a workspace; contract events
carry `side`. Signature verification is unchanged (`Chaindoc.webhooks.verify`). Webhooks are dropped below a
Business plan.

### 9. Retries: writes are not repeated blind (behaviour change)

2.x retried every request on 5xx, 429, timeouts and connection resets, so a POST could be done twice
(a second invoice, a second signature request). In 3.0:

- GET/HEAD: unchanged.
- POST/PUT/PATCH/DELETE: retried only on 429 or when the request never reached the server (`ECONNREFUSED`,
  `ENOTFOUND`, `EAI_AGAIN`). A 5xx, a timeout, `ECONNRESET` or `ETIMEDOUT` surfaces as an error: read the
  object, then decide.
- Document writes carry an `idempotencyKey` (the SDK generates one if you pass none and reuses it on every
  attempt), so they are still retried on 5xx without risk. Pass your own key to make a retry of your own
  safe across processes.
- `noRetry` still disables retries for a request.

### 10. Smaller changes

- `Contract` create/update/import/empty/minimal accept `contragent` (full billing identity: `legalName`,
  `vatNumber`, `registrationNumber`, `entityType`) as well as `contragentEmail`.
- Path ids are validated and percent-encoded: an empty id, `.` or `..` throws before any request.
- `processes.*` (merged from the processes branch) and `processes.respond` are new.
- `scripts/sync-openapi-snapshot.mjs <path>` (default `../backend/openapi/public-api.json`).

### Upgrade checklist

- [ ] Replace `media`-based creates with `content` or `createFromFile` + `conversions.wait` (or the conversion webhooks)
- [ ] Remove `fields` from signature requests; add `role` to each recipient; add chips (`addSignatureBlock`) to converted texts
- [ ] Move templates to `content` + `revision`; delete preview calls and delegated / `signerVariables` slots
- [ ] Handle `INTEGRATIONS_NOT_IN_PLAN`, `ACCOUNT_READ_ONLY`, `STORAGE_LIMIT_REACHED`, `AI_LIMIT_REACHED`
- [ ] Do not blindly retry money calls
- [ ] Subscribe to `document.conversion.*` if you polled before

---

## Earlier migrations

This guide helps you upgrade from alpha versions to the stable 1.0.0 release.

## Upgrading from 0.1.0-alpha.x to 1.0.0

### Installation

```bash
npm install @chaindoc_io/server-sdk@1.0.0
```

### Breaking Changes

**There are no breaking changes in 1.0.0.** The API is fully backwards compatible with all alpha versions.

### Environment Configuration

If you were using `baseUrl` (alpha.1-alpha.4), update to `environment`:

```typescript
// Before (alpha.1 - alpha.4)
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",
  baseUrl: "https://api-demo.chaindoc.io",
});

// After (alpha.5+ and 1.0.0)
const chaindoc = new Chaindoc({
  secretKey: "sk_xxx",
  environment: "staging", // 'production' | 'staging' | 'development'
});
```

### Environment URLs

| Environment   | API URL                        |
| ------------- | ------------------------------ |
| `production`  | `https://api.chaindoc.io`      |
| `staging`     | `https://api-demo.chaindoc.io` |
| `development` | `https://api-demo.chaindoc.io` |

### What's New in 1.0.0

- **Stable API**: All modules are now production-ready with a stable API
- **Improved Documentation**: Comprehensive guides and API reference
- **Enhanced TypeScript**: Improved type definitions
- **Better Error Messages**: More descriptive error handling

### Checklist

- [ ] Update package version to `1.0.0`
- [ ] Replace `baseUrl` with `environment` if applicable
- [ ] Review error handling (no changes required, but improvements available)
- [ ] Update API keys for production if moving from test environment

### Support

If you encounter any issues during migration:

- **GitHub Issues**: [Report a bug](https://github.com/ChaindocIO/server-sdk/issues)
- **Documentation**: [chaindoc.io/docs](https://chaindoc.io/docs)
- **Email**: support@chaindoc.io

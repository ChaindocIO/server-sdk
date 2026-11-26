/**
 * Typed errors.
 *
 * Every refusal the API gives carries `{ message, errorKey }`. `ChaindocError.errorKey` reads it, and the
 * client builds the specific subclass below for the families an integrator branches on. All of them are
 * `instanceof ChaindocError`, so existing `catch` blocks keep working.
 */

/**
 * The keys the SDK knows by name: every `errorKey` the public API (`/api/v1`) and `embedded.createSession` can answer today,
 * swept from the server's code paths behind each route (the route itself, its guards, its validation pipe and the services
 * it calls). The server may add others: `errorKey` is a `string` for those, so a `switch` over it needs a `default`.
 *
 * Processes (`/api/v1/processes/*`) answer their own vocabulary (`ProcessStartRefusalKey`, `docs/PROCESSES.md`); the
 * signing window's codes reach your page through `@chaindoc_io/embed-sdk` (`EmbedErrorCode`), not through this list.
 *
 * Some refusals carry facts beside the key — see {@link ChaindocRefusalBody} (`err.response`).
 */
export const ERROR_KEYS = {
  // request shape — any route
  /** 400 · the body or the query failed validation; `message` is the list of the broken constraints. Fix the input. */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  // plan, account, key, limits
  INTEGRATIONS_NOT_IN_PLAN: 'INTEGRATIONS_NOT_IN_PLAN',
  ACCOUNT_READ_ONLY: 'ACCOUNT_READ_ONLY',
  /** 403 · the key owner's account is banned. */
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',
  /** 403 · the key's workspace is suspended: nothing new can be started in it; what it holds is read and downloaded. */
  WORKSPACE_SUSPENDED: 'WORKSPACE_SUSPENDED',
  /** 403 · the key's workspace is closed: nothing new is started or paid in it; what it holds is read and downloaded. */
  WORKSPACE_CLOSED: 'WORKSPACE_CLOSED',
  /** The key owner's role in the workspace does not allow this act. */
  WORKSPACE_ROLE_FORBIDS: 'WORKSPACE_ROLE_FORBIDS',
  /** The workspace is archived (its subscription ended): renew it to write again. */
  WORKSPACE_ARCHIVED: 'WORKSPACE_ARCHIVED',
  /** 403 · this act is a person's, and the key's workspace is not a personal one (e.g. `contracts.businessSign`). */
  KEY_WORKSPACE_IS_NOT_A_PERSON: 'KEY_WORKSPACE_IS_NOT_A_PERSON',
  /** A `delegated` recipient would sign for an organization's row; a key signs only for its own person. */
  KEY_MAY_NOT_CLAIM_AN_ORGANIZATIONAL_ROW: 'KEY_MAY_NOT_CLAIM_AN_ORGANIZATIONAL_ROW',
  /** 400 · `signatures.sign`: the key names no signer row it may act on in this request. */
  KEY_NAMES_NO_SIGNER: 'KEY_NAMES_NO_SIGNER',
  /** 400 · the key's person holds more than one signer row of this request; the act cannot tell which. */
  KEY_ACT_AMBIGUOUS_SIGNER: 'KEY_ACT_AMBIGUOUS_SIGNER',
  STORAGE_LIMIT_REACHED: 'STORAGE_LIMIT_REACHED',
  AI_LIMIT_REACHED: 'AI_LIMIT_REACHED',
  AI_NOT_IN_PLAN: 'AI_NOT_IN_PLAN',
  /** 400 · the plan's contracts are used up (`contracts.create`). Nothing was created. */
  CONTRACTS_LIMIT_REACHED: 'CONTRACTS_LIMIT_REACHED',
  /** The plan's open signature requests are used up. Nothing was created. */
  OPEN_SIGN_REQUESTS_LIMIT_REACHED: 'OPEN_SIGN_REQUESTS_LIMIT_REACHED',
  /** The plan's signatures are used up. */
  SIGNATURE_CREDITS_EXHAUSTED: 'SIGNATURE_CREDITS_EXHAUSTED',
  /** `isKycRequired` and the plan's identity checks are used up. */
  KYC_CREDITS_EXHAUSTED: 'KYC_CREDITS_EXHAUSTED',
  /** `documents.updateRights`: the document has reached its sharing limit. */
  DOCUMENT_SHARE_LIMIT_REACHED: 'DOCUMENT_SHARE_LIMIT_REACHED',
  /** The account's outbound mail budget for now is spent (e.g. access grants that mail people). */
  ACCOUNT_OUTBOUND_LIMIT_REACHED: 'ACCOUNT_OUTBOUND_LIMIT_REACHED',
  RATE_LIMITED: 'RATE_LIMITED',
  KYC_WAITS_FOR_A_UNIT: 'KYC_WAITS_FOR_A_UNIT',
  /**
   * 400 · a signer of a request with `isKycRequired` has not passed identity verification. On `contracts.send` /
   * `contracts.agreements.initiateSigning` with `isKycRequired` and `signingPolicy.business: 'delegated'` it is the
   * workspace Owner (who signs the business side at once): the Owner passes KYC in the app first.
   */
  KYC_NOT_VERIFIED: 'KYC_NOT_VERIFIED',
  // documents and conversion
  DOCUMENT_FILE_CONVERTS: 'DOCUMENT_FILE_CONVERTS',
  DOCUMENT_FILE_VIA_STORAGE: 'DOCUMENT_FILE_VIA_STORAGE',
  DOCUMENT_FILE_NOT_CONVERTED: 'DOCUMENT_FILE_NOT_CONVERTED',
  /** 422 · `documents.convert` / a next version from a file on a document that is already a text: edit it as text instead. */
  DOCUMENT_NOT_A_FILE: 'DOCUMENT_NOT_A_FILE',
  DOCUMENT_CONVERSION_PENDING: 'DOCUMENT_CONVERSION_PENDING',
  DOCUMENT_CONVERSION_FAILED: 'DOCUMENT_CONVERSION_FAILED',
  DOCUMENT_CONVERSION_LANDS_AS_DRAFT: 'DOCUMENT_CONVERSION_LANDS_AS_DRAFT',
  DOCUMENT_CONVERSION_TAKES_NO_META: 'DOCUMENT_CONVERSION_TAKES_NO_META',
  DOCUMENT_CONVERSION_KEEPS_ORIGINAL: 'DOCUMENT_CONVERSION_KEEPS_ORIGINAL',
  /** The document's next version is still converting: wait for it before writing another. */
  DOCUMENT_VERSION_CONVERTING: 'DOCUMENT_VERSION_CONVERTING',
  DOCUMENT_SOURCE_EXACTLY_ONE: 'DOCUMENT_SOURCE_EXACTLY_ONE',
  DOCUMENT_BASE_VERSION_REQUIRED: 'DOCUMENT_BASE_VERSION_REQUIRED',
  DOCUMENT_WRITING_BASE_MOVED: 'DOCUMENT_WRITING_BASE_MOVED',
  DOCUMENT_WRITING_CONTENT_REFUSED: 'DOCUMENT_WRITING_CONTENT_REFUSED',
  /** The version being written moved under this write; read again and redo the change. */
  DOCUMENT_WRITING_MOVED: 'DOCUMENT_WRITING_MOVED',
  /** 422 · the document is still being converted; its text is written once it lands. */
  DOCUMENT_WRITING_CONVERTING: 'DOCUMENT_WRITING_CONVERTING',
  /** The content holds no text to print. */
  DOCUMENT_WRITING_EMPTY: 'DOCUMENT_WRITING_EMPTY',
  /** The document is a file: it has no text to edit. Convert it first (`documents.convert`). */
  DOCUMENT_WRITING_NO_TEXT: 'DOCUMENT_WRITING_NO_TEXT',
  /** The document (or its file) is not one this key's person can write. */
  DOCUMENT_WRITING_NOT_FOUND: 'DOCUMENT_WRITING_NOT_FOUND',
  /** A chip of the text names a field the text does not define. */
  DOCUMENT_WRITING_CHIP_NAMES_NO_FIELD: 'DOCUMENT_WRITING_CHIP_NAMES_NO_FIELD',
  /** 400 · a contract's or an amendment's paper takes no notes, tags or metadata of its own. */
  DOCUMENT_WRITING_PAPER_TAKES_NO_DETAILS: 'DOCUMENT_WRITING_PAPER_TAKES_NO_DETAILS',
  /** The document is not found at this level (gone, in the trash, or not this workspace's). */
  DOCUMENT_LEVEL_NOT_FOUND: 'DOCUMENT_LEVEL_NOT_FOUND',
  /** The version named is not the document's. */
  DOCUMENT_VERSION_NOT_FOUND: 'DOCUMENT_VERSION_NOT_FOUND',
  /** The version is held by a request or a contract and is not published again. */
  DOCUMENT_VERSION_HELD: 'DOCUMENT_VERSION_HELD',
  /** An earlier attempt with this `idempotencyKey` is kept; it answers, nothing new is made. */
  DOCUMENT_ATTEMPT_KEPT: 'DOCUMENT_ATTEMPT_KEPT',
  /** 403 · the document takes no new version now (on signing, signed, in a contract). */
  DOCUMENT_EDIT_REFUSED: 'DOCUMENT_EDIT_REFUSED',
  DOCUMENT_EDIT_OPEN_IN_APP: 'DOCUMENT_EDIT_OPEN_IN_APP',
  /** `meta`, `hashtags` or the description break the document details' bounds (`DOCUMENT_DETAILS_*`). */
  DOCUMENT_DETAILS_FIELD_EXISTS: 'DOCUMENT_DETAILS_FIELD_EXISTS',
  DOCUMENT_DETAILS_FIELD_MISSING: 'DOCUMENT_DETAILS_FIELD_MISSING',
  DOCUMENT_DETAILS_FIELD_NAME_INVALID: 'DOCUMENT_DETAILS_FIELD_NAME_INVALID',
  DOCUMENT_DETAILS_FIELD_VALUE_MISSING: 'DOCUMENT_DETAILS_FIELD_VALUE_MISSING',
  DOCUMENT_DETAILS_FIELD_VALUE_TOO_LONG: 'DOCUMENT_DETAILS_FIELD_VALUE_TOO_LONG',
  DOCUMENT_DETAILS_NOTES_TOO_LONG: 'DOCUMENT_DETAILS_NOTES_TOO_LONG',
  DOCUMENT_DETAILS_TAG_TOO_LONG: 'DOCUMENT_DETAILS_TAG_TOO_LONG',
  DOCUMENT_DETAILS_TOO_MANY_FIELDS: 'DOCUMENT_DETAILS_TOO_MANY_FIELDS',
  DOCUMENT_DETAILS_TOO_MANY_TAGS: 'DOCUMENT_DETAILS_TOO_MANY_TAGS',
  /** The Storage file is not usable as a source (not finished, rejected by the scan). */
  FILE_NOT_USABLE: 'FILE_NOT_USABLE',
  // signing
  SIGNING_FIELDS_EMPTY: 'SIGNING_FIELDS_EMPTY',
  SETUP_FIELDS_STAND_IN_THE_TEXT: 'SETUP_FIELDS_STAND_IN_THE_TEXT',
  /**
   * 409 · what the app would block blocks the send; `blockers[]` says what. Also `contracts.send` /
   * `contracts.agreements.initiateSigning` on a text without the `business` and `contragent` signature chips.
   */
  SETUP_BLOCKED: 'SETUP_BLOCKED',
  /** The setup changed while it was being sent (`templates.sendForSigning`); read again and send. */
  SETUP_CHANGED: 'SETUP_CHANGED',
  SETUP_SEND_CHANGED: 'SETUP_SEND_CHANGED',
  /** The setup has nothing to send. */
  SETUP_NOTHING_TO_SEND: 'SETUP_NOTHING_TO_SEND',
  /** The set-up holds something a request does not take, or a way of sending not taken here. */
  SETUP_NOT_SENDABLE: 'SETUP_NOT_SENDABLE',
  /** This version was already sent for signing in Chaindoc. */
  SETUP_SENT_IN_CHAINDOC: 'SETUP_SENT_IN_CHAINDOC',
  /** `templates.sendForSigning`: the document may not be sent now, or is not here (the message says which). */
  DOCUMENT_SETUP_REFUSED: 'DOCUMENT_SETUP_REFUSED',
  SIGNATURE_ROLE_REQUIRED: 'SIGNATURE_ROLE_REQUIRED',
  /** 400 · a recipient names a role the text does not hold — on a contract: a role other than `business` / `contragent`. */
  SIGNATURE_ROLE_UNKNOWN: 'SIGNATURE_ROLE_UNKNOWN',
  SIGNATURE_ROLE_UNASSIGNED: 'SIGNATURE_ROLE_UNASSIGNED',
  SIGNATURE_ROLE_TWICE: 'SIGNATURE_ROLE_TWICE',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  /** 400 · `signatures.remind` (and other acts that need it) on a request that is not `pending`; `status` says what it is. */
  SIGNATURE_REQUEST_NOT_PENDING: 'SIGNATURE_REQUEST_NOT_PENDING',
  /** 400 · this signer has already signed (or refused); a second act is refused. */
  SIGNER_ALREADY_ACTED: 'SIGNER_ALREADY_ACTED',
  /** 400 · a signature is already recorded for this signer. */
  SIGNATURE_ALREADY_RECORDED: 'SIGNATURE_ALREADY_RECORDED',
  /** 400 · the signing request's deadline has passed (by the server's clock), whatever its status reads yet. */
  SIGNING_REQUEST_EXPIRED: 'SIGNING_REQUEST_EXPIRED',
  /** 400 · `contracts.cancelSigningRequest` on a request somebody signed — a `delegated` business signature made at `send` counts. */
  SIGNING_REQUEST_HAS_A_SIGNATURE: 'SIGNING_REQUEST_HAS_A_SIGNATURE',
  /**
   * 400 · an act that needs the contract's signing request pending (`contracts.cancelSigningRequest`, `resendSigningRequest`)
   * on one that is not any more: signed, declined, cancelled or expired. Read the contract for what it is.
   */
  SIGNING_REQUEST_NOT_PENDING: 'SIGNING_REQUEST_NOT_PENDING',
  /** `signatures.remind`: a signer is reminded at most once every 12 hours. */
  SIGNER_REMINDED_RECENTLY: 'SIGNER_REMINDED_RECENTLY',
  /** `signatures.remind`: nobody on the request is left to remind. */
  NO_SIGNER_TO_REMIND: 'NO_SIGNER_TO_REMIND',
  /** `signatures.editRequest`: the signer's membership of the workspace has ended. */
  SIGNER_MEMBERSHIP_ENDED: 'SIGNER_MEMBERSHIP_ENDED',
  /** `signatures.editRequest`: the signer's role does not act on this request. */
  SIGNER_ROLE_DOES_NOT_ACT: 'SIGNER_ROLE_DOES_NOT_ACT',
  /** 400 · `signatures.editRequest`: the signer row is held aside and cannot be reassigned now. */
  SIGNER_ROW_IS_QUARANTINED: 'SIGNER_ROW_IS_QUARANTINED',
  /** 400 · `signatures.editRequest`: the signer's step waits for its replacement. */
  SIGNER_STEP_AWAITS_REPLACEMENT: 'SIGNER_STEP_AWAITS_REPLACEMENT',
  /** The recipients' signing requirements do not fit the request's signing strategy. */
  SIGNING_REQUIREMENTS_INCOMPATIBLE_WITH_STRATEGY: 'SIGNING_REQUIREMENTS_INCOMPATIBLE_WITH_STRATEGY',
  /** A signing requirement names an address that is not a recipient. */
  SIGNER_REQUIREMENT_UNKNOWN_RECIPIENT: 'SIGNER_REQUIREMENT_UNKNOWN_RECIPIENT',
  /** Two `account` choices for one address. */
  RECIPIENT_ACCOUNT_NAMED_TWICE: 'RECIPIENT_ACCOUNT_NAMED_TWICE',
  /** An `account` choice for an address that is not a recipient. */
  RECIPIENT_ACCOUNT_UNKNOWN_RECIPIENT: 'RECIPIENT_ACCOUNT_UNKNOWN_RECIPIENT',
  /** A recipient has no e-mail to send the invitation to. */
  RECIPIENT_HAS_NO_EMAIL: 'RECIPIENT_HAS_NO_EMAIL',
  /** 400 · this version is already signed in another request. */
  VERSION_SIGNED_ELSEWHERE: 'VERSION_SIGNED_ELSEWHERE',
  /** A resend's new `deadline` is not later than the old one. */
  SIGNING_DEADLINE_NOT_LATER: 'SIGNING_DEADLINE_NOT_LATER',
  /** The deadline is moved only on an open request. */
  SIGNING_DEADLINE_REQUEST_NOT_OPEN: 'SIGNING_DEADLINE_REQUEST_NOT_OPEN',
  /** The request's deadline is the contract's and moves with it. */
  SIGNING_DEADLINE_HELD_BY_A_CONTRACT: 'SIGNING_DEADLINE_HELD_BY_A_CONTRACT',
  /** 422 · a signature would lose its place in the text after the change. */
  TEMPLATE_SIGNATURE_PLACE_LOST: 'TEMPLATE_SIGNATURE_PLACE_LOST',
  /** The signature is recorded and the document is still being finalized; read it again shortly. */
  FINALIZATION_PENDING: 'FINALIZATION_PENDING',
  /** 409 · the signer's account has no name, and a signature needs one. */
  NAME_REQUIRED_FOR_SIGNING: 'NAME_REQUIRED_FOR_SIGNING',
  CONTRAGENT_QES_REQUIRES_SIGNER_SESSION: 'CONTRAGENT_QES_REQUIRES_SIGNER_SESSION',
  /**
   * 400 · `contracts.send` / `agreements.initiateSigning`: a qualified signature (`qes`) was asked of a side of a contract whose
   * business side signs by delegation (`signingPolicy.business: 'delegated'`). A delegated contract carries no qualified
   * signature on either side. Ask for none, or let the business side sign in person.
   */
  QES_DELEGATED_AUTO_SIGN_REFUSED: 'QES_DELEGATED_AUTO_SIGN_REFUSED',
  /**
   * 400 · `contracts.send` / `agreements.initiateSigning`: the sides were asked to sign with different methods, one of them
   * `qes` (e.g. `signingLaneByParty: { business: 'internal', contragent: 'qes' }`). Such a contract cannot be completed yet,
   * so it is not sent and nothing is created. Ask both sides for the same method: `signingLane: 'qes'` or none.
   */
  SIGNING_LANES_MIXED_UNSUPPORTED: 'SIGNING_LANES_MIXED_UNSUPPORTED',
  // qualified signature, `signatures.qes.promise` — the server spells these keys in lower case
  /** 400 · the request is cancelled, declined, expired or completed: nothing is collected on it any more. */
  request_not_pending: 'request_not_pending',
  /** 400 · the request belongs to a contract whose business side signs by delegation, which takes no qualified signature. */
  delegated_auto_sign: 'delegated_auto_sign',
  /** 400 · the key has no signer row on this request. */
  not_a_signer: 'not_a_signer',
  /** 400 · this signer has already agreed or signed. */
  already_acted: 'already_acted',
  /** 400 · the request is already being signed with the platform's signature; the two methods do not mix on it. */
  lane_taken_by_internal: 'lane_taken_by_internal',
  /** 400 · the request belongs to a contract that was not sent with `signingLane: 'qes'`. */
  lane_not_qualified_on_contract: 'lane_not_qualified_on_contract',
  /** 400 · every signer has agreed and the document is fixed for signing: agreements are no longer taken. */
  promises_closed: 'promises_closed',
  /** 400 · this signer is asked for the platform's signature on a request that has one method for everyone. */
  above_requirement_unsupported: 'above_requirement_unsupported',
  ACCOUNT_OPTION_UNAVAILABLE: 'ACCOUNT_OPTION_UNAVAILABLE',
  // webhook endpoint — set on the API key's page in the app (Developers), not through an SDK call
  /**
   * 400 · the webhook address is not public: a loopback, private, link-local, unique-local or reserved address (or a
   * disguise of one, `localhost`, or a name that resolves to one). Chaindoc posts webhooks only to public addresses and
   * checks the address again on every delivery; a delivery to one that is not public is not sent. Redirects are not
   * followed either: a `3xx` answer is a failed delivery, so register the final address.
   */
  WEBHOOK_URL_NOT_PUBLIC: 'WEBHOOK_URL_NOT_PUBLIC',
  // embedded sessions (`embedded.createSession`)
  /** 400 · the request the session names is closed (signed, declined, cancelled, expired); `status` says which. No session, no OTP. */
  EMBEDDED_SIGNING_REQUEST_CLOSED: 'EMBEDDED_SIGNING_REQUEST_CLOSED',
  /**
   * 400 · `contractId` of a contract never sent for signing; `status` is the contract's. A contract whose signing request
   * ended answers `EMBEDDED_SIGNING_REQUEST_CLOSED`.
   */
  EMBEDDED_CONTRACT_NOT_SIGNABLE: 'EMBEDDED_CONTRACT_NOT_SIGNABLE',
  /**
   * 400 · a `contractSigningRequestId`, `signatureRequestId` or `documentId` named beside the contract is not one of its own
   * (its signing requests — its own or an amendment's — and their documents), or two of them name different requests. No
   * session, no OTP.
   */
  EMBEDDED_SESSION_REQUEST_MISMATCH: 'EMBEDDED_SESSION_REQUEST_MISMATCH',
  // contracts
  /** 403 (`cancel`, `delete`) / 400 (`send`) · the contract is not a draft. */
  CONTRACT_NOT_A_DRAFT: 'CONTRACT_NOT_A_DRAFT',
  /** The counterparty named is the contract's own business side. */
  CONTRACT_PROPOSAL_IS_ITS_BUSINESS_SIDE: 'CONTRACT_PROPOSAL_IS_ITS_BUSINESS_SIDE',
  /** `send`: a `delegated` business signer must be the sender. */
  CONTRACT_DELEGATED_SIGNER_IS_NOT_THE_SENDER: 'CONTRACT_DELEGATED_SIGNER_IS_NOT_THE_SENDER',
  /** 400 · `send`: the contract's document does not open for the sender. */
  CONTRACT_DOCUMENT_DOES_NOT_OPEN_FOR_THE_SENDER: 'CONTRACT_DOCUMENT_DOES_NOT_OPEN_FOR_THE_SENDER',
  /** `send`: the business side's own signers name more than one workspace member. */
  CONTRACT_OWN_SIGNERS_AND_ONE_MEMBER: 'CONTRACT_OWN_SIGNERS_AND_ONE_MEMBER',
  /** `send`: the business side needs a signer. */
  CONTRACT_BUSINESS_SIGNER_REQUIRED: 'CONTRACT_BUSINESS_SIGNER_REQUIRED',
  /** `send`: the business signer named is not a member of the workspace. */
  CONTRACT_BUSINESS_SIGNER_NOT_SEATED: 'CONTRACT_BUSINESS_SIGNER_NOT_SEATED',
  /** 400 · `send`: the contract's document still carries its last request. */
  CONTRACT_DOCUMENT_CARRIES_ITS_LAST_REQUEST: 'CONTRACT_DOCUMENT_CARRIES_ITS_LAST_REQUEST',
  /** 400 · `send`: the contract's document version is taken by another request. */
  CONTRACT_DOCUMENT_VERSION_TAKEN: 'CONTRACT_DOCUMENT_VERSION_TAKEN',
  /** 422 · an amendment changes no money: payment terms are changed by invoices and series, not by an amendment. */
  AMENDMENT_CARRIES_NO_MONEY: 'AMENDMENT_CARRIES_NO_MONEY',
  /** `contracts.createEmpty`: the counterparty's identity changed while the contract was being made; retry. */
  PARTNER_IDENTITY_CHANGED: 'PARTNER_IDENTITY_CHANGED',
  // templates
  TEMPLATE_RETIRED: 'TEMPLATE_RETIRED',
  TEMPLATE_FORMAT_RETIRED: 'TEMPLATE_FORMAT_RETIRED',
  TEMPLATE_FORMAT_NOT_SUPPORTED_BY_ROUTE: 'TEMPLATE_FORMAT_NOT_SUPPORTED_BY_ROUTE',
  TEMPLATE_REVISION_REQUIRED: 'TEMPLATE_REVISION_REQUIRED',
  TEMPLATE_WORKING_COPY_MOVED: 'TEMPLATE_WORKING_COPY_MOVED',
  TEMPLATE_PUBLICATION_MOVED: 'TEMPLATE_PUBLICATION_MOVED',
  TEMPLATE_NOT_PUBLISHED: 'TEMPLATE_NOT_PUBLISHED',
  TEMPLATE_NOT_ARCHIVED: 'TEMPLATE_NOT_ARCHIVED',
  TEMPLATE_ARCHIVED: 'TEMPLATE_ARCHIVED',
  TEMPLATE_NOTHING_TO_PUBLISH: 'TEMPLATE_NOTHING_TO_PUBLISH',
  TEMPLATE_PUBLISH_BLOCKED: 'TEMPLATE_PUBLISH_BLOCKED',
  TEMPLATE_CONTENT_REFUSED: 'TEMPLATE_CONTENT_REFUSED',
  TEMPLATE_CONTENT_NOT_A_TEMPLATE: 'TEMPLATE_CONTENT_NOT_A_TEMPLATE',
  TEMPLATE_PRINT_REFUSED: 'TEMPLATE_PRINT_REFUSED',
  TEMPLATE_SLOTS_REFUSED: 'TEMPLATE_SLOTS_REFUSED',
  TEMPLATE_SLOT_NOT_SUPPORTED: 'TEMPLATE_SLOT_NOT_SUPPORTED',
  TEMPLATE_VALUES_MISSING: 'TEMPLATE_VALUES_MISSING',
  TEMPLATE_VALUES_REFUSED: 'TEMPLATE_VALUES_REFUSED',
  TEMPLATE_HAS_NO_SIGNERS: 'TEMPLATE_HAS_NO_SIGNERS',
  /** The `idempotencyKey` already made something else; give a new key for a new attempt. */
  TEMPLATE_DOCUMENT_KEY_REUSED: 'TEMPLATE_DOCUMENT_KEY_REUSED',
  /** The content names a picture this workspace does not hold. */
  TEMPLATE_PICTURE_UNKNOWN: 'TEMPLATE_PICTURE_UNKNOWN',
  /** A picture of the content is gone. */
  TEMPLATE_PICTURE_NOT_FOUND: 'TEMPLATE_PICTURE_NOT_FOUND',
  // money
  INVOICE_MONEY_OR_CREDIT_NOTE: 'INVOICE_MONEY_OR_CREDIT_NOTE',
  /** 403 · an invoice is made or issued only once the business profile holds what an invoice prints. */
  BUSINESS_PROFILE_INCOMPLETE: 'BUSINESS_PROFILE_INCOMPLETE',
  /** The invoice is not a draft any more. */
  INVOICE_NOT_A_DRAFT: 'INVOICE_NOT_A_DRAFT',
  /** The invoice moved under this act; read it again. */
  INVOICE_STATE_MOVED: 'INVOICE_STATE_MOVED',
  /** A payment of this invoice is in progress. */
  INVOICE_PAYMENT_IN_PROGRESS: 'INVOICE_PAYMENT_IN_PROGRESS',
  /** A replacement of this invoice's payment is in progress. */
  INVOICE_PAYMENT_REPLACEMENT_IN_PROGRESS: 'INVOICE_PAYMENT_REPLACEMENT_IN_PROGRESS',
  /** 409 · `invoices.charge`: this invoice is never charged automatically; the payer pays it. */
  INVOICE_NEVER_CHARGED_AUTOMATICALLY: 'INVOICE_NEVER_CHARGED_AUTOMATICALLY',
  /** 409 · `invoices.charge`: a series invoice is charged only with the payer's consent. */
  SERIES_INVOICE_CHARGED_ONLY_BY_CONSENT: 'SERIES_INVOICE_CHARGED_ONLY_BY_CONSENT',
  /** A series invoice goes out on its own date. */
  SERIES_INVOICE_GOES_OUT_ON_ITS_DATE: 'SERIES_INVOICE_GOES_OUT_ON_ITS_DATE',
  /** A series invoice keeps its partner. */
  SERIES_INVOICE_KEEPS_ITS_PARTNER: 'SERIES_INVOICE_KEEPS_ITS_PARTNER',
  /** The series waits for the partner's approval. */
  SERIES_WAITS_FOR_APPROVAL: 'SERIES_WAITS_FOR_APPROVAL',
  /** `invoices.markPaid`: the contract does not allow a payment recorded by hand. */
  RECORD_NOT_ALLOWED_BY_CONTRACT: 'RECORD_NOT_ALLOWED_BY_CONTRACT',
  /** A repeating appendix starts when it is sent. */
  REPEATING_APPENDIX_STARTS_WHEN_SENT: 'REPEATING_APPENDIX_STARTS_WHEN_SENT',
  /** The first date of the repeat has passed. */
  REPEAT_FIRST_DATE_PASSED: 'REPEAT_FIRST_DATE_PASSED',
  /** An annex both sides sign: both have signed it. */
  ANNEX_SIGNED_BY_BOTH: 'ANNEX_SIGNED_BY_BOTH',
  /** An annex both sides sign: its signing is open. */
  ANNEX_SIGNING_OPEN: 'ANNEX_SIGNING_OPEN',
  /** An annex both sides sign: a signature is missing. */
  ANNEX_SIGNATURE_MISSING: 'ANNEX_SIGNATURE_MISSING',
  /** An annex both sides sign: the partner has no signer. */
  ANNEX_PARTNER_HAS_NO_SIGNER: 'ANNEX_PARTNER_HAS_NO_SIGNER',
  /** The invoice has no lines. */
  INVOICE_HAS_NO_LINES: 'INVOICE_HAS_NO_LINES',
  /** A line of the invoice does not read (amount, quantity, tax). */
  INVOICE_LINE_DOES_NOT_READ: 'INVOICE_LINE_DOES_NOT_READ',
  /** The invoice's discount does not read. */
  INVOICE_DISCOUNT_DOES_NOT_READ: 'INVOICE_DISCOUNT_DOES_NOT_READ',
  /** 409 · the invoice needs its issue prepared (a tax treatment) first. */
  INVOICE_ISSUE_PREPARATION_REQUIRED: 'INVOICE_ISSUE_PREPARATION_REQUIRED',
  /** The amount is not whole in the currency's smallest unit. */
  INVOICE_AMOUNT_NOT_WHOLE_IN_CURRENCY: 'INVOICE_AMOUNT_NOT_WHOLE_IN_CURRENCY',
  /** 400 · an invoice line names an item that is not there. */
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  /** 400 · an invoice line names a unit that is not there. */
  UNIT_NOT_FOUND: 'UNIT_NOT_FOUND',
  /** The unit takes whole quantities only. */
  UNIT_QUANTITY_NOT_WHOLE: 'UNIT_QUANTITY_NOT_WHOLE',
  SALE_DATE_INVALID: 'SALE_DATE_INVALID',
  SERVICE_PERIOD_HALF_SET: 'SERVICE_PERIOD_HALF_SET',
  SERVICE_PERIOD_INVALID: 'SERVICE_PERIOD_INVALID',
  SERVICE_PERIOD_REVERSED: 'SERVICE_PERIOD_REVERSED',
  EINVOICE_BUYER_REFERENCE_INVALID: 'EINVOICE_BUYER_REFERENCE_INVALID',
  /** `invoices.download` in a format it does not know / does not offer / has not ready yet. */
  EINVOICE_FORMAT_UNKNOWN: 'EINVOICE_FORMAT_UNKNOWN',
  EINVOICE_FORMAT_NOT_OFFERED: 'EINVOICE_FORMAT_NOT_OFFERED',
  EINVOICE_FORMAT_NOT_READY: 'EINVOICE_FORMAT_NOT_READY',
  /** `contragents.update`: the electronic invoicing address is half set or does not read. */
  EINVOICE_ENDPOINT_HALF_SET: 'EINVOICE_ENDPOINT_HALF_SET',
  EINVOICE_ENDPOINT_ID_INVALID: 'EINVOICE_ENDPOINT_ID_INVALID',
  EINVOICE_ENDPOINT_SCHEME_UNKNOWN: 'EINVOICE_ENDPOINT_SCHEME_UNKNOWN',
  /** A KSeF number does not read. */
  KSEF_NUMBER_INVALID: 'KSEF_NUMBER_INVALID',
  /** `invoices.charge`: the amount is above what is left to pay / not above zero / covered by a report. */
  PAY_AMOUNT_ABOVE_WHAT_IS_LEFT: 'PAY_AMOUNT_ABOVE_WHAT_IS_LEFT',
  PAY_AMOUNT_NOT_ABOVE_ZERO: 'PAY_AMOUNT_NOT_ABOVE_ZERO',
  PAY_COVERED_BY_A_REPORT: 'PAY_COVERED_BY_A_REPORT',
  /** An earlier payment attempt is not resolved yet; do not charge again, read the invoice later. */
  PAYMENT_ATTEMPT_UNRESOLVED: 'PAYMENT_ATTEMPT_UNRESOLVED',
  /** A change of the business's payment details is in progress. */
  PAYMENT_DETAILS_CHANGE_IN_PROGRESS: 'PAYMENT_DETAILS_CHANGE_IN_PROGRESS',
  /** A payment instruction's QR code is for EUR in the EU only. */
  PAYMENT_INSTRUCTION_QR_EU_EUR_ONLY: 'PAYMENT_INSTRUCTION_QR_EU_EUR_ONLY',
  /** A crypto payment instruction's address or network does not read. */
  PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_CHECKSUM: 'PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_CHECKSUM',
  PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_FORMAT: 'PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_FORMAT',
  PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_WRONG_NETWORK: 'PAYMENT_INSTRUCTION_CRYPTO_ADDRESS_WRONG_NETWORK',
  PAYMENT_INSTRUCTION_CRYPTO_ASSET_NOT_ON_NETWORK: 'PAYMENT_INSTRUCTION_CRYPTO_ASSET_NOT_ON_NETWORK',
  PAYMENT_INSTRUCTION_CRYPTO_NETWORK_UNKNOWN: 'PAYMENT_INSTRUCTION_CRYPTO_NETWORK_UNKNOWN',
  /** 400 · `taxTreatments.create`: the name is taken. */
  TAX_TREATMENT_NAME_TAKEN: 'TAX_TREATMENT_NAME_TAKEN',
  STRIPE_MANUAL_BY_DESIGN: 'STRIPE_MANUAL_BY_DESIGN',
  STRIPE_NOT_READY: 'STRIPE_NOT_READY',
  STRIPE_LEGACY_EXPRESS: 'STRIPE_LEGACY_EXPRESS',
  STRIPE_NOT_ALLOWED_BY_CASCADE: 'STRIPE_NOT_ALLOWED_BY_CASCADE',
  STRIPE_SETTING_REQUIRES_STRIPE: 'STRIPE_SETTING_REQUIRES_STRIPE',
  /** `contracts.setStripePayment(false)`: change the payment methods first / it would leave no way to pay. */
  STRIPE_OFF_CHANGE_THE_SET_FIRST: 'STRIPE_OFF_CHANGE_THE_SET_FIRST',
  STRIPE_OFF_LEAVES_NO_WAY_TO_PAY: 'STRIPE_OFF_LEAVES_NO_WAY_TO_PAY',
  /** 410 · the business's Stripe account is disconnected. */
  STRIPE_ACCOUNT_DISCONNECTED: 'STRIPE_ACCOUNT_DISCONNECTED',
  // PDF signature check (`signatures.validatePdf`)
  /** The PDF is password-protected / needs a password / the password is wrong. */
  PDF_PASSWORD_PROTECTED: 'PDF_PASSWORD_PROTECTED',
  PDF_PASSWORD_REQUIRED: 'PDF_PASSWORD_REQUIRED',
  PDF_PASSWORD_WRONG: 'PDF_PASSWORD_WRONG',
  /** 422 · an image in the PDF is too large to check. */
  PDF_IMAGE_TOO_LARGE: 'PDF_IMAGE_TOO_LARGE',
  /** The checker is busy or unavailable now; retry later. */
  PDF_CHECK_BUSY: 'PDF_CHECK_BUSY',
  PDF_CHECK_UNAVAILABLE: 'PDF_CHECK_UNAVAILABLE',
  /** The file is not a document the checker recognises (in the body's `code`). */
  UNRECOGNIZED_FORMAT: 'UNRECOGNIZED_FORMAT',
} as const;

export type KnownErrorKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS];

/** One thing `409 SETUP_BLOCKED` says stands in the way of a send. */
export interface SetupBlocker {
  /** What is wrong, e.g. `signature-field-missing`. */
  kind: string;
  section: string;
  subject?: string;
  name?: string;
  subjects?: string[];
  names?: string[];
  counts?: { left: number; total: number; needed: number };
}

/**
 * The body of a refusal (`err.response`). Beside `message` and `errorKey`, some keys carry facts:
 * - `status` — `EMBEDDED_SIGNING_REQUEST_CLOSED` (the request's), `EMBEDDED_CONTRACT_NOT_SIGNABLE` (the contract's),
 *   `SIGNATURE_REQUEST_NOT_PENDING`;
 * - `blockers` — `SETUP_BLOCKED`;
 * - `convert` — `DOCUMENT_FILE_CONVERTS` (the route that converts the file);
 * - `role`, `roles` — `SIGNATURE_ROLE_UNKNOWN` (the role asked for, and the roles the text holds);
 * - `state`, `effect`, `action` — `WORKSPACE_SUSPENDED`, `WORKSPACE_CLOSED`;
 * - `message` is the list of broken constraints for `VALIDATION_FAILED`.
 * Read it as `err.response as ChaindocRefusalBody`; every field is optional, as the server sends each with its key only.
 */
export interface ChaindocRefusalBody {
  message?: string | string[];
  errorKey?: string;
  /** Money refusals (Stripe cascade) name their reason here; `ChaindocError.errorKey` reads it too. */
  code?: string;
  statusCode?: number;
  error?: unknown;
  status?: string;
  blockers?: SetupBlocker[];
  convert?: string;
  role?: string;
  roles?: string[];
  state?: string;
  effect?: string;
  action?: string | null;
  [fact: string]: unknown;
}

/** A known key, or any other string the server sends. */
export type ChaindocErrorKey = KnownErrorKey | (string & Record<never, never>);

const KEY_SHAPE = /^[A-Z][A-Z0-9_]+$/;

function readErrorKey(response: unknown): string | undefined {
  if (response && typeof response === 'object') {
    const body = response as { errorKey?: unknown; code?: unknown };
    if (typeof body.errorKey === 'string' && body.errorKey.length > 0) return body.errorKey;
    // Money refusals (Stripe cascade, invoice cancel) name their reason in `code`.
    if (typeof body.code === 'string' && KEY_SHAPE.test(body.code)) return body.code;
  }
  return undefined;
}

export class ChaindocError extends Error {
  /** The server's machine-readable reason (`errorKey` of the answer body), when it sent one. */
  public readonly errorKey?: ChaindocErrorKey;

  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
    public isRetryable: boolean = false,
  ) {
    super(message);
    this.name = 'ChaindocError';
    this.errorKey = readErrorKey(response);
  }
}

/** Narrowing guard: `if (hasErrorKey(err, 'ACCOUNT_READ_ONLY')) …`. */
export function hasErrorKey<K extends ChaindocErrorKey>(
  error: unknown,
  key: K,
): error is ChaindocError & { errorKey: K } {
  return error instanceof ChaindocError && error.errorKey === key;
}

/** 403 `INTEGRATIONS_NOT_IN_PLAN`: every `/api/v1` call needs a Business plan or above. */
export class ChaindocPlanError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocPlanError';
  }
}

/** A money refusal: the Stripe cascade (`STRIPE_*`) or `INVOICE_MONEY_OR_CREDIT_NOTE`. Never retried blindly. */
export class ChaindocPaymentError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocPaymentError';
  }
}

/** 403 `ACCOUNT_READ_ONLY`: the account reads and downloads, but cannot create, change, sign or send. */
export class ChaindocReadOnlyError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocReadOnlyError';
  }
}

/**
 * A plan's limit is spent, refused before anything was spent or made: `STORAGE_LIMIT_REACHED`, `AI_LIMIT_REACHED`,
 * `AI_NOT_IN_PLAN`, `CONTRACTS_LIMIT_REACHED`, `OPEN_SIGN_REQUESTS_LIMIT_REACHED`, `SIGNATURE_CREDITS_EXHAUSTED`,
 * `KYC_CREDITS_EXHAUSTED`, `DOCUMENT_SHARE_LIMIT_REACHED`.
 */
export class ChaindocLimitError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocLimitError';
  }
}

/** A document is a file / a conversion is pending or failed / the file must come through Storage. */
export class ChaindocDocumentFileError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocDocumentFileError';
  }
}

/** `SIGNING_FIELDS_EMPTY`, `SETUP_FIELDS_STAND_IN_THE_TEXT`, `SETUP_BLOCKED`, `SIGNATURE_ROLE_*`. */
export class ChaindocSigningSetupError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocSigningSetupError';
  }
}

/** 409 `NOT_YOUR_TURN`: the signing order has not reached this signer. */
export class ChaindocNotYourTurnError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocNotYourTurnError';
  }
}

/** Any `TEMPLATE_*` refusal. */
export class ChaindocTemplateError extends ChaindocError {
  constructor(message: string, statusCode?: number, response?: unknown, isRetryable = false) {
    super(message, statusCode, response, isRetryable);
    this.name = 'ChaindocTemplateError';
  }
}

/** A conversion ended `failed`: thrown by `conversions.wait()` with the conversion's own failure code. */
export class ChaindocConversionFailedError extends ChaindocError {
  constructor(
    message: string,
    public readonly conversionId: string,
    public readonly failureCode: string | null,
  ) {
    super(message, undefined, { errorKey: ERROR_KEYS.DOCUMENT_CONVERSION_FAILED, conversionId, failure: { code: failureCode } });
    this.name = 'ChaindocConversionFailedError';
  }
}

/** `conversions.wait()` gave up before the conversion ended; it may still finish: poll again with the id. */
export class ChaindocConversionTimeoutError extends ChaindocError {
  constructor(
    message: string,
    public readonly conversionId: string,
  ) {
    super(message);
    this.name = 'ChaindocConversionTimeoutError';
  }
}

const DOCUMENT_FILE_KEYS = new Set<string>([
  ERROR_KEYS.DOCUMENT_FILE_CONVERTS,
  ERROR_KEYS.DOCUMENT_FILE_VIA_STORAGE,
  ERROR_KEYS.DOCUMENT_FILE_NOT_CONVERTED,
  ERROR_KEYS.DOCUMENT_CONVERSION_PENDING,
  ERROR_KEYS.DOCUMENT_CONVERSION_FAILED,
  ERROR_KEYS.DOCUMENT_CONVERSION_LANDS_AS_DRAFT,
  ERROR_KEYS.DOCUMENT_CONVERSION_TAKES_NO_META,
  ERROR_KEYS.DOCUMENT_CONVERSION_KEEPS_ORIGINAL,
]);
const SIGNING_SETUP_KEYS = new Set<string>([
  ERROR_KEYS.SIGNING_FIELDS_EMPTY,
  ERROR_KEYS.SETUP_FIELDS_STAND_IN_THE_TEXT,
  ERROR_KEYS.SETUP_BLOCKED,
  ERROR_KEYS.SIGNATURE_ROLE_REQUIRED,
  ERROR_KEYS.SIGNATURE_ROLE_UNKNOWN,
  ERROR_KEYS.SIGNATURE_ROLE_UNASSIGNED,
  ERROR_KEYS.SIGNATURE_ROLE_TWICE,
]);
const LIMIT_KEYS = new Set<string>([
  ERROR_KEYS.STORAGE_LIMIT_REACHED,
  ERROR_KEYS.AI_LIMIT_REACHED,
  ERROR_KEYS.AI_NOT_IN_PLAN,
  ERROR_KEYS.CONTRACTS_LIMIT_REACHED,
  ERROR_KEYS.OPEN_SIGN_REQUESTS_LIMIT_REACHED,
  ERROR_KEYS.SIGNATURE_CREDITS_EXHAUSTED,
  ERROR_KEYS.KYC_CREDITS_EXHAUSTED,
  ERROR_KEYS.DOCUMENT_SHARE_LIMIT_REACHED,
]);

/** Builds the most specific error class for an answer; the class is chosen by `errorKey` only. */
export function createChaindocError(
  message: string,
  statusCode: number | undefined,
  response: unknown,
  isRetryable: boolean,
): ChaindocError {
  const key = readErrorKey(response);
  if (key === ERROR_KEYS.INTEGRATIONS_NOT_IN_PLAN) return new ChaindocPlanError(message, statusCode, response, isRetryable);
  if (key === ERROR_KEYS.ACCOUNT_READ_ONLY) return new ChaindocReadOnlyError(message, statusCode, response, isRetryable);
  if (key === ERROR_KEYS.NOT_YOUR_TURN) return new ChaindocNotYourTurnError(message, statusCode, response, isRetryable);
  if (key && LIMIT_KEYS.has(key)) return new ChaindocLimitError(message, statusCode, response, isRetryable);
  if (key && DOCUMENT_FILE_KEYS.has(key)) return new ChaindocDocumentFileError(message, statusCode, response, isRetryable);
  if (key && SIGNING_SETUP_KEYS.has(key)) return new ChaindocSigningSetupError(message, statusCode, response, isRetryable);
  if (key && (key.startsWith('STRIPE_') || key === ERROR_KEYS.INVOICE_MONEY_OR_CREDIT_NOTE)) {
    return new ChaindocPaymentError(message, statusCode, response, isRetryable);
  }
  if (key?.startsWith('TEMPLATE_')) return new ChaindocTemplateError(message, statusCode, response, isRetryable);
  return new ChaindocError(message, statusCode, response, isRetryable);
}

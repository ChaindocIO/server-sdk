/**
 * Chaindoc Server SDK Types
 */

export * from './processes';
export * from './accounts';
export * from './templates';
export * from './finance';
import type { AccountChoice } from './accounts';

// ============================================================================
// Configuration
// ============================================================================

export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay between retries in milliseconds
   * @default 1000
   */
  baseDelayMs?: number;

  /**
   * Maximum delay between retries in milliseconds
   * @default 10000
   */
  maxDelayMs?: number;
}

/**
 * Available API environments
 */
export type ChaindocEnvironment = "production" | "staging" | "development";

export interface ChaindocConfig {
  /**
   * Secret API key (starts with sk_)
   * Required for write operations
   */
  secretKey: string;

  /**
   * API environment. Used to select the default base URL.
   * @default 'production'
   */
  environment?: ChaindocEnvironment;

  /**
   * Custom API base URL. Overrides the URL derived from `environment`.
   * Useful for development/staging with self-hosted backends.
   *
   * @example 'https://api-dev.example.com'
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Retry configuration for failed requests
   * Retries on 5xx errors and network failures
   */
  retry?: RetryConfig;
}

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  /**
   * Pagination for legacy document/signature endpoints.
   */
  pageNumber?: number;

  /**
   * Pagination for legacy document/signature endpoints.
   */
  pageSize?: number;

  /**
   * Pagination for contracts endpoints.
   */
  page?: number;

  /**
   * Pagination for contracts endpoints.
   */
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pageNumber: number;
  pageSize: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface MetaTag {
  key: string;
  value: string;
}

// ============================================================================
// Media Types
// ============================================================================

export type MediaType =
  | "document"
  | "image"
  | "video"
  | "text"
  | "call_to_action";

export interface Media {
  type: MediaType | undefined;
  name: string;
  key: string;
  url: string;
  hash?: string;
  size?: number;
  thumbnail?: string;
  bluredThumbnail?: string;
  compressed?: string;
}

export interface MediaUploadResponse {
  success: boolean;
  media: Media[];
  message: string;
}

// ============================================================================
// Chunked Upload Types (resumable, streams into the caller's Drive — model C)
// ============================================================================

export interface InitChunkedUploadParams {
  filename: string;
  mimeType: string;
  size: number;
}

export interface InitChunkedUploadResponse {
  uploadId: string;
  expiresAt: string;
  chunkSize: number;
  uploadUrl: string;
}

/** Server acknowledgement for a single chunk. `storageFileId` is set on completion. */
export interface ChunkAck {
  offset: number;
  complete: boolean;
  storageFileId?: string;
}

export interface ChunkedUploadStatus {
  uploadId: string;
  currentOffset: number;
  totalSize: number;
  expiresAt: string;
}

export interface ChunkedUploadResult {
  storageFileId: string;
}

export interface UploadChunkedOptions {
  /** Overrides the filename (Blobs carry no name on the server side). */
  filename?: string;
  /** Progress callback fired after each acknowledged chunk. */
  onProgress?: (progress: {
    percent: number;
    bytesUploaded: number;
    totalBytes: number;
  }) => void;
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentStatus =
  | "draft"
  | "published"
  | "archived"
  | "pending_signature"
  | "signed";
/**
 * Subset of DocumentStatus accepted by the public create/update endpoints.
 * Backend rejects `archived`, `pending_signature`, `signed` here because they
 * are derived states managed by the server (publishing, signature lifecycle).
 */
export type DocumentStatusForCreate = "draft" | "published";
/**
 * What a document IS.
 *
 * `"team"` is still here and is not deprecated as a value: documents shared to a team before that
 * audience was withdrawn still exist, and a response type that could not express the stored state
 * would be a new lie in place of a removed one. It is **historical and non-authorising** — a
 * document carrying it grants nothing to a team, and no new document can be given it.
 */
export type AccessType = "private" | "public" | "restricted" | "team";

/**
 * What a document may be ASKED to be. `"team"` is the workspace's own audience (an active member of the
 * key's workspace). A role audience can no longer be created.
 */
export type AccessTypeInput = "private" | "public" | "restricted" | "team";

export interface AccessEmail {
  email: string;
  /** Defaults to `read` on the server. */
  level?: "read" | "write";
  /**
   * Where this person is addressed: one of the options `accounts.lookup` returned. Without it the grant
   * goes to the person's personal account.
   */
  account?: AccountChoice;
}

/** A node of the engine's document tree. Its shape is the engine's; the SDK does not restrict it. */
export interface DocumentNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocumentNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  [key: string]: unknown;
}

/**
 * A text document: the engine's content, version 2. Signature places and fields are chips of the text;
 * `mode: 'template'` holds the field definitions (`doc.attrs.fields`) and the signer roles
 * (`doc.attrs.signers`) a signature request binds its recipients by.
 */
export interface DocumentContent {
  version: 2;
  mode: "document" | "template";
  doc: DocumentNode;
}

interface DocumentWriteBase {
  name: string;
  /** Optional - omit to leave the description unset (stored as null). */
  description?: string;
  /** Optional - omit for a document with no metadata. */
  meta?: MetaTag[];
  /** Optional - omit for a document with no hashtags. */
  hashtags?: string[];
  /** A document made from a file always lands as a draft: `published` with a file is refused. */
  status: DocumentStatusForCreate;
  /**
   * The attempt's own key. The same key again answers the same document or conversion and starts nothing;
   * left out, a retry makes a second one (and, for a file, pays for a second conversion).
   */
  idempotencyKey?: string;
}

/** Create a text document directly (201, the document is made). */
export interface CreateDocumentFromContentParams extends DocumentWriteBase {
  content: DocumentContent;
  accessType?: AccessTypeInput;
  accessEmails?: AccessEmail[];
}

/**
 * Create a document from a file already in Storage (`media.uploadChunked`). A file becomes a text document
 * by conversion: the answer is 202 with a conversion; the document is made as a DRAFT when it is ready.
 * The original stays in Storage. Takes no `meta`.
 */
export interface CreateDocumentFromStorageParams extends Omit<DocumentWriteBase, "meta" | "status"> {
  storageFileId: string;
  /** Must be `draft` (the default) - a document made from a file lands as a draft. */
  status?: "draft";
  accessType?: AccessTypeInput;
  accessEmails?: AccessEmail[];
}

export type CreateDocumentParams = CreateDocumentFromContentParams | CreateDocumentFromStorageParams;

/** Next version from text: `baseVersionId` is the version the text was read from (else 409 `DOCUMENT_WRITING_BASE_MOVED`). */
export interface UpdateDocumentWithContentParams extends DocumentWriteBase {
  content: DocumentContent;
  baseVersionId: string;
}

/** Next version from a READY Storage file, converted asynchronously (202). */
export interface UpdateDocumentWithFileParams extends Omit<DocumentWriteBase, "meta"> {
  storageFileId: string;
}

export type UpdateDocumentParams = UpdateDocumentWithContentParams | UpdateDocumentWithFileParams;

export interface UpdateDocumentRightsParams {
  accessType: AccessTypeInput;
  accessEmails?: AccessEmail[];
}

export interface DocumentTag {
  id: string;
  tag: string;
}

export interface DocumentVersion {
  id: string;
  name?: string;
  documentVersion: string;
  description?: string;
  media?: Media;
  meta?: MetaTag[];
  status: DocumentStatus;
  versionHash?: string;
  documentId: string;
  tags: DocumentTag[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  txtId: string;
  accessType: AccessType;
  versions?: DocumentVersion[];
  currentVersion?: DocumentVersion;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentResponse {
  success: boolean;
  documentId: string;
  document: Document;
  message: string;
}

// ─── Documents read-surface (get / getVersions / download) ──────────────────

/** Slim media summary returned by public document read endpoints (no presigned url) */
export interface PublicDocumentMediaSummary {
  name: string | null;
  hash: string | null;
  size: number | null;
}

/** Document version as returned by GET /documents/:id and GET /documents/:id/versions */
export interface PublicDocumentVersion {
  id: string;
  documentVersion: string;
  name?: string | null;
  description?: string | null;
  status: DocumentStatus;
  versionHash?: string | null;
  media: PublicDocumentMediaSummary | null;
  meta: MetaTag[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Document detail payload returned by GET /documents/:id */
export interface PublicDocumentDetail {
  id: string;
  txtId: string;
  accessType: AccessType;
  /**
   * `text` - a text document (can be edited and sent for signature); `file` - made as a file before
   * documents became text: readable and verifiable, but sent only after `documents.convert()`.
   */
  format: "text" | "file";
  /** Whether a signature request can be made on it now (`false` for a `file`). */
  sendable: boolean;
  currentVersion: PublicDocumentVersion | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetDocumentResponse {
  success: boolean;
  document: PublicDocumentDetail;
}

// ─── Conversion, text content and signature block ──────────────────────────

export type DocumentConversionStatus = "converting" | "ready" | "failed";

export interface DocumentConversion {
  id: string;
  status: DocumentConversionStatus;
  /** `new`: a new document is made when ready. `version`: the next version of `documentId`. */
  kind: "new" | "version";
  /** Present when `ready` (and always for `version`). */
  documentId: string | null;
  /** The made version, when `ready`. */
  versionId: string | null;
  /** `ready_for_review` or `needs_review`, when the converter reported one. */
  review?: string;
  progress?: number;
  /** Why it failed, when `failed`: the converter's code or `AI_LIMIT_REACHED`, `STORAGE_LIMIT_REACHED`, ... */
  failure?: { code: string } | null;
}

/** Answer of every file entrance (202) and of `conversions.get`. */
export interface DocumentConversionResponse {
  success: boolean;
  conversion: DocumentConversion;
}

/** A `ready` conversion: `documentId` and `versionId` are set. */
export interface ReadyDocumentConversion extends DocumentConversion {
  status: "ready";
  documentId: string;
  versionId: string;
}

export interface WaitForConversionOptions {
  /** Give up after this many milliseconds (default 10 minutes). */
  timeoutMs?: number;
  /** First poll delay in milliseconds (default 1000); it grows by `backoffFactor` up to `maxIntervalMs`. */
  intervalMs?: number;
  maxIntervalMs?: number;
  backoffFactor?: number;
  /** Called after every poll. */
  onPoll?: (conversion: DocumentConversion) => void;
}

export interface ConvertDocumentParams {
  idempotencyKey?: string;
}

export interface DocumentRole {
  id: string;
  /** What `recipients[].role` of a signature request names. */
  key: string;
  name: string;
}

export interface DocumentField {
  id: string;
  key: string;
  name: string;
  type: string;
  filledBy: string;
  required: boolean;
}

export interface GetDocumentContentParams {
  /** A version of the document; the current one when omitted. */
  versionId?: string;
}

export interface DocumentContentResponse {
  success: boolean;
  versionId: string;
  contentVersion: number;
  content: DocumentContent;
  roles: DocumentRole[];
  fields: DocumentField[];
}

export interface SignatureBlockRole {
  /** The role key: what `recipients[].role` names. */
  key: string;
  /** The name printed before the signature. */
  name: string;
}

export interface AddSignatureBlockParams {
  roles: SignatureBlockRole[];
  /** The version you read; another current version is 409 `DOCUMENT_WRITING_BASE_MOVED`. */
  baseVersionId?: string;
  idempotencyKey?: string;
}

export interface AddSignatureBlockResponse {
  success: boolean;
  documentId: string;
  /** The new version that holds the roles and their Signature / Date signed chips. */
  versionId: string;
  roles: string[];
}

/** Answer of a text update (`content`). */
export interface UpdateDocumentTextResponse {
  success: boolean;
  documentId: string;
  message: string;
}

export interface ListDocumentVersionsParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface GetDocumentVersionsResponse {
  success: boolean;
  versions: PublicDocumentVersion[];
  pagination: {
    pageNumber: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Documents analytics surface (listShared / search / activity / downloads) ─

/**
 * Lifecycle filter accepted by the document search/list endpoints. Distinct from
 * `DocumentStatusForCreate` — `published_not_signed` is a derived server state.
 */
export type DocumentSearchStatus = "draft" | "published" | "published_not_signed";

export interface DocumentSearchParams {
  pageNumber?: number;
  pageSize?: number;
  /** Free-text filter applied to document names. */
  search?: string;
  status?: DocumentSearchStatus;
}

/** Paginated document list returned by GET /documents/shared and /documents/search */
export interface DocumentListResponse {
  success: boolean;
  documents: PublicDocumentDetail[];
  totalPublished: number;
  totalDraft: number;
  pagination: {
    pageNumber: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** Lightweight public profile of an actor on an activity / download record */
export interface DocumentActorRef {
  username: string;
  email: string;
}

export interface DocumentActivityItem {
  /** Activity operation, e.g. "download", "preview", "verification_checked" */
  type: string;
  timestamp: string;
  document: {
    id: string;
    name: string;
    version: string;
  };
  user: DocumentActorRef | null;
}

export interface DocumentActivityResponse {
  success: boolean;
  activity: DocumentActivityItem[];
}

export interface DocumentDownloadItem {
  versionName: string;
  documentVersion: string;
  downloadedAt: string;
  user: DocumentActorRef;
}

export interface DocumentDownloadsResponse {
  success: boolean;
  downloads: DocumentDownloadItem[];
}

// ─── Documents comments + distribution (comments.add / list / sendPublicLink) ─

export interface CreateCommentParams {
  /** Comment body text. Posted as a top-level comment. */
  content: string;
}

export interface CommentListParams {
  pageNumber?: number;
  pageSize?: number;
}

/**
 * A document comment as returned by the public list endpoint. No numeric ids —
 * `CommentEntity` has no UUID, so replies are read-only (nested, not addressable).
 */
export interface PublicComment {
  content: string;
  createdAt: string;
  updatedAt: string;
  author: DocumentActorRef | null;
  replyCount: number;
  replies: PublicComment[];
}

export interface AddCommentResponse {
  success: boolean;
  comment: {
    content: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

export interface CommentListResponse {
  success: boolean;
  totalComments: number;
  comments: PublicComment[];
  pagination: {
    pageNumber: number;
    pageSize: number;
  };
}

export interface SendPublicLinkParams {
  /** Recipient email address. Normalized client-side before sending. */
  email: string;
  /** Optional message included in the share email. */
  text?: string;
}

export interface SendPublicLinkResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Verification Types
// ============================================================================

export interface VerifyDocumentParams {
  versionHash: string;
  certificateHash?: string;
}

export interface VerificationStatus {
  id: string;
  txHash: string;
  chainId: string;
  status: string;
  verifiedAt: string;
}

export interface VerifyDocumentResponse {
  success: boolean;
  verified: boolean;
  document?: {
    id: string;
    versionId: string;
    name: string;
    versionHash: string;
    status: string;
  };
  verification?: VerificationStatus;
  certificate?: {
    valid: boolean;
    hash: string;
  };
}

// ============================================================================
// Signature Types
// ============================================================================

export type SignRequestStatus =
  | "pending"
  | "completed"
  | "expired"
  | "cancelled";
export type VerificationTxStatus =
  | "initialized"
  | "pending"
  | "verified"
  | "failed";

export type DocumentSigningMethod = "embedded" | "delegated";
export interface Recipient {
  email: string;
  /**
   * The key of the role of the document's text this recipient signs as (`roles[].key` of
   * `documents.getContent`). Required when the text holds roles; every role stands for exactly one recipient.
   */
  role?: string;
  /** Where this person is addressed: an option from `accounts.lookup`. */
  account?: AccountChoice;
  signingMethod?: DocumentSigningMethod;
}

/**
 * Signature places are chips in the document's text; there is no coordinate input any more. A request that
 * carries `fields` is refused (422 `SETUP_FIELDS_STAND_IN_THE_TEXT`), so the SDK does not accept it.
 */
export interface CreateSignatureRequestParams {
  /** A version of a text document. A file version is refused (`DOCUMENT_FILE_CONVERTS`): convert it first. */
  versionId: string;
  message?: string;
  recipients: Recipient[];
  embeddedFlow?: boolean;
  isKycRequired?: boolean;
  deadline: Date;
  meta?: MetaTag[];
}

export interface ResendSignatureRequestParams {
  /** When omitted, the original signing window is re-applied from now. */
  deadline?: Date;
}

export interface CancelSignatureRequestResponse {
  success: boolean;
  requestId: string;
  status: string;
  message: string;
}

export interface RemindSignatureRequestParams {
  /**
   * Optional list of signer emails to remind. When omitted, reminders are
   * sent to every pending signer on the request. Emails are normalized
   * (lowercased + trimmed) before being sent.
   */
  signerEmails?: string[];
}

export interface RemindSignatureRequestResponse {
  success: boolean;
  requestId: string;
  /** Emails of signers who received a reminder in this call */
  remindedEmails: string[];
  /** Signers skipped (already signed, rate-limited, missing permissions, …) */
  skipped: { email: string; reason: string }[];
  message: string;
}

export interface SignDocumentParams {
  requestId: string;
  signatureId: number;
  messageText?: string;
  meta?: MetaTag[];
}

export interface SignerUser {
  username?: string;
  email?: string;
}

export interface Signer {
  id: string;
  email: string;
  signatureHash?: string;
  signedAt?: string;
  hasSigned: boolean;
  signer?: SignerUser;
}

export interface SignatureRequest {
  id: string;
  versionId?: string;
  status: SignRequestStatus;
  dueDate: string;
  isKycRequired: boolean;
  signers: Signer[];
}

export interface SignatureRequestStatus {
  success: boolean;
  requestId: string;
  status: SignRequestStatus;
  versionId?: string;
  totalSigners: number;
  signedCount: number;
  pendingCount: number;
  isCompleted: boolean;
  dueDate: string;
  signers: Signer[];
}

/** Answer of `signatures.resend`: a NEW request over a fresh version; the cancelled one stays as the record. */
export interface ResendSignatureRequestResponse {
  success: boolean;
  requestId: string;
  /** The request that was resent. */
  resentFrom: string;
  status: SignRequestStatus;
  versionId?: string;
  dueDate: string | null;
  signers: Signer[];
  message: string;
}

export interface SignatureRequestResponse {
  success: boolean;
  requestId: string;
  signatureRequest: SignatureRequest | null;
  message: string;
}

export interface GetMyRequestsResponse {
  items: SignatureRequest[];
  total: number;
  totalPending?: number;
  totalCompleted?: number;
  totalExpired?: number;
  pageNumber: number;
  pageSize: number;
}

/** Lifecycle bucket for filtering `signatures.getMyRequests`. */
export type SignatureRequestStatusFilter = 'all' | 'pending' | 'completed' | 'declined';

/** Parameters for `signatures.getMyRequests` — pagination plus an optional status filter. */
export interface GetMyRequestsParams {
  pageNumber?: number;
  pageSize?: number;
  /** Filter requests by lifecycle bucket. Defaults to `all`. */
  status?: SignatureRequestStatusFilter;
}

/** Parameters for `signatures.editRequest` — reassign a signer slot. */
export interface EditSignatureRequestParams {
  /** UUID of the signer slot to reassign (from a request summary's `signers[].id`). */
  signerId: string;
  /** New recipient email for that signer slot. */
  recipient: string;
  /** Where the new recipient is addressed: an option from `accounts.lookup`. */
  account?: AccountChoice;
}

/** Response from POST /api/v1/signatures/requests/:requestId/edit */
export interface EditSignatureRequestResponse {
  success: boolean;
  requestId: string;
  request: SignatureRequest | null;
  message: string;
}

export interface SavedSignature {
  hash: string;
  createdAt: string;
  updatedAt: string;
  imageMedia?: Media;
}

export interface GetSignaturesResponse {
  items: SavedSignature[];
  total: number;
  pageNumber: number;
  pageSize: number;
}

/** Parameters for creating a saved signature from an uploaded image. */
export interface CreateSignatureParams {
  /** Signature image media object, previously uploaded via `media.upload`. */
  media: Media & { type: 'image' };
}

/** Response from POST /api/v1/signatures */
export interface CreateSignatureResponse {
  success: boolean;
  signature: SavedSignature;
  message: string;
}

/** DSS validation report for the signatures embedded in an uploaded PDF. */
export interface ValidatePdfSignaturesResponse {
  success: boolean;
  valid: boolean;
  signatureCount: number;
  /** Full DSS validation report — structure depends on the document. */
  details: Record<string, unknown>;
}

/**
 * Parameters for signing a contract on the workspace's behalf, as the integration key.
 *
 * ⛔ Named `BusinessSign…` for wire compatibility; the ACT is the key's, not the key owner's
 * personal signature. See `contracts.businessSign`.
 */
export interface BusinessSignParams {
  /** Hash of a saved signature of the workspace (from `signatures.getSignatures`). */
  signatureHash: string;
  /** Optional metadata tags attached to the signature. */
  meta?: MetaTag[];
}

/** Response from the business-sign action. */
export interface BusinessSignResponse {
  success: boolean;
  contractId: string;
  signingRequestId: string;
  message: string;
}

// ============================================================================
// Embedded Session Types
// ============================================================================

export interface CreateEmbeddedSessionParams {
  email: string;
  metadata: {
    /** Document UUID — required for standalone signing, auto-resolved when contractId is provided */
    documentId?: string;
    /** Contract UUID — when provided, documentId and signatureRequestId are resolved automatically */
    contractId?: string;
    signatureRequestId?: string;
    returnUrl?: string;
    [key: string]: unknown;
  };
}

export interface EmbeddedSessionResponse {
  success: boolean;
  sessionId: string;
  email: string;
  status: string;
  expiresAt: string;
  expiresInMinutes: number;
  metadata: Record<string, unknown>;
  message: string;
  createdAt: string;
}

// ============================================================================
// API Key Types
// ============================================================================

export interface ApiKeyInfo {
  keyId: string;
  keyName: string;
  lastUsedAt: string;
  isActive: boolean;
  accessLevel: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  apiKeyValid: boolean;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook event types emitted by the Chaindoc API.
 *
 * The retired development-only approval route events were never published in this SDK.
 * Independent contract and signature events, including amendment signing, remain available.
 */
export type WebhookEventType =
  | "additional_agreement.signed"
  | "document.created"
  | "document.verified"
  | "document.signed"
  | "signature.request.created"
  | "signature.request.completed"
  | "signature.request.rejected"
  | "contract.created"
  | "contract.status_changed"
  | "contract.signed"
  | "contract.cancelled"
  | "contract.terminated"
  | "invoice.created"
  | "invoice.sent"
  | "invoice.paid"
  | "invoice.cancelled"
  | "transaction.created"
  | "transaction.updated"
  | "transaction.edited"
  | "transaction.removed";

/**
 * Canonical webhook envelope.
 * Every webhook delivery wraps its payload in this structure.
 */
export interface WebhookEnvelope<T = Record<string, unknown>> {
  /** Unique delivery ID (UUID). Reused on retries for idempotency. */
  id: string;
  /** Event type, e.g. "document.created" */
  type: WebhookEventType;
  /** ISO 8601 timestamp of the delivery */
  createdAt: string;
  /** Event-specific payload */
  data: T;
}

/**
 * The workspace an event is about, carried in the payload of every event whose object has one.
 *
 * An additional field: nothing that was in a payload before has changed, and no event that had no
 * workspace has gained a meaningless one. It exists because one integration key can now serve more
 * than one workspace, and without it two events about two different organizations are
 * indistinguishable.
 *
 * `uuid` is the same identifier the API uses everywhere else for a workspace; there is no numeric
 * form of it on this surface.
 */
export interface WebhookEventWorkspace {
  uuid: string | null;
}

/**
 * Result of verifying a webhook signature.
 */
export interface WebhookVerificationResult {
  valid: boolean;
  envelope?: WebhookEnvelope;
}

// ============================================================================
// Contracts
// ============================================================================

/** Contract status values */
export type ContractStatus =
  | 'draft'
  | 'pending_signature'
  | 'active'
  | 'pending_amendment'
  | 'suspended'
  | 'termination_pending'
  | 'terminated'
  | 'expired'
  | 'rejected';

/** Contract origin */
export type ContractOrigin = 'platform' | 'imported' | 'invoice_only';

/** Payment term type */
export type PaymentTermType = 'deposit' | 'recurring' | 'one_time';

/** Payment frequency */
export type PaymentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

/** Termination type */
export type TerminationType = 'one_side' | 'mutual_approval';

/** Payment term approval status */
export type PaymentTermApprovalStatus = 'approved' | 'pending_approval' | 'rejected';

/** Signer role */
export type SignerRole = 'business' | 'contragent';

/** Contract signing method */
export type ContractSigningMethod = 'embedded' | 'delegated';

/** Source of a completed contract signer action */
export type ContractSignerSource = 'embedded' | 'delegated_api';

/** Contract signing-request status */
export type ContractSigningRequestStatus = 'pending' | 'completed' | 'expired' | 'cancelled';

/** Contract signing-request purpose */
export type ContractSigningRequestPurpose = 'signature' | 'recurring_approval';

/** Contract signer status */
export type ContractSignerStatus = 'pending' | 'accepted' | 'rejected' | 'declined';

/** Billing address */
export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
}

/** Contragent info for contract creation */
export interface ContragentInfo {
  email: string;
  name?: string;
  /** Registered legal name, distinct from the display name. */
  legalName?: string;
  entityType?: 'person' | 'company';
  phone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  /** VAT number, distinct from the tax ID. */
  vatNumber?: string;
  registrationNumber?: string;
}

/** Payment term input for creating contracts */
export interface PaymentTermInput {
  type: PaymentTermType;
  name: string;
  description?: string;
  /** Decimal amount as string */
  amount: string;
  frequency?: PaymentFrequency;
  /** Day of period (1-28) */
  dayOfPeriod?: number;
  /** ISO 8601 date */
  startDate?: string;
  /** ISO 8601 date */
  endDate?: string;
  /** Total expected payments (for recurring) */
  totalPayments?: number;
  /** Due date (for one_time), ISO 8601 */
  dueDate?: string;
  /** Auto-charge when due (default: true) */
  autoCharge?: boolean;
}

/** Payment term input for recurring setup */
export interface RecurringPaymentTermInput
  extends Omit<PaymentTermInput, 'type' | 'frequency' | 'dayOfPeriod' | 'startDate' | 'dueDate'> {
  type: 'recurring';
  frequency: PaymentFrequency;
  /** Day of period (1-28) */
  dayOfPeriod: number;
  /** ISO 8601 date */
  startDate: string;
}

/** Payment term in response */
export interface PaymentTermResponse {
  id: string;
  type: PaymentTermType;
  name: string;
  description?: string;
  amount: string;
  currencyCode: string;
  frequency?: PaymentFrequency;
  dayOfPeriod?: number;
  startDate?: string;
  endDate?: string;
  totalPayments?: number;
  completedPayments: number;
  dueDate?: string;
  autoCharge: boolean;
  isActive: boolean;
  approvalStatus?: PaymentTermApprovalStatus;
}

/** Contract signer in response */
export interface ContractSigner {
  email: string;
  role: SignerRole;
  status: string;
  signed: boolean;
  signedAt?: string;
  signingSource?: ContractSignerSource;
}

/** Contract signing request in response */
export interface ContractSigningRequest {
  id: string;
  status: string;
  signers: ContractSigner[];
}

/** Contract document reference */
export interface ContractDocument {
  id: string;
  name: string;
}

/** Contract contragent reference */
export interface ContractContragent {
  email: string;
  name?: string | null;
}

/** Contract signing policy */
export interface ContractSigningPolicy {
  business: ContractSigningMethod;
  contragent: 'embedded';
}

/** Preferred payment methods allowed for contract invoice checkout */
export type ContractPreferredPaymentMethodType = 'card' | 'bank_transfer';

/** Contract data returned in responses */
export interface Contract {
  id: string;
  title: string;
  description?: string;
  status: ContractStatus;
  origin: ContractOrigin;
  document?: ContractDocument | null;
  contragent: ContractContragent;
  startDate?: string;
  endDate?: string;
  autoRenew: boolean;
  currencyCode: string;
  terminationType: TerminationType;
  noticePeriodDays: number;
  paymentMethodRequired: boolean;
  preferredPaymentMethodType?: ContractPreferredPaymentMethodType | null;
  /** The number the contract's own paper says (a signed contract added from outside). */
  number?: string;
  /** Days after the invoice date an invoice of this contract falls due (0 - on receipt). */
  paymentTermDays?: number;
  /** The contract-level Stripe setting of the cascade; `null` - inherits. */
  stripePaymentAllowed?: boolean | null;
  signingPolicy: ContractSigningPolicy;
  paymentTerms: PaymentTermResponse[];
  signingRequest?: ContractSigningRequest | null;
  createdAt: string;
  updatedAt: string;
}

// --- Request params ---

/** Parameters for creating a contract */
export interface CreateContractParams {
  /** UUID of existing published document */
  documentId: string;
  title: string;
  description?: string;
  contragent: ContragentInfo;
  /** The workspace option `accounts.lookup` offered for the counterparty's address, proposed to them. */
  contragentAccount?: AccountChoice;
  /** ISO 8601, min 24h from now */
  startDate?: string;
  /** ISO 8601 */
  endDate?: string;
  autoRenew?: boolean;
  /** ISO 4217 currency code (default: USD) */
  currencyCode?: string;
  terminationType?: TerminationType;
  /** Min: 14 days */
  noticePeriodDays?: number;
  paymentTerms?: PaymentTermInput[];
  paymentMethodRequired?: boolean;
  preferredPaymentMethodType?: ContractPreferredPaymentMethodType;
  /**
   * May invoices on this contract be paid by card via Stripe? Omit to inherit the business default; `false`
   * is a deliberately manual contract. `true` without a connected Stripe account is refused.
   */
  stripePaymentAllowed?: boolean;
  signingPolicy?: Partial<ContractSigningPolicy>;
}

/** Parameters for listing contracts */
export interface ContractListParams {
  page?: number;
  limit?: number;
  status?: ContractStatus;
  search?: string;
}

/** Parameters for adding payment setup */
export interface PaymentSetupParams {
  /** ISO 8601, min 24h from now */
  startDate: string;
  endDate?: string;
  currencyCode?: string;
  paymentMethodRequired?: boolean;
  preferredPaymentMethodType?: ContractPreferredPaymentMethodType;
  paymentTerms: PaymentTermInput[];
}

/** Parameters for sending a contract into signing */
export interface ContractSendParams {
  messageToSigners?: string;
  deadline?: Date;
  isKycRequired?: boolean;
}

/** Parameters for terminating a contract */
export interface TerminateContractParams {
  reason?: string;
}

// --- Response types ---

/** Response from POST /api/v1/contracts */
export interface ContractResponse {
  success: boolean;
  contractId?: string;
  contract: Contract;
  message?: string;
}

/** Response from GET /api/v1/contracts */
export interface ContractListResponse {
  success: boolean;
  contracts: Contract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
}

/** Response from GET /api/v1/contracts/:id/status */
export interface ContractStatusResponse {
  success: boolean;
  contractId: string;
  status: ContractStatus;
  signingPolicy: ContractSigningPolicy;
  signingStatus: {
    totalSigners: number;
    signedCount: number;
    pendingCount: number;
    signers: Array<{
      email: string;
      role: SignerRole;
      status: string;
      signed: boolean;
      signedAt?: string;
      signingSource?: ContractSignerSource;
    }>;
  };
  paymentSummary: {
    totalDeposit: string;
    totalRecurring: string;
    activeTerms: number;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
    startDate?: string;
    endDate?: string;
  };
}

/** Response from GET /api/v1/contracts/:id/activities */
export interface ContractActivitiesResponse {
  success: boolean;
  activities: Array<{
    action: string;
    description?: string;
    details?: Record<string, unknown>;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Response from POST /api/v1/contracts/:id/send */
export interface ContractSendResponse {
  success: boolean;
  contractId: string;
  status: string;
  signingRequestId: string;
  message: string;
}

/** Response from cancel/terminate actions */
export interface ContractActionResponse {
  success: boolean;
  contractId: string;
  status?: ContractStatus;
  terminationRequestId?: string;
  message: string;
}

/** Parameters for updating a draft contract */
export interface UpdateContractParams {
  title?: string;
  description?: string;
  contragent?: ContragentInfo;
  /** The workspace option `accounts.lookup` offered for the counterparty's address. */
  contragentAccount?: AccountChoice;
  /** ISO 8601, min 24h from now */
  startDate?: string;
  /** ISO 8601 */
  endDate?: string;
  autoRenew?: boolean;
  terminationType?: TerminationType;
  /** Min: 14 days */
  noticePeriodDays?: number;
  paymentMethodRequired?: boolean;
  /** Pass `null` to clear the previously set preference. */
  preferredPaymentMethodType?: ContractPreferredPaymentMethodType | null;
}

/** Parameters for creating an empty (invoice-only) contract */
export interface CreateEmptyContractParams {
  title: string;
  description?: string;
  /** Counterparty e-mail. Required unless `contragent.email` is given; if both are, they must match. */
  contragentEmail?: string;
  /** The counterparty's full billing identity; what it carries wins over the flat fields. */
  contragent?: ContragentInfo;
  /** The workspace option `accounts.lookup` offered for the counterparty's address. */
  contragentAccount?: AccountChoice;
  contragentName?: string;
  /** ISO 4217 currency code (default: USD) */
  currencyCode?: string;
}

/** Parameters for creating a minimal (3-step flow) contract */
export interface CreateMinimalContractParams {
  /** UUID of existing published document */
  documentId: string;
  title: string;
  description?: string;
  /** Counterparty e-mail. Required unless `contragent.email` is given; if both are, they must match. */
  contragentEmail?: string;
  /** The counterparty's full billing identity; what it carries wins over the flat fields. */
  contragent?: ContragentInfo;
  /** The workspace option `accounts.lookup` offered for the counterparty's address. */
  contragentAccount?: AccountChoice;
  contragentName?: string;
  /** Skip payment setup (add later via addPaymentSetup). Default: true. */
  skipPaymentSetup?: boolean;
}

/** Parameters for importing an externally signed contract */
export interface CreateImportContractParams {
  /** UUID of existing published document */
  documentId: string;
  title: string;
  description?: string;
  /** Counterparty e-mail. Required unless `contragent.email` is given; if both are, they must match. */
  contragentEmail?: string;
  /** The counterparty's full billing identity; what it carries wins over the flat fields. */
  contragent?: ContragentInfo;
  /** The workspace option `accounts.lookup` offered for the counterparty's address. */
  contragentAccount?: AccountChoice;
  contragentName?: string;
  /** ISO 4217 currency code (default: USD) */
  currencyCode?: string;
  /** ISO 8601 (can be in the past for imported contracts) */
  startDate?: string;
  /** ISO 8601 */
  endDate?: string;
}

/** Parameters for attaching a document to a draft contract */
export interface AttachDocumentParams {
  /** UUID of existing published document */
  documentId: string;
}

/** Aggregate contract payment statistics */
export interface ContractStats {
  contractValue: number | null;
  hasPaymentTerms: boolean;
  paidAmount: number;
  pendingAmount: number;
  remainingAmount: number | null;
  invoiceCount: number;
  isOverpaid: boolean;
  showPaymentStats: boolean;
}

/** Response from GET /api/v1/contracts/:id/stats */
export interface ContractStatsResponse {
  success: boolean;
  contractId: string;
  stats: ContractStats;
}

// --- Recurring and termination ---

/** Parameters for setting up recurring payments on an imported contract */
export interface RecurringSetupParams {
  /** Each term must be of type `recurring` with `frequency` + `dayOfPeriod`. */
  paymentTerms: RecurringPaymentTermInput[];
  /** Whether contragent must link a payment method (default: true). */
  paymentMethodRequired?: boolean;
  /** Message included in the approval invitation email. */
  messageToContragent?: string;
  /** Days before the approval request expires (1-90, default 30). */
  expiresInDays?: number;
}

export type TerminationRequestStatus = 'pending' | 'approved' | 'rejected' | 'executed';

export interface TerminationApproval {
  approved: boolean;
  approvedAt?: string;
}

export interface TerminationApprovals {
  business: TerminationApproval;
  contragent: TerminationApproval;
}

export interface TerminationRejection {
  reason: string;
  rejectedBy: {
    email: string;
    role: SignerRole;
  };
  rejectedAt: string;
}

/** Termination request as exposed by the public API (UUID-only references). */
export interface TerminationRequest {
  id: string;
  status: TerminationRequestStatus;
  contract: {
    id: string;
    title: string;
    terminationType: TerminationType;
    noticePeriodDays: number;
  };
  initiatedBy: {
    email: string;
    name: string | null;
    role: SignerRole;
  };
  reason: string;
  requestDate: string;
  effectiveDate: string;
  approvals?: TerminationApprovals;
  rejection?: TerminationRejection;
  outstandingAmount?: string;
  allInvoicesSettled: boolean;
  daysUntilEffective: number;
  canCancel: boolean;
  canApprove: boolean;
  canReject: boolean;
  createdAt: string;
}

export interface OutstandingInvoiceSummary {
  uuid: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
}

export interface TerminationStatus {
  hasActiveRequest: boolean;
  currentRequest?: {
    uuid: string;
    status: TerminationRequestStatus;
    effectiveDate: string;
    daysRemaining: number;
  };
  outstandingInvoices: {
    count: number;
    totalAmount: string;
    invoices: OutstandingInvoiceSummary[];
  };
  upcomingPayments: {
    count: number;
    totalAmount: string;
  };
  canInitiateTermination: boolean;
  terminationType: TerminationType;
  noticePeriodDays: number;
  earliestEffectiveDate: string;
}

export interface ApproveTerminationParams {
  /** Optional comment on the approval (max 500 chars). */
  comment?: string;
}

export interface RejectTerminationParams {
  /** Required rejection reason (max 1000 chars). */
  reason: string;
}

/** Response from GET /api/v1/contracts/:id/termination */
export interface TerminationRequestEnvelope {
  success: boolean;
  terminationRequest: TerminationRequest | null;
}

/** Response from GET /api/v1/contracts/:id/termination/status */
export interface TerminationStatusEnvelope {
  success: boolean;
  contractId: string;
  status: TerminationStatus;
}

/** Response from GET /api/v1/contracts/:id/termination/history */
export interface TerminationHistoryEnvelope {
  success: boolean;
  items: TerminationRequest[];
  total: number;
}

/** Response from POST /api/v1/contracts/:id/termination/approve */
export interface TerminationApproveEnvelope {
  success: boolean;
  terminationRequest: TerminationRequest;
  message: string;
}

// --- Payment term granular CRUD ---

/** Parameters for updating a single payment term. All fields optional. */
export interface UpdatePaymentTermParams {
  name?: string;
  /** Decimal amount as string */
  amount?: string;
  description?: string;
  frequency?: PaymentFrequency;
  /** Day of period (1-28) */
  dayOfPeriod?: number;
  /** ISO 8601 date */
  startDate?: string;
  /** ISO 8601 date */
  endDate?: string;
  /** Total expected payments (for recurring) */
  totalPayments?: number;
  /** Due date (for one_time), ISO 8601 */
  dueDate?: string;
  autoCharge?: boolean;
  isActive?: boolean;
}

/** Response from GET /api/v1/contracts/:id/payment-terms */
export interface PaymentTermListResponse {
  success: boolean;
  contractId: string;
  paymentTerms: PaymentTermResponse[];
}

/** Response from create/update payment term */
export interface PaymentTermEnvelope {
  success: boolean;
  contractId: string;
  paymentTerm: PaymentTermResponse;
  message: string;
}

/** Response from DELETE payment term */
export interface PaymentTermDeleteResponse {
  success: boolean;
  contractId: string;
  paymentTermId: string;
  message: string;
}

/** Response from signing-request resend / cancel actions */
export interface SigningRequestActionResponse {
  success: boolean;
  contractId: string;
  signingRequestId: string;
  message: string;
}

// --- Signing-request inspection (list / get) ---

/** A signing request as returned by the list endpoint (no per-signer detail). */
export interface SigningRequestSummary {
  id: string;
  status: ContractSigningRequestStatus;
  purpose: ContractSigningRequestPurpose;
  termsChanged: boolean;
  expiresAt: string;
  messageToSigners: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One signer on a signing request. */
export interface SigningRequestSigner {
  email: string;
  role: SignerRole;
  status: ContractSignerStatus;
  signed: boolean;
  signedAt: string | null;
  signingSource: ContractSignerSource;
}

/** A signing request with full signer detail, returned by the get endpoint. */
export interface SigningRequestDetail extends SigningRequestSummary {
  signers: SigningRequestSigner[];
}

export interface SigningRequestListResponse {
  success: boolean;
  contractId: string;
  signingRequests: SigningRequestSummary[];
}

export interface SigningRequestGetResponse {
  success: boolean;
  contractId: string;
  signingRequest: SigningRequestDetail;
}

// --- Additional agreements / amendments ---

/** Action applied by a payment-term modification carried in an amendment. */
export type PaymentTermModificationAction = 'add' | 'update' | 'deactivate';

/**
 * One payment-term modification in an amendment.
 * `paymentTermId` (a payment term UUID) is required for `update` / `deactivate`;
 * `add` instead supplies the new term fields (type/name/amount, etc.).
 */
export interface PaymentTermModificationInput {
  action: PaymentTermModificationAction;
  /** Payment term UUID — required for `update` and `deactivate`. */
  paymentTermId?: string;
  type?: PaymentTermType;
  name?: string;
  description?: string;
  /** Decimal amount as string */
  amount?: string;
  frequency?: PaymentFrequency;
  /** Day of period (1-28) */
  dayOfPeriod?: number;
  /** ISO 8601 date */
  startDate?: string;
  /** ISO 8601 date */
  endDate?: string;
  totalPayments?: number;
  /** ISO 8601 date */
  dueDate?: string;
  autoCharge?: boolean;
}

/** Parameters for creating an additional agreement (amendment). */
export interface CreateAgreementParams {
  /** UUID of an existing document backing the amendment. */
  documentId: string;
  title: string;
  description?: string;
  /** ISO 8601 date */
  effectiveDate?: string;
  modifiesPaymentTerms?: boolean;
  paymentTermModifications?: PaymentTermModificationInput[];
}

/** Parameters for sending an amendment into signing. */
export interface InitiateAgreementSigningParams {
  messageToSigners?: string;
  deadline?: Date;
  isKycRequired?: boolean;
  notifyContragent?: boolean;
}

/** Additional agreement (amendment) as returned by the public API. */
export interface AdditionalAgreement {
  id: string;
  document: { id: string } | null;
  title: string;
  description?: string;
  status: ContractStatus;
  effectiveDate?: string;
  modifiesPaymentTerms: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Response from create / get a single agreement. */
export interface AgreementEnvelope {
  success: boolean;
  contractId: string;
  agreement: AdditionalAgreement;
  message?: string;
}

/** Response from GET /api/v1/contracts/:id/agreements */
export interface AgreementListResponse {
  success: boolean;
  contractId: string;
  agreements: AdditionalAgreement[];
}

/** Response from POST .../agreements/:agreementId/initiate-signing */
export interface AgreementSigningResponse {
  success: boolean;
  contractId: string;
  agreementId: string;
  signingRequestId: string;
  status: string;
  message: string;
}

/** Response from DELETE an agreement. */
export interface AgreementDeleteResponse {
  success: boolean;
  contractId: string;
  agreementId: string;
  message: string;
}

/** Contract webhook event types */
export type ContractWebhookEventType = Extract<
  WebhookEventType,
  | 'contract.created'
  | 'contract.status_changed'
  | 'contract.signed'
  | 'contract.cancelled'
  | 'contract.terminated'
>;

// ============================================================================
// Invoices and Transactions
// ============================================================================

/** Contract invoice status */
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'unpaid'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

/** Contract invoice type */
export type InvoiceType = 'automatic' | 'manual';

/** Payment transaction status */
export type TransactionStatus =
  | 'INITIALISED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

/** Input line item for invoice creation */
export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: string;
}

/** Line item returned in invoice responses */
export interface InvoiceLineItem extends InvoiceLineItemInput {
  /** Derived line amount: unit price x quantity, less the line's own discount (its net). */
  amount: string;
  grossAmount?: string;
  /** Effective tax percentage applied to this line. */
  rate?: string;
  taxAmount?: string;
  treatmentCode?: string;
}

export interface InvoiceDiscount {
  type: 'fixed' | 'percent';
  /** Decimal string, at most 2 decimals: a money amount for `fixed`, a 0-100 percentage for `percent`. Applied before tax. */
  value: string;
}

export type InvoicePaymentMethod = 'bank-transfer' | 'cash' | 'other';

export interface InvoiceTaxRateGroup {
  key: string;
  code: string;
  label: string;
  rate: string;
  net: string;
  tax: string;
  gross: string;
}

export interface InvoiceTaxSummary {
  rateGroups: InvoiceTaxRateGroup[];
  /** Legal notes the document must print, e.g. the reverse-charge wording. */
  legalNotes: string[];
  totals: { net: string; tax: string; amount: string; discountTotal: string };
}

export interface InvoicePartyAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  countryName: string | null;
}

export interface InvoiceBuyer {
  name: string | null;
  email: string | null;
  entityType: 'person' | 'company' | null;
  taxId: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  address: InvoicePartyAddress | null;
}

export interface InvoiceSeller {
  legalName: string | null;
  email: string | null;
  taxId: string | null;
  vatNumber: string | null;
  website: string | null;
  address: InvoicePartyAddress | null;
}

/** Transaction summary embedded into invoice responses */
export interface InvoiceTransactionSummary {
  id: string;
  amount: string;
  currencyCode: string;
  status: TransactionStatus;
  failureReason?: string;
  receiptUrl?: string | null;
  source?: string | null;
  note?: string | null;
  /** Ledger row kind; always `payment` (a credit note writes no transaction). */
  kind?: 'payment' | 'credit_note';
  /** How a seller's record says the money came; absent on a payment made through Chaindoc. */
  method?: InvoicePaymentMethod;
  /** The day a seller's record says the money came (YYYY-MM-DD). */
  paidOn?: string;
  /** When the seller removed a payment they had recorded: it reads CANCELLED and stays listed. */
  removedAt?: string;
  paymentMethodType?: string;
  platformFee?: string;
  stripeFee?: string;
  netAmount?: string;
  createdAt: string;
}

/** Contract summary embedded into invoice responses */
export interface InvoiceContractSummary {
  id: string;
  title: string;
}

/** Invoice returned by the public API */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  contract: InvoiceContractSummary;
  title: string;
  description?: string;
  amount: string;
  paidAmount: string;
  remainingAmount: string;
  currencyCode: string;
  lineItems?: InvoiceLineItem[];
  issueDate: string;
  dueDate: string;
  paidAt?: string | null;
  /** The day the money came as a seller's record named it (YYYY-MM-DD). */
  paidOn?: string;
  isOverdue: boolean;
  daysOverdue?: number;
  checkoutUrl?: string | null;
  hasInvoicePdf: boolean;
  transactions?: InvoiceTransactionSummary[];
  fundingInstructions?: Record<string, unknown>;
  /** Credit-note face applied against this invoice ("0" when none); already deducted from `remainingAmount`. */
  creditedAmount: string;
  /** The partner's paid ahead this invoice took when sent; already deducted from `remainingAmount`. */
  paidAheadAmount: string;
  /** Whether it may be cancelled: no money and no credit note reached it (else `INVOICE_MONEY_OR_CREDIT_NOTE`). */
  canCancel: boolean;
  displayNumber?: string | null;
  /** This invoice's own payment-instruction selection, or null (the cascade resolves one at issue). */
  paymentInstructionId: string | null;
  showUnpaid: boolean;
  takePaidAhead: boolean;
  /** `INHERIT` lets the levels above decide card payment at send; `FORBID` keeps the invoice manual. */
  stripeAllowedIntent: 'INHERIT' | 'FORBID';
  /** Frozen when sent; `null` on a draft. */
  stripePaymentAllowed: boolean | null;
  /** `snapshot` - frozen at issue; `preview` - provisional, can still change. */
  partiesSource: 'snapshot' | 'preview';
  buyer?: InvoiceBuyer;
  seller?: InvoiceSeller;
  taxSummary?: InvoiceTaxSummary | null;
  /** Appendix to its contract; its number among the contract's appendices. */
  appendix?: boolean;
  appendixNumber?: number;
  poNumber?: string;
  servicePeriod?: string;
  createdAt: string;
}

/** Parameters for creating a contract invoice */
export interface CreateInvoiceParams {
  title: string;
  description?: string;
  amount: string;
  currencyCode?: string;
  dueDate: string;
  lineItems?: InvoiceLineItemInput[];
  /** An invoice-level discount, applied before tax. */
  discount?: InvoiceDiscount;
  /** An active payment instruction to print; omit and the cascade (contract, counterparty, default) resolves one. */
  paymentInstructionId?: string;
  /** One of the business's tax treatments (`taxTreatments.list`); omit for the counterparty's VAT setting, else the default. */
  taxTreatmentId?: string;
  /** Omit to inherit; `false` is a deliberately manual invoice. */
  stripePaymentAllowed?: boolean;
  /** Print what the partner still owes on other open invoices. Default true. */
  showUnpaid?: boolean;
  /** Take the partner's paid ahead when sent. Default true. */
  takePaidAhead?: boolean;
  autoCharge?: boolean;
  sendImmediately?: boolean;
}

/** Parameters for listing contract invoices */
export interface InvoiceListParams extends PaginationParams {
  status?: InvoiceStatus;
  type?: InvoiceType;
  overdue?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
}

/** Parameters for listing invoices across all contracts. */
export interface InvoiceListAllParams extends InvoiceListParams {
  /** Search by invoice number or contract title. */
  search?: string;
}

/** Parameters for sending an invoice */
export interface SendInvoiceParams {
  autoCharge?: boolean;
}

/** Parameters for updating a draft invoice. All fields optional. */
export interface UpdateInvoiceParams {
  title?: string;
  description?: string;
  /** ISO 8601 */
  dueDate?: string;
  /** When provided, replaces the existing line item set. */
  lineItems?: InvoiceLineItemInput[];
  /** `null` clears the invoice's own selection. */
  paymentInstructionId?: string | null;
  showUnpaid?: boolean;
  takePaidAhead?: boolean;
}

/** Parameters for manually marking an invoice as paid */
export interface MarkInvoicePaidParams {
  note?: string;
  /** When the money was received (ISO 8601); defaults to now. */
  paidAt?: string;
  /** How the money came, as the record names it. */
  method?: InvoicePaymentMethod;
}

/** Response envelope containing a single invoice */
export interface InvoiceResponse {
  success: boolean;
  contractId?: string;
  invoiceId?: string;
  invoice: Invoice;
  message?: string;
}

/** Response from GET /api/v1/contracts/:id/invoices */
export interface InvoiceListResponse {
  success: boolean;
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Response from invoice actions such as send or charge */
export interface InvoiceActionResponse {
  success: boolean;
  contractId: string;
  invoiceId: string;
  status: InvoiceStatus;
  transactionId?: string;
  message: string;
}

/** Invoice summary embedded into transaction responses */
export interface TransactionInvoiceSummary {
  id: string;
  invoiceNumber: string;
  displayNumber?: string | null;
  title: string;
}

/** Contract summary embedded into transaction responses */
export interface TransactionContractSummary {
  id: string;
  title: string;
}

/** Payment transaction returned by the public API */
export interface Transaction {
  id: string;
  invoice: TransactionInvoiceSummary;
  contract: TransactionContractSummary;
  amount: string;
  currencyCode: string;
  status: TransactionStatus;
  kind?: 'payment' | 'credit_note';
  method?: InvoicePaymentMethod;
  paidOn?: string;
  removedAt?: string;
  paymentMethodType?: string;
  platformFee?: string;
  stripeFee?: string;
  netAmount?: string;
  failureReason?: string;
  retryCount: number;
  stripePaymentIntentId?: string;
  receiptUrl?: string | null;
  createdAt: string;
}

/** Response containing a single transaction */
export interface TransactionResponse {
  success: boolean;
  transaction: Transaction;
}

/** Response from GET /api/v1/contracts/:id/transactions */
export interface TransactionListResponse {
  success: boolean;
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// --- Transaction analytics (payment-mix / fee-estimate) ---

export interface PaymentMixParams {
  /** Start of the date range (ISO 8601, e.g. "2025-01-01"). */
  from: string;
  /** End of the date range (ISO 8601). */
  to: string;
  /** Transaction status to aggregate. Defaults to SUCCESS server-side. */
  status?: TransactionStatus;
  /** Restrict the aggregation to a single contract. */
  contractUuid?: string;
  /** Restrict the aggregation to a single currency (ISO 4217). */
  currencyCode?: string;
}

/** One payment-method row of the payment-mix breakdown. */
export interface PaymentMixMethod {
  paymentMethodType: string;
  count: number;
  totalAmount: string;
  totalStripeFee: string;
  totalPlatformFee: string;
  avgStripeFeePercent: number;
}

export interface PaymentMixResponse {
  success: boolean;
  dateRange: { from: string; to: string };
  totalTransactions: number;
  byMethod: PaymentMixMethod[];
  /** Present only when there are card transactions in range. */
  estimatedSavingsIfAllBankTransfer?: string;
}

export interface FeeEstimateParams {
  /** Amount to estimate fees for. */
  amount: number;
  /** Currency code (ISO 4217). */
  currency: string;
  /** Override the default platform fee percentage. */
  platformFeePercent?: number;
}

/** One payment-method row of the fee-estimate comparison. */
export interface FeeEstimateMethod {
  paymentMethodType: string;
  stripeFeePercent: number;
  stripeFeeFixed: number;
  estimatedStripeFee: string;
  platformFeePercent: number;
  estimatedPlatformFee: string;
  estimatedTotalFee: string;
  totalFeePercent: number;
  isApproximate: boolean;
}

export interface FeeEstimateResponse {
  success: boolean;
  amount: number;
  currency: string;
  methods: FeeEstimateMethod[];
}

/**
 * Response from GET /api/v1/invoices: every invoice across all the API key
 * owner's contracts, plus aggregate status counts.
 */
export interface InvoiceListAllResponse extends InvoiceListResponse {
  statusCounts: Record<string, number>;
}

/** Invoice webhook event types */
export type InvoiceWebhookEventType = Extract<
  WebhookEventType,
  'invoice.created' | 'invoice.sent' | 'invoice.paid' | 'invoice.cancelled'
>;

/** Transaction webhook event types */
export type TransactionWebhookEventType = Extract<
  WebhookEventType,
  'transaction.created' | 'transaction.updated' | 'transaction.edited' | 'transaction.removed'
>;

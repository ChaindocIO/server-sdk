/**
 * Chaindoc Server SDK Types
 */

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
// Document Types
// ============================================================================

export type DocumentStatus =
  | "draft"
  | "published"
  | "archived"
  | "pending_signature"
  | "signed";
export type AccessType = "private" | "public" | "restricted" | "team";

export interface AccessEmail {
  email: string;
  level: "read" | "write";
}

export interface AccessRole {
  roleId: number;
  level: "read" | "write";
}

export interface CreateDocumentParams {
  name: string;
  description: string;
  media: Media;
  meta: MetaTag[];
  hashtags: string[];
  status: DocumentStatus;
  isForSigning?: boolean;
  accessType?: AccessType;
  accessEmails?: AccessEmail[];
  accessRoles?: AccessRole[];
}

export interface UpdateDocumentParams {
  name: string;
  description: string;
  media: Media;
  meta: MetaTag[];
  hashtags: string[];
  status: DocumentStatus;
  isForSigning?: boolean;
}

export interface UpdateDocumentRightsParams {
  accessType: AccessType;
  accessEmails?: AccessEmail[];
  accessRoles?: AccessRole[];
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
  isForSigning: boolean;
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
export type SignatureRequestFieldType =
  | "signature"
  | "initials"
  | "date_signed"
  | "text"
  | "checkbox";

export interface Recipient {
  email: string;
  signingMethod?: DocumentSigningMethod;
}

export interface SignatureRequestField {
  signerEmail: string;
  fieldType: SignatureRequestFieldType;
  pageIndex: number;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  required?: boolean;
  systemKey?: string;
  label?: string;
}

export interface CreateSignatureRequestParams {
  versionId: string;
  message?: string;
  recipients: Recipient[];
  embeddedFlow?: boolean;
  isKycRequired?: boolean;
  deadline: Date;
  meta?: MetaTag[];
  fields?: SignatureRequestField[];
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
 * Webhook event types emitted by the Chaindoc API
 */
export type WebhookEventType =
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
  | "transaction.updated";

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
  phone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
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
// Template Runtime
// ============================================================================

/** Variable bag used when rendering a published template */
export type TemplateVariables = Record<string, string | number | boolean>;

/** Per-slot signing mode for template document signing */
export type TemplateSlotSigningMethod = ContractSigningMethod;

/** Map template signer slots to recipient email addresses */
export interface TemplateSlotAssignment {
  signerKey: string;
  email: string;
  signingMethod?: TemplateSlotSigningMethod;
  signerVariables?: TemplateVariables;
}

/** Map template signer slots to contract roles */
export interface TemplateContractSlotAssignment {
  signerKey: string;
  role: SignerRole;
  signerVariables?: TemplateVariables;
}

/** Parameters for creating a draft document from a published template */
export interface CreateDocumentFromTemplateParams {
  documentName: string;
  documentDescription?: string;
  variables: TemplateVariables;
}

/** Parameters for rendering a template and immediately creating a signature request */
export interface CreateTemplateSignatureRequestParams
  extends CreateDocumentFromTemplateParams {
  slotAssignments: TemplateSlotAssignment[];
  message?: string;
  deadline: Date;
  isKycRequired?: boolean;
}

/** Parameters for rendering a template and creating a contract */
export interface CreateContractFromTemplateParams {
  variables: TemplateVariables;
  slotAssignments: TemplateContractSlotAssignment[];
  title: string;
  description?: string;
  contragent: ContragentInfo;
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

/** Slim current-version summary returned by template runtime endpoints */
export interface TemplateDocumentVersion {
  id: string;
  name: string;
  status: DocumentStatus;
  versionHash?: string | null;
}

/** Slim document payload returned by template runtime endpoints */
export interface TemplateDocument {
  id: string;
  txtId: string;
  accessType: AccessType;
  currentVersion: TemplateDocumentVersion | null;
  createdAt: string;
  updatedAt: string;
}

/** Response from POST /api/v1/templates/:id/documents */
export interface TemplateDocumentResponse {
  success: boolean;
  templateId: string;
  templateVersionNumber: number;
  documentId: string;
  document: TemplateDocument;
  message: string;
}

/** Response from POST /api/v1/templates/:id/signature-requests */
export interface TemplateSignatureRequestResponse {
  success: boolean;
  templateId: string;
  templateVersionNumber: number;
  documentId: string;
  document: TemplateDocument;
  requestId: string;
  signatureRequest: SignatureRequest | null;
  message: string;
}

/** Response from POST /api/v1/templates/:id/contracts */
export interface TemplateContractResponse {
  success: boolean;
  templateId: string;
  templateVersionNumber: number;
  contractId: string;
  signingRequestId?: string;
  contract: Contract;
  message: string;
}

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
  amount: string;
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
  isOverdue: boolean;
  daysOverdue?: number;
  checkoutUrl?: string | null;
  hasInvoicePdf: boolean;
  transactions?: InvoiceTransactionSummary[];
  fundingInstructions?: Record<string, unknown>;
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

/** Parameters for sending an invoice */
export interface SendInvoiceParams {
  autoCharge?: boolean;
}

/** Parameters for manually marking an invoice as paid */
export interface MarkInvoicePaidParams {
  note?: string;
  paidAt?: string;
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

/** Invoice webhook event types */
export type InvoiceWebhookEventType = Extract<
  WebhookEventType,
  'invoice.created' | 'invoice.sent' | 'invoice.paid' | 'invoice.cancelled'
>;

/** Transaction webhook event types */
export type TransactionWebhookEventType = Extract<
  WebhookEventType,
  'transaction.created' | 'transaction.updated'
>;

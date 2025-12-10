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
   * API environment
   * - production: https://api.chaindoc.io
   * - staging: https://api-demo.chaindoc.io
   * - development: https://api-demo.chaindoc.io
   * @default 'production'
   */
  environment?: ChaindocEnvironment;

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
  pageNumber?: number;
  pageSize?: number;
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
  id: number;
  tag: string;
}

export interface DocumentVersion {
  id: number;
  uuid: string;
  name?: string;
  documentVersion: string;
  description?: string;
  media?: Media;
  meta?: MetaTag[];
  isForSigning: boolean;
  status: DocumentStatus;
  versionHash?: string;
  documentId: number;
  tags: DocumentTag[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: number;
  uuid: string;
  txtId: string;
  userId: number;
  coreTeamId: number;
  currentVersionId?: number;
  accessType: AccessType;
  versions: DocumentVersion[];
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
  txHash: string;
  chainId: number;
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

export interface Recipient {
  email: string;
  shareToken?: string;
}

export interface CreateSignatureRequestParams {
  versionId: string;
  message?: string;
  recipients: Recipient[];
  embeddedFlow?: boolean;
  isKycRequired?: boolean;
  deadline: Date;
  meta?: MetaTag[];
}

export interface SignDocumentParams {
  requestId: string;
  signatureId: number;
  messageText?: string;
  meta?: MetaTag[];
}

export interface SignerUser {
  id?: number;
  username?: string;
  email?: string;
  imageMedia?: Media;
  backgroundColor?: string;
  textColor?: string;
  reputation?: number;
}

export interface Signer {
  id: number;
  requestId: number;
  signerId?: number;
  signerEmail: string;
  meta?: MetaTag[];
  messageText?: string;
  signatureHash?: string;
  signature?: string;
  hash?: string;
  signedAt?: string;
  remindedAt?: string;
  signer?: SignerUser;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignatureRequest {
  id: number;
  uuid: string;
  userId: number;
  versionId: number;
  status: SignRequestStatus;
  meta?: MetaTag[];
  messageText?: string;
  dueDate: string;
  isKycRequired: boolean;
  txHash?: string;
  embeddedFlow?: boolean;
  txStatus: VerificationTxStatus;
  certificate?: Media;
  certificateHash?: string;
  signers: Signer[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SignatureRequestStatus {
  success: boolean;
  requestId: number;
  status: SignRequestStatus;
  versionId: number;
  totalSigners: number;
  signedCount: number;
  pendingCount: number;
  isCompleted: boolean;
  dueDate: string;
  signers: Signer[];
}

export interface SignatureRequestResponse {
  signatureRequest: SignatureRequest;
  recipients: Signer[];
}

export interface GetMyRequestsResponse {
  items: SignatureRequest[];
  total: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetSignaturesResponse {
  items: SignatureRequest[];
  total: number;
  totalPending: number;
  totalCompleted: number;
  totalExpired: number;
  pageNumber: number;
  pageSize: number;
}

// ============================================================================
// Embedded Session Types
// ============================================================================

export interface CreateEmbeddedSessionParams {
  email: string;
  metadata: {
    documentId: string;
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
// KYC Types
// ============================================================================

export interface ShareKycParams {
  email: string;
  shareToken?: string;
}

export interface KycData {
  verified: boolean;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dob?: string;
  country?: string;
  nationality?: string;
  reviewStatus?: string;
  applicantId?: string;
}

export interface ShareKycResponse {
  success: boolean;
  message: string;
  shareToken?: string;
  email: string;
  sharedAt: string;
  kycData?: KycData;
  error?: string;
}

// ============================================================================
// API Key Types
// ============================================================================

export interface ApiKeyInfo {
  keyId: number;
  keyName: string;
  userId: number;
  lastUsedAt: string;
  isActive: boolean;
  accessLevel: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  apiKeyValid: boolean;
  userId: number;
}

import type {
  AccessType,
  Contract,
  ContractSigningPolicy,
  ContragentInfo,
  DocumentContent,
  DocumentStatus,
  PaymentTermInput,
  SignatureRequest,
  SignerRole,
  TerminationType,
} from './index';
import type { AccountChoice } from './accounts';

// ============================================================================
// Template Runtime (documents, signature requests and contracts from a published template)
// ============================================================================

/** Variable values by field key: a yes/no field `true`/`false`, a number as a number, a date `YYYY-MM-DD`. */
export type TemplateVariables = Record<string, string | number | boolean>;

/**
 * Fill one signer slot of the template, by e-mail and (optionally) the `account` option `accounts.lookup`
 * returned for it. A signer fills their own fields as they sign: `delegated` and `signerVariables` are
 * refused (`TEMPLATE_SLOT_NOT_SUPPORTED`), so the SDK does not offer them.
 */
export interface TemplateSlotAssignment {
  /** The slot key from the template (`signerSlots[].signerKey`). */
  signerKey: string;
  email: string;
  account?: AccountChoice;
  signingMethod?: 'embedded';
}

/** Map the template's two signer slots to the contract roles: one `business`, the other `contragent`. */
export interface TemplateContractSlotAssignment {
  signerKey: string;
  role: SignerRole;
}

/** Parameters for making a draft document from a published template. */
export interface CreateDocumentFromTemplateParams {
  documentName: string;
  documentDescription?: string;
  /** A required field left empty stays on the draft's pages as its field; a value its field cannot hold is `TEMPLATE_VALUES_REFUSED`. */
  variables: TemplateVariables;
}

/**
 * Parameters for printing a template and sending it for signature at once. Every signer slot is filled
 * once (`TEMPLATE_SLOTS_REFUSED` otherwise); a required value left empty is `TEMPLATE_VALUES_MISSING`.
 */
export interface CreateTemplateSignatureRequestParams extends CreateDocumentFromTemplateParams {
  slotAssignments: TemplateSlotAssignment[];
  message?: string;
  deadline: Date;
  isKycRequired?: boolean;
}

/**
 * Parameters for printing a template as the paper of a new contract and starting its signing at once.
 * The template must hold exactly two signer slots (one `business`, one `contragent`).
 */
export interface CreateContractFromTemplateParams {
  variables: TemplateVariables;
  slotAssignments: TemplateContractSlotAssignment[];
  title: string;
  description?: string;
  contragent: ContragentInfo;
  /** The workspace option `accounts.lookup` offered for the counterparty's address, proposed to them. */
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

/** Response from POST /api/v1/templates/:id/documents (always a draft) */
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
// Templates (read and write surface)
// ============================================================================

export type TemplateStatus = 'draft' | 'published' | 'archived';

export type TemplateVariableDataType = 'text' | 'long_text' | 'date' | 'number' | 'boolean';

export type TemplateVariableScope = 'document' | 'signer';

export interface TemplateVariable {
  key: string;
  label: string;
  dataType: TemplateVariableDataType;
  scope: TemplateVariableScope;
  /** Required when scope === 'signer' */
  signerKey?: string;
  /** Canonical system key for profile-based autofill (e.g. 'full_name', 'email') */
  systemKey?: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
}

export type TemplateFieldType = 'signature' | 'initials' | 'date_signed' | 'text' | 'checkbox';

export interface TemplatePlacedField {
  fieldType: TemplateFieldType;
  pageIndex: number;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  required: boolean;
  systemKey?: string;
  label?: string;
}

export interface TemplateSignerSlot {
  signerKey: string;
  signerLabel: string;
  fields: TemplatePlacedField[];
}

export interface TemplateSignatureRequirement {
  signerKey: string;
  signerLabel: string;
  fieldType: TemplateFieldType;
  required: boolean;
  label?: string;
}

export interface TemplateRenderConfig {
  format?: string;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

export interface ListTemplatesParams {
  page?: number;
  limit?: number;
  status?: TemplateStatus;
  search?: string;
}

/** Slim version reference returned inside template list/summary payloads */
export interface TemplateVersionRef {
  versionNumber: number;
}

/** Full template version payload returned by the detail and versions endpoints (read off the content) */
export interface TemplateVersionDetail {
  versionNumber: number;
  variablesSchema: TemplateVariable[];
  signerSlots: TemplateSignerSlot[];
  signatureRequirements: TemplateSignatureRequirement[];
  renderConfig?: TemplateRenderConfig;
  changelog?: string;
  createdAt: string;
  updatedAt: string;
}

/** Template list item (currentVersion / lastPublishedVersion are slim refs) */
export interface TemplateSummary {
  id: string;
  name?: string;
  description?: string;
  status: TemplateStatus;
  category: string;
  currentVersion: TemplateVersionRef | null;
  lastPublishedVersion: TemplateVersionRef | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The template's working copy: the content being edited, not yet published. Present only to a key that may
 * edit the template; `null` to one that only uses it.
 */
export interface TemplateWorkingCopy {
  /** The engine's template content `{ version, mode: 'template', doc }`. */
  content: DocumentContent;
  /** The revision a content update names. */
  revision: number;
  /** Since when changes wait to be published; `null` - nothing waits. */
  changesWaitSince: string | null;
}

/** Template detail payload (currentVersion / lastPublishedVersion carry full schema) */
export interface TemplateDetail {
  id: string;
  name?: string;
  description?: string;
  status: TemplateStatus;
  category: string;
  currentVersion: TemplateVersionDetail | null;
  lastPublishedVersion: TemplateVersionDetail | null;
  workingCopy?: TemplateWorkingCopy | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResponse {
  success: boolean;
  templates: TemplateSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TemplateGetResponse {
  success: boolean;
  template: TemplateDetail;
}

export interface TemplateVersionsResponse {
  success: boolean;
  versions: TemplateVersionDetail[];
}

export type TemplateCategory =
  | 'contract'
  | 'agreement'
  | 'invoice'
  | 'nda'
  | 'proposal'
  | 'letter'
  | 'other';

/** Template variable as supplied when creating/updating a template. */
export interface TemplateVariableInput {
  key: string;
  label: string;
  dataType: TemplateVariableDataType;
  /** Defaults to 'document'. */
  scope?: TemplateVariableScope;
  /** Required when scope === 'signer'. */
  signerKey?: string;
  systemKey?: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
}

/**
 * Parameters for creating a template: a DRAFT held in its working copy until it is published. The old
 * `contentJson` (Tiptap) format is gone (`TEMPLATE_FORMAT_RETIRED`); give `content`.
 */
export interface CreateTemplateParams {
  name: string;
  description?: string;
  category: TemplateCategory;
  /** The engine's template content: `{ version: 2, mode: 'template', doc }`. Unreadable content is 422 `TEMPLATE_CONTENT_REFUSED`. */
  content: DocumentContent;
  /** Optional hints; variables and signer slots are read off the content. */
  variablesSchema?: TemplateVariableInput[];
  signatureRequirements?: TemplateSignatureRequirement[];
  signerSlots?: TemplateSignerSlot[];
  renderConfig?: TemplateRenderConfig;
  meta?: string[];
}

/**
 * Parameters for updating a non-archived template; only provided fields apply. Name, description and category
 * save at once. `content` goes into the working copy and MUST name the `revision` it was read at: without
 * one the API answers 422 `TEMPLATE_REVISION_REQUIRED`; a moved working copy is 409 `TEMPLATE_WORKING_COPY_MOVED`.
 */
export interface UpdateTemplateParams {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  content?: DocumentContent;
  /** The working copy's revision the content was read at (`template.workingCopy.revision`). */
  revision?: number;
  /** Permit persisting an empty document (an intentional revert). */
  allowEmpty?: boolean;
  variablesSchema?: TemplateVariableInput[];
  signatureRequirements?: TemplateSignatureRequirement[];
  signerSlots?: TemplateSignerSlot[];
  renderConfig?: TemplateRenderConfig;
}

/** Parameters for publishing the working copy as the template's next version. */
export interface PublishTemplateParams {
  /** What changed, up to 1 000 characters. */
  changelog?: string;
  /** The working-copy revision you saw; a moved copy is 409 `TEMPLATE_WORKING_COPY_MOVED`. */
  revision?: number;
}

/** Response from create / update / publish / archive / restore. */
export interface TemplateEnvelope {
  success: boolean;
  template: TemplateDetail;
  message: string;
}

/** Response from DELETE a template: it is gone for good (every later call answers 404). */
export interface TemplateDeleteResponse {
  success: boolean;
  templateId: string;
  message: string;
}

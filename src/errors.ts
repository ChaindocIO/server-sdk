/**
 * Typed errors.
 *
 * Every refusal the API gives carries `{ message, errorKey }`. `ChaindocError.errorKey` reads it, and the
 * client builds the specific subclass below for the families an integrator branches on. All of them are
 * `instanceof ChaindocError`, so existing `catch` blocks keep working.
 */

/** The keys the SDK knows by name. The server may add others: `errorKey` is a `string` for those. */
export const ERROR_KEYS = {
  // plan, account, limits
  INTEGRATIONS_NOT_IN_PLAN: 'INTEGRATIONS_NOT_IN_PLAN',
  ACCOUNT_READ_ONLY: 'ACCOUNT_READ_ONLY',
  STORAGE_LIMIT_REACHED: 'STORAGE_LIMIT_REACHED',
  AI_LIMIT_REACHED: 'AI_LIMIT_REACHED',
  AI_NOT_IN_PLAN: 'AI_NOT_IN_PLAN',
  RATE_LIMITED: 'RATE_LIMITED',
  KYC_WAITS_FOR_A_UNIT: 'KYC_WAITS_FOR_A_UNIT',
  // documents and conversion
  DOCUMENT_FILE_CONVERTS: 'DOCUMENT_FILE_CONVERTS',
  DOCUMENT_FILE_VIA_STORAGE: 'DOCUMENT_FILE_VIA_STORAGE',
  DOCUMENT_FILE_NOT_CONVERTED: 'DOCUMENT_FILE_NOT_CONVERTED',
  DOCUMENT_CONVERSION_PENDING: 'DOCUMENT_CONVERSION_PENDING',
  DOCUMENT_CONVERSION_FAILED: 'DOCUMENT_CONVERSION_FAILED',
  DOCUMENT_CONVERSION_LANDS_AS_DRAFT: 'DOCUMENT_CONVERSION_LANDS_AS_DRAFT',
  DOCUMENT_CONVERSION_TAKES_NO_META: 'DOCUMENT_CONVERSION_TAKES_NO_META',
  DOCUMENT_CONVERSION_KEEPS_ORIGINAL: 'DOCUMENT_CONVERSION_KEEPS_ORIGINAL',
  DOCUMENT_SOURCE_EXACTLY_ONE: 'DOCUMENT_SOURCE_EXACTLY_ONE',
  DOCUMENT_BASE_VERSION_REQUIRED: 'DOCUMENT_BASE_VERSION_REQUIRED',
  DOCUMENT_WRITING_BASE_MOVED: 'DOCUMENT_WRITING_BASE_MOVED',
  DOCUMENT_WRITING_CONTENT_REFUSED: 'DOCUMENT_WRITING_CONTENT_REFUSED',
  DOCUMENT_EDIT_OPEN_IN_APP: 'DOCUMENT_EDIT_OPEN_IN_APP',
  // signing
  SIGNING_FIELDS_EMPTY: 'SIGNING_FIELDS_EMPTY',
  SETUP_FIELDS_STAND_IN_THE_TEXT: 'SETUP_FIELDS_STAND_IN_THE_TEXT',
  SETUP_BLOCKED: 'SETUP_BLOCKED',
  SIGNATURE_ROLE_REQUIRED: 'SIGNATURE_ROLE_REQUIRED',
  SIGNATURE_ROLE_UNKNOWN: 'SIGNATURE_ROLE_UNKNOWN',
  SIGNATURE_ROLE_UNASSIGNED: 'SIGNATURE_ROLE_UNASSIGNED',
  SIGNATURE_ROLE_TWICE: 'SIGNATURE_ROLE_TWICE',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  CONTRAGENT_QES_REQUIRES_SIGNER_SESSION: 'CONTRAGENT_QES_REQUIRES_SIGNER_SESSION',
  ACCOUNT_OPTION_UNAVAILABLE: 'ACCOUNT_OPTION_UNAVAILABLE',
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
  // money
  INVOICE_MONEY_OR_CREDIT_NOTE: 'INVOICE_MONEY_OR_CREDIT_NOTE',
  STRIPE_MANUAL_BY_DESIGN: 'STRIPE_MANUAL_BY_DESIGN',
  STRIPE_NOT_READY: 'STRIPE_NOT_READY',
  STRIPE_LEGACY_EXPRESS: 'STRIPE_LEGACY_EXPRESS',
  STRIPE_NOT_ALLOWED_BY_CASCADE: 'STRIPE_NOT_ALLOWED_BY_CASCADE',
  STRIPE_SETTING_REQUIRES_STRIPE: 'STRIPE_SETTING_REQUIRES_STRIPE',
} as const;

export type KnownErrorKey = (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS];

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

/** 400 `STORAGE_LIMIT_REACHED`, `AI_LIMIT_REACHED`, `AI_NOT_IN_PLAN`: refused before anything was spent. */
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

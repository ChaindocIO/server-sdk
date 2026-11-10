import type { BillingAddress } from './index';

// ============================================================================
// Contragents (the business's counterparties)
// ============================================================================

export type ContragentEntityType = 'person' | 'company';

export type InvoiceLinesStyle = 'quantity-price' | 'amount-only' | 'hours-rate';

export interface Contragent {
  /** The id every other counterparty endpoint takes. */
  id: string;
  email: string;
  name?: string | null;
  legalName?: string | null;
  entityType?: ContragentEntityType | null;
  phone?: string | null;
  billingAddress?: BillingAddress | null;
  taxId?: string | null;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  /** Uuid of this counterparty's payment-instruction override; `null` - the business default applies. */
  paymentInstructionId?: string | null;
  /** The VAT its invoices go under; absent - the business default. */
  taxTreatmentId?: string;
  /** `true` - `taxTreatmentId` is Chaindoc's suggestion from the partner's country and type, not chosen by a person. */
  taxSuggested?: boolean;
  /** `false` - card payments are off for this partner. */
  cardPayments?: boolean;
  /** The currency the partner is billed in (ISO 4217). */
  invoiceCurrency?: string;
  /** Days after the invoice date an invoice falls due (0 - on receipt). */
  paymentTermDays?: number;
  lines?: InvoiceLinesStyle;
  templateId?: 'classic' | 'bold' | 'compact' | 'minimal' | 'centred' | 'total-first';
  /** When the business archived the partner. */
  archivedAt?: string;
  createdAt: string;
}

export interface ContragentListResponse {
  success: boolean;
  contragents: Contragent[];
}

export interface ContragentEnvelope {
  success: boolean;
  contragent: Contragent;
  contragentId?: string;
  message?: string;
}

/** Create a counterparty; an e-mail already in the address book is refused (409), never silently reused. */
export interface CreateContragentParams {
  email: string;
  name?: string;
  legalName?: string;
  entityType?: ContragentEntityType;
  phone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  vatNumber?: string;
  registrationNumber?: string;
}

/** Only the fields sent change; the e-mail cannot. Applies to invoices issued from now on. */
export interface UpdateContragentParams {
  name?: string;
  legalName?: string;
  entityType?: ContragentEntityType;
  phone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  vatNumber?: string;
  registrationNumber?: string;
  /** Counterparty level of the cascade invoice > contract > counterparty > business default. `null` clears it. */
  paymentInstructionId?: string | null;
}

// ============================================================================
// Payment instructions (bank / crypto / other)
// ============================================================================

export type PaymentInstructionType = 'bank' | 'crypto' | 'other';

/** Crypto networks and the assets they carry: TRC20 USDT; ERC20 USDT, USDC, ETH; BEP20 USDT, USDC; Bitcoin BTC; Solana USDT, USDC, SOL. */
export type PaymentInstructionCryptoNetwork = 'TRC20' | 'ERC20' | 'BEP20' | 'Bitcoin' | 'Solana';

export interface PaymentInstruction {
  /** Send as `paymentInstructionId`. */
  id: string;
  type: PaymentInstructionType;
  label?: string | null;
  /** ISO 4217; `null` - the instruction is for any currency. */
  currencyCode?: string | null;
  /** The default of its currency (or of any currency when `currencyCode` is null). */
  isDefault: boolean;
  /** Bank, crypto or other details, as stored and as they print on the document. */
  details: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentInstructionListResponse {
  success: boolean;
  /** Default first. */
  paymentInstructions: PaymentInstruction[];
}

/**
 * Create a payment instruction. Without `currencyCode` it is for any currency; each keeps its own default.
 * Crypto is always any currency and needs `network`, `asset` and an `address` whose checksum adds up,
 * otherwise 400 with `field` and an `errorKey` such as `PAYMENT_INSTRUCTION_CRYPTO_ASSET_NOT_ON_NETWORK`.
 */
export interface CreatePaymentInstructionParams {
  type: PaymentInstructionType;
  label?: string;
  /** ISO 4217 code; absent or `null` - any currency. */
  currencyCode?: string | null;
  isDefault?: boolean;
  region?: 'eu' | 'us' | 'custom';
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swift?: string;
  routingNumber?: string;
  /** Local bank code (sort code, BSB, IFSC...) for other countries. */
  localCode?: string;
  /** Print an EPC QR on invoices: an EU account in EUR only. */
  qr?: boolean;
  /** Crypto: the chain. */
  network?: PaymentInstructionCryptoNetwork | (string & {});
  /** Crypto: an asset its network carries. */
  asset?: string;
  /** Crypto: the wallet address on its network, checksum checked. */
  address?: string;
  /** Tag/memo for chains that need it. */
  memo?: string;
  /** Free-text payment instructions. */
  instructions?: string;
}

export interface PaymentInstructionCreatedResponse {
  success: boolean;
  paymentInstruction: PaymentInstruction;
  paymentInstructionId: string;
  message: string;
}

export interface AssignContragentPaymentInstructionParams {
  /** The counterparty's e-mail. */
  contragentEmail: string;
  /** An active instruction of this business; `null` clears the override. */
  paymentInstructionId: string | null;
}

export interface ContragentPaymentInstructionAssignedResponse {
  success: boolean;
  contragentEmail: string;
  paymentInstructionId?: string | null;
  message: string;
}

export interface ContractPaymentInstructionAssignedResponse {
  success: boolean;
  contractId: string;
  paymentInstructionId?: string | null;
  message: string;
}

// ============================================================================
// Tax treatments
// ============================================================================

export interface TaxTreatment {
  /** Send as `taxTreatmentId`. */
  id: string;
  code: string;
  label: string;
  /** Seller percentage as a decimal string. */
  rate?: string | null;
  countryCode?: string | null;
  category?: string | null;
  legalNote?: string | null;
  isDefault: boolean;
  requiresBuyerVatNumber: boolean;
  requiresSellerVatNumber: boolean;
  showsVatColumn: boolean;
}

export interface TaxTreatmentListResponse {
  success: boolean;
  taxTreatments: TaxTreatment[];
}

// ============================================================================
// Credit notes
// ============================================================================

export interface CreditNoteLineInput {
  description: string;
  quantity: number;
  /** A non-negative decimal string, at most 2 places. */
  unitPrice: string;
  /** The invoice line this reverses (its snapshot index); omit for a whole-invoice credit. */
  sourceLineIndex?: number;
}

export interface CreateCreditNoteParams {
  lines: CreditNoteLineInput[];
  reason?: string;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  /** Canonical number `CN-{YYYY}-{NNNNNN}`. */
  creditNoteNumber: string;
  displayNumber: string;
  /** Total credited, as a decimal string. */
  amount: string;
  currencyCode: string;
  /** The note's own immutable issue date (ISO 8601). */
  issueDate: string;
  lineItems: Array<Record<string, unknown>>;
  reason?: string | null;
  createdAt: string;
}

// ============================================================================
// Stripe card payment on a contract
// ============================================================================

export interface SetContractStripePaymentParams {
  /** Enabling needs a connected Stripe account (else `STRIPE_NOT_ALLOWED_BY_CASCADE`). */
  stripePaymentAllowed: boolean;
}

/** The `code` of a Stripe cascade refusal (`ChaindocError.errorKey` carries it). */
export type StripeCascadeCode =
  | 'STRIPE_MANUAL_BY_DESIGN'
  | 'STRIPE_NOT_READY'
  | 'STRIPE_LEGACY_EXPRESS'
  | 'STRIPE_NOT_ALLOWED_BY_CASCADE'
  | 'STRIPE_SETTING_REQUIRES_STRIPE';

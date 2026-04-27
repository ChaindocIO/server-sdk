/**
 * Email normalization helpers.
 *
 * The Chaindoc backend stores `users.email` lowercased, but historically
 * accepted mixed-case input on signer/contragent/recipient fields. To keep
 * partner integrations from silently dropping auto-link matches, every email
 * payload sent through the SDK is trimmed and lowercased before reaching the
 * wire.
 */

export function normalizeEmail(value: string): string;
export function normalizeEmail(value: string | undefined): string | undefined;
export function normalizeEmail(value: string | null): string | null;
export function normalizeEmail(value: string | null | undefined): string | null | undefined;
export function normalizeEmail(
  value: string | null | undefined,
): string | null | undefined {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
}

/**
 * Returns a shallow copy of `input` with `email` normalized. Leaves the source
 * object untouched so callers can keep using the value they passed in.
 */
export function withNormalizedEmail<T extends { email?: string | null | undefined }>(
  input: T,
): T {
  if (typeof input.email !== 'string') return { ...input };
  return { ...input, email: input.email.trim().toLowerCase() };
}

/**
 * Returns a shallow copy of `input` with `signerEmail` normalized.
 */
export function withNormalizedSignerEmail<
  T extends { signerEmail?: string | null | undefined },
>(input: T): T {
  if (typeof input.signerEmail !== 'string') return { ...input };
  return { ...input, signerEmail: input.signerEmail.trim().toLowerCase() };
}

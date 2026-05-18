/**
 * Email format validation helpers.
 *
 * Backend rejects malformed emails with HTTP 400 (via class-validator
 * `@IsEmail`). Validating on the SDK boundary surfaces the error before
 * the request leaves the integrator's process and points to the exact
 * field that went wrong - easier to debug than a generic 400 response.
 *
 * Companion to `normalize-email.ts`: validate the raw value first, then
 * normalize (trim + lowercase) before sending. `isValidEmail` already
 * trims internally so callers can pass user input verbatim.
 */

import { ChaindocError } from '../client';

// HTML5 spec email regex (intentionally permissive - final shape is enforced
// by the backend). Catches the obvious cases that account for most 400s
// in practice: empty strings, missing @, missing TLD, whitespace in the
// local part.
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return EMAIL_REGEX.test(value.trim());
}

/**
 * Throw ChaindocError if `value` is not a syntactically valid email.
 * `fieldName` becomes part of the error message so the caller knows which
 * field failed (e.g. "contragent.email", "recipients[0].email").
 */
export function assertValidEmail(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (!isValidEmail(value)) {
    throw new ChaindocError(
      `Invalid email address at ${fieldName}: ${JSON.stringify(value)}`,
    );
  }
}

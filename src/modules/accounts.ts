/**
 * Accounts Module
 *
 * A person is addressed by `account`: their personal account or a workspace they can be sent to. Look the
 * options up by e-mail, then pass the chosen option as `account` on recipients, access grants and template
 * slots, or as `contragentAccount` on a contract.
 */

import { ChaindocError } from '../client';
import type { HttpClient } from '../client';
import type { AccountLookupParams, AccountLookupResponse } from '../types';
import { normalizeEmail } from '../utils/normalize-email';
import { assertValidEmail } from '../utils/validate-email';

const MAX_LOOKUP = 25;

export class Accounts {
  constructor(private client: HttpClient) {}

  /**
   * Where can the people at these addresses be sent? Needs a secret key; has its own rate limit per key
   * (429, retried by the client).
   */
  async lookup(params: AccountLookupParams): Promise<AccountLookupResponse> {
    if (params.emails.length === 0 || params.emails.length > MAX_LOOKUP) {
      throw new ChaindocError(`emails must hold 1 to ${MAX_LOOKUP} addresses`);
    }
    params.emails.forEach((email, i) => assertValidEmail(email, `emails[${i}]`));
    return this.client.post<AccountLookupResponse>('/api/v1/accounts/lookup', {
      emails: params.emails.map((email) => normalizeEmail(email)),
    });
  }
}

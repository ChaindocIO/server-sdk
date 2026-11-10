// ============================================================================
// Accounts (where a person can be addressed)
// ============================================================================

/**
 * One of the options `accounts.lookup` returned for an address: the person themselves (`personal`) or a
 * workspace they can be sent to (`workspace`, with the `workspaceId` the lookup gave). Pass it as `account`
 * on recipients, access grants, template slots and `contragentAccount`.
 */
export type AccountChoice =
  | { kind: 'personal' }
  | { kind: 'workspace'; workspaceId: string };

export interface AccountLookupParams {
  /** 1 to 25 addresses. A batch over the limit is refused whole; repeats are answered once. */
  emails: string[];
}

export interface AccountOption {
  kind: 'personal' | 'workspace';
  /** Present on `workspace`: the identifier to send back as `account.workspaceId`. */
  workspaceId?: string;
  workspaceName?: string;
  /** Active members of the workspace. */
  memberCount?: number;
  /** Present on `personal`. */
  personName?: string;
}

export interface AccountLookupResult {
  /** The address as looked up (trimmed, lower-case). */
  email: string;
  /**
   * `not_registered`: no account has this address. `hidden`: the person chose not to reveal where they can
   * be sent. `options`: see `options`.
   */
  status: 'not_registered' | 'hidden' | 'options';
  /** On `options` only: `personal` first, then the workspaces by name. */
  options?: AccountOption[];
}

export interface AccountLookupResponse {
  /** One answer per distinct address, in the order given. */
  results: AccountLookupResult[];
}

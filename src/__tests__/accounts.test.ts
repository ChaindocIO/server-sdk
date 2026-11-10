import { describe, expect, it } from 'vitest';
import { Accounts } from '../modules/accounts';
import { Contracts } from '../modules/contracts';
import { fakeClient } from './helpers';

describe('accounts.lookup', () => {
  it('posts normalized addresses', async () => {
    const f = fakeClient({ results: [] });
    await new Accounts(f.client).lookup({ emails: [' Anna@Example.com '] });
    expect(f.post).toHaveBeenCalledWith('/api/v1/accounts/lookup', { emails: ['anna@example.com'] });
  });

  it('refuses an empty batch, one over 25, and a malformed address before calling', async () => {
    const f = fakeClient();
    const accounts = new Accounts(f.client);
    await expect(accounts.lookup({ emails: [] })).rejects.toThrow('1 to 25');
    await expect(
      accounts.lookup({ emails: Array.from({ length: 26 }, (_, i) => `p${i}@example.com`) }),
    ).rejects.toThrow('1 to 25');
    await expect(accounts.lookup({ emails: ['nope'] })).rejects.toThrow('emails[0]');
    expect(f.post).not.toHaveBeenCalled();
  });
});

describe('contragentAccount on contracts', () => {
  it('create, createMinimal and update pass the counterparty account option', async () => {
    const f = fakeClient({});
    const contracts = new Contracts(f.client);
    const account = { kind: 'workspace' as const, workspaceId: 'ws-1' };
    await contracts.create({ documentId: 'd', title: 't', contragent: { email: 'A@Example.com' }, contragentAccount: account });
    await contracts.createMinimal({ documentId: 'd', title: 't', contragent: { email: 'a@example.com' }, contragentAccount: account });
    await contracts.update('c-1', { contragentAccount: account });
    expect(f.post.mock.calls[0]?.[1]).toMatchObject({ contragentAccount: account, contragent: { email: 'a@example.com' } });
    expect(f.post.mock.calls[1]?.[1]).toMatchObject({ contragentAccount: account });
    expect(f.patch.mock.calls[0]?.[1]).toMatchObject({ contragentAccount: account });
  });

  it('createEmpty needs an address one way or the other', async () => {
    const f = fakeClient();
    await expect(new Contracts(f.client).createEmpty({ title: 't' })).rejects.toThrow('contragentEmail or contragent.email');
    expect(f.post).not.toHaveBeenCalled();
  });
});

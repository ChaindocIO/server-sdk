import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { Processes } from '../modules/processes';
import { fakeClient } from './helpers';

describe('Processes module', () => {
  it('starts a case on the entry address', async () => {
    const f = fakeClient({ caseUuid: 'c1', lifecycle: 'running', replayed: false });
    const processes = new Processes(f.client);
    const receipt = await processes.start('p', 'e', { externalId: 'x1', expectedVersionUuid: 'v1' });
    expect(receipt.caseUuid).toBe('c1');
    expect(f.post).toHaveBeenCalledWith('/api/v1/processes/p/entries/e/cases', {
      externalId: 'x1',
      expectedVersionUuid: 'v1',
    });
  });

  it('signs the integration response over timestamp.rawBody with the integration secret', async () => {
    const f = fakeClient({ accepted: true, duplicate: false });
    const processes = new Processes(f.client);
    const params = { attemptNumber: 1, deliveryUuid: 'd', resultCode: 'ok', sourceEventId: 's', stepUuid: 'st' };
    await processes.respond('int-1', params, 'whsec_test');

    const [endpoint, options] = f.request.mock.calls[0] as [string, { rawBody: Uint8Array; headers: Record<string, string> }];
    expect(endpoint).toBe('/api/v1/processes/integrations/int-1/responses');
    const raw = new TextDecoder().decode(options.rawBody);
    expect(raw).toBe(JSON.stringify(params));
    const ts = options.headers['X-Chaindoc-Timestamp'];
    const expected = `v1=${createHmac('sha256', 'whsec_test').update(`${ts}.${raw}`).digest('hex')}`;
    expect(options.headers['X-Chaindoc-Signature']).toBe(expected);
  });

  it('refuses to answer without an integration secret', async () => {
    const f = fakeClient();
    const processes = new Processes(f.client);
    await expect(
      processes.respond('int-1', { attemptNumber: 1, deliveryUuid: 'd', resultCode: 'ok', sourceEventId: 's', stepUuid: 'st' }, ''),
    ).rejects.toThrow('integrationSecret is required');
    expect(f.request).not.toHaveBeenCalled();
  });
});

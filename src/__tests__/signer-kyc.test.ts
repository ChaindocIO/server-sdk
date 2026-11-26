import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { Signatures } from '../modules/signatures';
import { SIGNER_KYC_STATES } from '../types';
import { fakeClient } from './helpers';

const SNAPSHOT_PATH = path.resolve(__dirname, '../../references/public-api.snapshot.json');

/**
 * A signer refused identity verification for good is told to the integrator: on a KYC request `getRequestStatus` gives each
 * signer `kyc` (`verified` | `pending` | `rejected`), and a request without the check gives none.
 */
describe('getRequestStatus — signers[].kyc', () => {
  it('reads the server’s word for each signer, untouched', async () => {
    const answer = {
      success: true,
      requestId: 'req-1',
      status: 'pending',
      totalSigners: 2,
      signedCount: 0,
      pendingCount: 2,
      isCompleted: false,
      dueDate: '2026-12-03T00:00:00.000Z',
      signers: [
        { id: 's-1', email: 'refused@example.com', role: 'client', hasSigned: false, kyc: 'rejected', signer: null },
        { id: 's-2', email: 'retry@example.com', role: 'witness', hasSigned: false, kyc: 'pending', signer: null },
      ],
      declinedAt: null,
    };
    const { client, get } = fakeClient(answer);

    const status = await new Signatures(client).getRequestStatus('req-1');

    expect(get).toHaveBeenCalledWith('/api/v1/signatures/requests/req-1/status');
    expect(status.signers.map((signer) => signer.kyc)).toEqual(['rejected', 'pending']);
  });

  it('says exactly the words the public API’s contract says', () => {
    const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    const description: string = snapshot.paths['/api/v1/signatures/requests/{requestId}/status'].get.description;
    const said = [...description.matchAll(/`(verified|pending|rejected|failed|retry|final)` —/g)].map((match) => match[1]);

    expect(description).toContain('the signer carries `kyc`');
    expect(said).toEqual([...SIGNER_KYC_STATES]);
  });
});

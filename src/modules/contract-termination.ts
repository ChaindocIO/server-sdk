/**
 * Contract Termination Submodule
 *
 * Lifecycle of a `terminate()` request after it has been initiated:
 * - get / getStatus / getHistory: inspect state
 * - approve / reject: mutual-approval flow (counterparty side)
 * - cancel: initiator withdraws a still-pending request
 */

import type { HttpClient } from '../client';
import type {
  ApproveTerminationParams,
  ContractActionResponse,
  RejectTerminationParams,
  TerminationApproveEnvelope,
  TerminationHistoryEnvelope,
  TerminationRequestEnvelope,
  TerminationStatusEnvelope,
} from '../types';

export class ContractTermination {
  constructor(private client: HttpClient) {}

  /**
   * Get the current termination request for a contract.
   * Returns the pending request if any, otherwise the most recent one,
   * or `terminationRequest: null` when no termination has ever been initiated.
   */
  async get(contractId: string): Promise<TerminationRequestEnvelope> {
    return this.client.get<TerminationRequestEnvelope>(
      `/api/v1/contracts/${contractId}/termination`
    );
  }

  /**
   * Get a lightweight termination status overview:
   * outstanding invoices, upcoming payments and earliest possible effective date.
   */
  async getStatus(contractId: string): Promise<TerminationStatusEnvelope> {
    return this.client.get<TerminationStatusEnvelope>(
      `/api/v1/contracts/${contractId}/termination/status`
    );
  }

  /** Get the full history of termination requests for a contract. */
  async getHistory(contractId: string): Promise<TerminationHistoryEnvelope> {
    return this.client.get<TerminationHistoryEnvelope>(
      `/api/v1/contracts/${contractId}/termination/history`
    );
  }

  /**
   * Approve a pending mutual-approval termination request.
   * Once both sides approve, the contract is terminated.
   */
  async approve(
    contractId: string,
    params?: ApproveTerminationParams
  ): Promise<TerminationApproveEnvelope> {
    return this.client.post<TerminationApproveEnvelope>(
      `/api/v1/contracts/${contractId}/termination/approve`,
      params ?? {}
    );
  }

  /** Reject a pending mutual-approval termination request with a required reason. */
  async reject(
    contractId: string,
    params: RejectTerminationParams
  ): Promise<ContractActionResponse> {
    return this.client.post<ContractActionResponse>(
      `/api/v1/contracts/${contractId}/termination/reject`,
      params
    );
  }

  /**
   * Cancel a still-pending termination request.
   * Only the original initiator side can cancel.
   */
  async cancel(contractId: string): Promise<ContractActionResponse> {
    return this.client.delete<ContractActionResponse>(
      `/api/v1/contracts/${contractId}/termination`
    );
  }
}

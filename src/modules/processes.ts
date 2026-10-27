import type { HttpClient } from '../client';
import type { ProcessEntrySchema, ProcessListResponse, ProcessStartParams, ProcessStartReceipt } from '../types';

/** Public Processes discovery and keyed Start. Authorization remains with the server. */
export class Processes {
  constructor(private client: HttpClient) {}

  /** Explicitly granted active processes only; no hidden total or draft graph. */
  async list(): Promise<ProcessListResponse> {
    return this.client.get<ProcessListResponse>('/api/v1/processes');
  }

  /** Exact current entry schema; discovery readiness does not grant Start permission. */
  async getEntry(processKey: string, entryKey: string): Promise<ProcessEntrySchema> {
    return this.client.get<ProcessEntrySchema>(this.entryPath(processKey, entryKey));
  }

  /**
   * Start or replay this key's receipt (HTTP 200). Keep externalId and the original
   * body unchanged on retry, including expectedVersionUuid. No generated identifiers,
   * current-version lookup or client-side semantic validation precedes disclosure.
   */
  async start(processKey: string, entryKey: string, params: ProcessStartParams): Promise<ProcessStartReceipt> {
    return this.client.post<ProcessStartReceipt>(`${this.entryPath(processKey, entryKey)}/cases`, params);
  }

  private entryPath(processKey: string, entryKey: string): string {
    return `/api/v1/processes/${encodeURIComponent(processKey)}/entries/${encodeURIComponent(entryKey)}`;
  }
}

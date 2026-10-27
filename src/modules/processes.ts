import type { HttpClient } from '../client';
import type { ProcessCase, ProcessEventMetadata, ProcessIntake, ProcessIntakeParams, ProcessResubmitParams, ProcessEntrySchema, ProcessListResponse, ProcessStartParams, ProcessStartReceipt } from '../types';

/** Public Processes source transports. Authorization remains with the server. */
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

  /** Current read_case scope determines whether this is a receipt or full scalar header. */
  async getCase(caseUuid: string): Promise<ProcessCase> {
    return this.client.get<ProcessCase>(this.casePath(caseUuid));
  }

  /** Requires independent read_events grant and explicit current full read policy. */
  async getEvents(caseUuid: string): Promise<ProcessEventMetadata> {
    return this.client.get<ProcessEventMetadata>(`${this.casePath(caseUuid)}/events`);
  }

  /** Own-key resubmit or equal replay (HTTP 200); no version refresh or body rewriting. */
  async resubmit(caseUuid: string, params: ProcessResubmitParams): Promise<ProcessStartReceipt> {
    return this.client.post<ProcessStartReceipt>(`${this.casePath(caseUuid)}/resubmit`, params);
  }

  async beginIntake(processKey: string, entryKey: string, params: ProcessIntakeParams): Promise<ProcessIntake> {
    return this.client.post<ProcessIntake>(`${this.entryPath(processKey, entryKey)}/intakes`, params, { noRetry: true });
  }

  async getIntake(processKey: string, entryKey: string, intakeUuid: string): Promise<ProcessIntake> {
    return this.client.get<ProcessIntake>(this.intakePath(processKey, entryKey, intakeUuid));
  }

  async abandonIntake(processKey: string, entryKey: string, intakeUuid: string): Promise<ProcessIntake> {
    return this.client.delete<ProcessIntake>(this.intakePath(processKey, entryKey, intakeUuid));
  }

  /** Raw bytes; on uncertain outcome read status before retrying. */
  async uploadIntake(processKey: string, entryKey: string, intakeUuid: string, bytes: Blob | Uint8Array): Promise<ProcessIntake> {
    return this.client.putBinary<ProcessIntake>(`${this.intakePath(processKey, entryKey, intakeUuid)}/content`, bytes);
  }

  /** Offset is the server's receivedBytes; the SDK never guesses or retries a chunk. */
  async uploadIntakeChunk(processKey: string, entryKey: string, intakeUuid: string, bytes: Blob | Uint8Array, offset: number): Promise<ProcessIntake> {
    return this.client.sendChunk<ProcessIntake>(`${this.intakePath(processKey, entryKey, intakeUuid)}/chunks`, bytes, offset);
  }

  private casePath(caseUuid: string): string {
    return `/api/v1/processes/cases/${encodeURIComponent(caseUuid)}`;
  }

  private intakePath(processKey: string, entryKey: string, intakeUuid: string): string {
    return `${this.entryPath(processKey, entryKey)}/intakes/${encodeURIComponent(intakeUuid)}`;
  }

  private entryPath(processKey: string, entryKey: string): string {
    return `/api/v1/processes/${encodeURIComponent(processKey)}/entries/${encodeURIComponent(entryKey)}`;
  }
}

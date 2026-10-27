import type { DownloadResult, HttpClient } from '../client';
import type {
  ProcessCase,
  ProcessCaseData,
  ProcessMaterials,
  ProcessMaterialView,
  ProcessMaterialPurpose,
  ProcessEventMetadata,
  ProcessEventQuery,
  ProcessIntake,
  ProcessIntakeParams,
  ProcessResubmitParams,
  ProcessEntrySchema,
  ProcessListResponse,
  ProcessStartParams,
  ProcessStartReceipt,
} from '../types';

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

  /** One historical page under current read_events authority; no automatic page traversal. */
  async getEvents(caseUuid: string, options?: ProcessEventQuery): Promise<ProcessEventMetadata> {
    const query = new URLSearchParams();
    if (options?.afterEventUuid !== undefined) query.set('afterEventUuid', options.afterEventUuid);
    if (options?.limit !== undefined) query.set('limit', String(options.limit));
    const encodedQuery = query.toString();
    const suffix = encodedQuery.length === 0 ? '' : `?${encodedQuery}`;
    return this.client.get<ProcessEventMetadata>(`${this.casePath(caseUuid)}/events${suffix}`);
  }

  /** Current full read_case policy and native per-value disclosure are required. */
  async getData(caseUuid: string): Promise<ProcessCaseData> {
    return this.client.get<ProcessCaseData>(`${this.casePath(caseUuid)}/data`);
  }

  /** Only currently disclosable material metadata; no hidden count or storage identity. */
  async getMaterials(caseUuid: string, view?: ProcessMaterialView): Promise<ProcessMaterials> {
    const query = view === undefined ? '' : `?view=${encodeURIComponent(view)}`;
    return this.client.get<ProcessMaterials>(`${this.casePath(caseUuid)}/materials${query}`);
  }

  /** Binary bytes and server content metadata; purpose defaults to the server's inline view. */
  async openMaterial(
    caseUuid: string,
    materialUuid: string,
    purpose?: ProcessMaterialPurpose,
  ): Promise<DownloadResult> {
    const query = purpose === undefined ? '' : `?purpose=${encodeURIComponent(purpose)}`;
    return this.client.download(`${this.materialPath(caseUuid, materialUuid)}/content${query}`);
  }

  /** Binary thumbnail, subject to the same current material disclosure checks. */
  async getThumbnail(caseUuid: string, materialUuid: string): Promise<DownloadResult> {
    return this.client.download(`${this.materialPath(caseUuid, materialUuid)}/thumbnail`);
  }

  /** Native data PDF export; requires its independent export grant and current policy. */
  async exportData(caseUuid: string): Promise<DownloadResult> {
    return this.client.download(`${this.casePath(caseUuid)}/exports/data`, {
      method: 'POST',
      body: {},
      noRetry: true,
    });
  }

  /** Own-key resubmit or equal replay (HTTP 200); no version refresh or body rewriting. */
  async resubmit(caseUuid: string, params: ProcessResubmitParams): Promise<ProcessStartReceipt> {
    return this.client.post<ProcessStartReceipt>(`${this.casePath(caseUuid)}/resubmit`, params);
  }

  async beginIntake(processKey: string, entryKey: string, params: ProcessIntakeParams): Promise<ProcessIntake> {
    return this.client.post<ProcessIntake>(`${this.entryPath(processKey, entryKey)}/intakes`, params, {
      noRetry: true,
    });
  }

  async getIntake(processKey: string, entryKey: string, intakeUuid: string): Promise<ProcessIntake> {
    return this.client.get<ProcessIntake>(this.intakePath(processKey, entryKey, intakeUuid));
  }

  async abandonIntake(processKey: string, entryKey: string, intakeUuid: string): Promise<ProcessIntake> {
    return this.client.delete<ProcessIntake>(this.intakePath(processKey, entryKey, intakeUuid));
  }

  /** Raw bytes; on uncertain outcome read status before retrying. */
  async uploadIntake(
    processKey: string,
    entryKey: string,
    intakeUuid: string,
    bytes: Blob | Uint8Array,
  ): Promise<ProcessIntake> {
    return this.client.putBinary<ProcessIntake>(`${this.intakePath(processKey, entryKey, intakeUuid)}/content`, bytes);
  }

  /** Offset is the server's receivedBytes; the SDK never guesses or retries a chunk. */
  async uploadIntakeChunk(
    processKey: string,
    entryKey: string,
    intakeUuid: string,
    bytes: Blob | Uint8Array,
    offset: number,
  ): Promise<ProcessIntake> {
    return this.client.sendChunk<ProcessIntake>(
      `${this.intakePath(processKey, entryKey, intakeUuid)}/chunks`,
      bytes,
      offset,
    );
  }

  private materialPath(caseUuid: string, materialUuid: string): string {
    return `${this.casePath(caseUuid)}/materials/${encodeURIComponent(materialUuid)}`;
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

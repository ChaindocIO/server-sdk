/** Native opaque key identity and pinned revision; labels/codes are never identities. */
export interface ProcessKeyReference {
  readonly scope: 'platform' | 'workspace' | 'process';
  readonly keyUuid: string;
  readonly revision: number;
}

export interface ProcessDecimalConstraints {
  readonly min?: string;
  readonly max?: string;
  readonly maxFractionDigits?: number;
}

export interface ProcessFileConstraints {
  readonly refKinds?: readonly ('material' | 'intake')[];
}

/** Exact schema constraints only. No field defaults or values are returned. */
export type ProcessValueSpec =
  | { readonly type: 'text'; readonly config: { readonly minLength?: number; readonly maxLength?: number } }
  | { readonly type: 'number'; readonly config: ProcessDecimalConstraints }
  | { readonly type: 'money'; readonly config: ProcessDecimalConstraints & { readonly currencies?: readonly string[] } }
  | { readonly type: 'date'; readonly config: { readonly min?: string; readonly max?: string } }
  | {
      readonly type: 'choice';
      readonly config: { readonly options: readonly { readonly id: string; readonly label?: string }[] };
    }
  | { readonly type: 'file'; readonly config: ProcessFileConstraints }
  | {
      readonly type: 'files';
      readonly config: ProcessFileConstraints & { readonly minItems?: number; readonly maxItems?: number };
    }
  | {
      readonly type: 'partner';
      readonly config: { readonly bases?: readonly ('contragent' | 'business' | 'workspace' | 'contract')[] };
    }
  | { readonly type: 'document'; readonly config: { readonly requireVersion?: boolean } }
  | { readonly type: 'status'; readonly config: { readonly domain: string; readonly codes: readonly string[] } }
  | { readonly type: 'case'; readonly config: Readonly<Record<string, never>> };

export type ProcessSubjectKind = 'document' | 'contract' | 'amendment' | 'invoice' | 'incoming_bill';

/** Explicit entry-only pin, permitted by the server only on an exact document key revision. */
export interface ProcessSubjectPin {
  readonly role: 'subject' | 'basis';
  readonly objectKind: ProcessSubjectKind;
}

export interface ProcessSubjectRequirement extends ProcessSubjectPin {
  readonly fieldId: string;
  readonly key: ProcessKeyReference;
  readonly requireVersion: boolean;
}

/** Native reference declaration; a case-subject UUID is never a substitute for uuid. */
export interface ProcessSubject {
  /** Explicit entry field pin; omit for the existing native document-entry subject envelope. */
  readonly fieldId?: string;
  readonly objectKind: ProcessSubjectKind;
  readonly uuid: string;
  readonly versionUuid?: string | null;
}

export interface ProcessInputField {
  readonly fieldId: string;
  readonly key: ProcessKeyReference;
  readonly required: boolean;
  readonly label: string;
  readonly spec: ProcessValueSpec;
  readonly subject: ProcessSubjectPin | null;
}

export interface ProcessListResponse {
  readonly processes: readonly { readonly processKey: string; readonly name: string }[];
}

/** Pinned entry schema; native object admission remains with the server on a fresh call. */
export interface ProcessEntrySchema {
  readonly processKey: string;
  readonly entryKey: string;
  readonly name: string | null;
  readonly kind: 'api' | 'form';
  readonly versionUuid: string;
  readonly contentHash: string;
  readonly schemaRef: { readonly kind: 'process_entry'; readonly versionUuid: string; readonly entryKey: string };
  readonly inputSchema: { readonly fields: readonly ProcessInputField[] };
  readonly requiredSubjects: readonly ProcessSubjectRequirement[];
  readonly materials: readonly {
    readonly fieldId: string;
    readonly required: boolean;
    readonly spec: Extract<ProcessValueSpec, { type: 'file' | 'files' }>;
  }[];
  readonly apiAvailable: true;
}

export type ProcessDeadline =
  | { readonly form: 'date'; readonly date: string }
  | { readonly form: 'datetime'; readonly at: string; readonly zone?: string | null }
  | { readonly form: 'duration'; readonly days: number };

/** Server owns full validation and supported subject/material admission after disclosure. */
export interface ProcessStartParams {
  /** 1–255 characters, scoped to API key + process + entry. Reuse unchanged for retries. */
  readonly externalId: string;
  /** Entry schema version used to author the original call; do not refresh it on replay. */
  readonly expectedVersionUuid: string;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly subjects?: readonly ProcessSubject[];
  readonly materialIntakeRefs?: readonly { readonly intakeUuid: string; readonly field?: string | null }[];
  readonly deadline?: ProcessDeadline | null;
  readonly note?: string | null;
  readonly signerMessages?: readonly { readonly nodeKey?: string | null; readonly text: string }[];
}

/** Initiating key receipt only; no case contents or expanded read permission. */
export interface ProcessStartReceipt {
  readonly caseUuid: string;
  readonly lifecycle: 'running' | 'closing' | 'completed' | 'rejected' | 'cancelled' | 'expired';
  readonly replayed: boolean;
}

export type ProcessStartRefusalKey =
  | 'PROCESS_NOT_FOUND'
  | 'PROCESS_FORBIDDEN'
  | 'PROCESS_LAUNCH_FORBIDDEN'
  | 'PROCESS_INPUT_INVALID'
  | 'PROCESS_DEADLINE_INVALID'
  | 'PROCESS_CAPABILITY_NOT_READY'
  | 'PROCESS_ENTRANCE_CLOSED'
  | 'PROCESS_DEFINITION_NOT_ACTIVE'
  | 'PROCESS_ENTRY_NOT_AVAILABLE'
  | 'PROCESS_SUBJECT_UNAVAILABLE'
  | 'PROCESS_SUBJECT_DOES_NOT_FIT'
  | 'PROCESS_PREREQUISITE_UNMET'
  | 'PROCESS_RESPONSIBLE_UNRESOLVED'
  | 'PROCESS_TIME_ZONE_UNRESOLVED'
  | 'PROCESS_IDEMPOTENCY_MEANING_CHANGED'
  | 'PROCESS_VERSION_MOVED'
  | 'PROCESS_NOT_IN_PLAN'
  | 'PROCESS_PLAN_PENDING';

/** Process errors in ChaindocError.response; authentication/global guard errors retain their native shape. */
export type ProcessErrorResponse =
  | {
      readonly errorKey: 'PROCESS_INPUT_INVALID';
      readonly fields: readonly {
        readonly fieldId?: string | null;
        readonly code: string;
        readonly path: string | null;
      }[];
    }
  | { readonly errorKey: Exclude<ProcessStartRefusalKey, 'PROCESS_INPUT_INVALID'> };

/** The initiating key may receive only this receipt under current read_case authority. */
export interface ProcessCaseReceipt {
  readonly caseUuid: string;
  readonly status: 'running' | 'completed' | 'rejected' | 'cancelled' | 'expired';
}

/** Explicit current full read policy only; no task, value or material contents. */
export interface ProcessCaseMetadata extends ProcessCaseReceipt {
  readonly process: { readonly key: string; readonly name: string };
  readonly startedAt: string;
  readonly closedAt: string | null;
  readonly deadlineAt: string;
  readonly result: string | null;
  readonly lifecycle: string;
  readonly closeReason: string | null;
  readonly startChannel: string;
  readonly startedBy: string;
  readonly hasApplicant: boolean;
}

export type ProcessCase = ProcessCaseReceipt | ProcessCaseMetadata;

/** Server validates the exact event cursor in this case and the current permitted event catalogue. */
export interface ProcessEventQuery {
  readonly afterEventUuid?: string;
  /** Integer 1–100; server default is 100. */
  readonly limit?: number;
}

/** One ordered historical page; no actors, raw payload, internal sequence, hash or hidden count. */
export interface ProcessEventMetadata {
  readonly caseUuid: string;
  readonly observation: 'public_event_history';
  readonly hasMore: boolean;
  readonly nextAfter: string | null;
  readonly events: readonly {
    readonly eventUuid: string;
    readonly eventType: string;
    readonly occurredAt: string;
    /** Kind-specific native nonpersonal fields; individual catalogue fields are not guaranteed. */
    readonly data: Readonly<Record<string, ProcessJsonValue>>;
  }[];
}

/** Persist the original command key, pinned version and body unchanged for replay. */
export type ProcessResubmitParams = Omit<ProcessStartParams, 'externalId'> & {
  readonly commandKey: string;
};

export interface ProcessIntakeParams {
  readonly expectedVersionUuid: string;
  readonly fieldId: string;
  readonly file: { readonly name: string; readonly mimeType: string; readonly size: number };
}

export interface ProcessIntake {
  readonly intakeUuid: string;
  readonly state: 'pending' | 'accepted' | 'rejected' | 'bound' | 'abandoned';
  readonly fieldId: string;
  readonly declaredSize: number;
  readonly receivedBytes: number;
  readonly createdAt: string;
  readonly acceptedAt: string | null;
  readonly settledAt: string | null;
}

/** JSON content as disclosed by the native data owner; no source/provenance evidence. */
export type ProcessJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly ProcessJsonValue[]
  | { readonly [key: string]: ProcessJsonValue };

export interface ProcessDataValue {
  readonly valueUuid: string;
  readonly content: ProcessJsonValue;
  readonly erased: boolean;
}

export interface ProcessCaseData {
  readonly caseUuid: string;
  readonly lifecycle: string;
  readonly result: string | null;
  readonly keys: readonly {
    readonly keyUuid: string;
    readonly state: 'resolved' | 'conflict' | 'erased';
    readonly value: ProcessDataValue | null;
    readonly candidates: readonly {
      readonly valueUuid: string;
      readonly erased: boolean;
      readonly value: ProcessDataValue | null;
    }[];
  }[];
}

export type ProcessMaterialView = 'current' | 'history';
export type ProcessMaterialPurpose = 'view' | 'download';

export interface ProcessMaterial {
  readonly materialUuid: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly scan: 'clean' | 'skipped';
  readonly downloadable: boolean;
  readonly status: 'current' | 'replaced' | 'withdrawn';
}

export interface ProcessMaterials {
  readonly caseUuid: string;
  readonly view: ProcessMaterialView;
  readonly items: readonly ProcessMaterial[];
}

# Public Processes source contract

This SDK source implements the public routes below from backend source: discovery/Start
`793ce4c8a`, case/event metadata `fa49a805e`, own-key resubmit `65ec75a0a`
(integrated in `6b0a00863`), entry intakes `e901ab453`, content reads `aa4bf46fb`, and paginated historical events
`ed93cc102`. These are source contracts,
not a published SDK release, generated-current OpenAPI or deployment claim.

| SDK method                                                                     | Public route                                                     | Result                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `processes.list()`                                                             | `GET /api/v1/processes`                                          | `{processes:[{processKey,name}]}`; no hidden total                             |
| `processes.getEntry(processKey, entryKey)`                                     | `GET /api/v1/processes/{processKey}/entries/{entryKey}`          | Current pinned input schema, material constraints and version UUID             |
| `processes.start(processKey, entryKey, params)`                                | `POST /api/v1/processes/{processKey}/entries/{entryKey}/cases`   | HTTP 200 `{caseUuid,lifecycle,replayed}`                                       |
| `processes.getCase(caseUuid)`                                                  | `GET /api/v1/processes/cases/{caseUuid}`                         | Narrow receipt or current-policy full scalar header                            |
| `processes.getEvents(caseUuid, options?)`                                      | `GET /api/v1/processes/cases/{caseUuid}/events`                  | Historical safe event structure, public UUID cursor, `hasMore` and `nextAfter` |
| `processes.getData(caseUuid)`                                                  | `GET /api/v1/processes/cases/{caseUuid}/data`                    | Disclosed key/value projection                                                 |
| `processes.getMaterials(caseUuid, view?)`                                      | `GET /api/v1/processes/cases/{caseUuid}/materials`               | Visible material metadata for current/history view                             |
| `processes.openMaterial(caseUuid, materialUuid, purpose?)`                     | `GET .../materials/{materialUuid}/content`                       | Binary `DownloadResult`, purpose view/download                                 |
| `processes.getThumbnail(caseUuid, materialUuid)`                               | `GET .../materials/{materialUuid}/thumbnail`                     | Binary `DownloadResult`                                                        |
| `processes.exportData(caseUuid)`                                               | `POST /api/v1/processes/cases/{caseUuid}/exports/data`           | Binary native PDF `DownloadResult`                                             |
| `processes.resubmit(caseUuid, params)`                                         | `POST /api/v1/processes/cases/{caseUuid}/resubmit`               | HTTP 200 `{caseUuid,lifecycle,replayed}`                                       |
| `processes.beginIntake(processKey, entryKey, params)`                          | `POST /api/v1/processes/{processKey}/entries/{entryKey}/intakes` | HTTP 201 intake metadata                                                       |
| `processes.getIntake(processKey, entryKey, intakeUuid)`                        | `GET .../intakes/{intakeUuid}`                                   | Intake metadata                                                                |
| `processes.abandonIntake(processKey, entryKey, intakeUuid)`                    | `DELETE .../intakes/{intakeUuid}`                                | Intake metadata                                                                |
| `processes.uploadIntake(processKey, entryKey, intakeUuid, bytes)`              | `PUT .../intakes/{intakeUuid}/content`                           | Intake metadata                                                                |
| `processes.uploadIntakeChunk(processKey, entryKey, intakeUuid, bytes, offset)` | `PATCH .../intakes/{intakeUuid}/chunks`                          | Intake metadata                                                                |

Entry addresses use stable public process/entry keys; case and intake addresses use
opaque UUIDs. No numeric IDs or definition UUIDs are path inputs. Each path segment is URL-encoded. The key's workspace supplies scope; there is
no `/w/` prefix or workspace parameter. Responses are `Cache-Control: no-store`.

The existing SDK client uses `Authorization: Bearer sk_...` and JSON bodies.
Discovery requires the respective current `list` or `read_entry` grant; Start needs
an explicit `start` entry grant and a secret WRITE credential. Discovery readiness
does not grant Start permission. Server key scope, current security, workspace and
plan checks remain authoritative. This SDK does not introduce public-key client
configuration or impersonate a key's creator.

```typescript
const entries = await chaindoc.processes.list();
const processKey = entries.processes[0]?.processKey;
if (processKey) {
  // entryKey comes from your integration's configured stable entry address.
  const schema = await chaindoc.processes.getEntry(processKey, entryKey);
  const originalCall = {
    externalId: "order-2026-000184",
    expectedVersionUuid: schema.versionUuid,
    input: {}, // Supply the values required by this exact schema.
  };
  const receipt = await chaindoc.processes.start(processKey, entryKey, originalCall);
  // Persist the original call. A retry sends the same body and original version.
  const retry = await chaindoc.processes.start(processKey, entryKey, originalCall);
}
```

`externalId` is 1–255 characters and is scoped to key + process + entry. An equal
retry returns the same case with `replayed:true`; a changed meaning returns
`PROCESS_IDEMPOTENCY_MEANING_CHANGED`. Keep the original `expectedVersionUuid`
on retry, even after a new version becomes active. A fresh call against a moved
version returns `PROCESS_VERSION_MOVED`. The module passes the body unchanged;
it does not generate external IDs, fetch a newer schema or validate semantic
fields before the server decides disclosure. Existing client retry behavior uses
the same request; callers must not mutate a pending request body.

Entry `api`/`form` metadata may explicitly pin a native subject reference to a field.
`inputSchema.fields[].subject` is either null or `{role, objectKind}`: role is
`subject` or `basis`, and kind is document, contract, amendment, invoice or
incoming_bill. Only an exact pinned key with `spec.type: document` supports this
metadata. `requiredSubjects` lists required pins with field ID, key reference,
role, kind and `requireVersion`; optional pins remain in the input schema.

Dedicated `document`, `invoice` and `bill` entry schemas instead describe their
single native subject in `entrySubject`: `{role:'subject',min:1,max:1,objectKinds,side}`.
This metadata is separate from `requiredSubjects`, which continues to describe
explicit input-field pins. `api`/`form` entries return `entrySubject:null`.

| Dedicated entry                           | Native subject kinds          | Metadata side |
| ----------------------------------------- | ----------------------------- | ------------- |
| document: plain                           | document                      | null          |
| document: contract                        | contract, amendment           | null          |
| document: any, null or template condition | document, contract, amendment | null          |
| invoice                                   | invoice                       | seller        |
| bill                                      | invoice, incoming_bill        | buyer         |

For these dedicated entries, `entrySubject` constrains the whole `subjects[]`
array to exactly one native reference. It does not request a second reference or
replace explicit input-field requirements in `requiredSubjects`. An unpinned
native subject uses the existing envelope without `fieldId`. If the same single
reference also supplies an explicit `field.subject` pin, the existing matching
`fieldId` requirement still applies.

`objectKinds` identifies the canonical native family, not a promise that a given
object fits. State, template, amount, side ownership and prerequisites remain
native server checks. `side` is schema metadata: do not add `side` to the request
body. No method, body shape or native identity conversion is introduced by this
metadata.

For a declared reference, omit that field from `input` and send its native object
identity in `subjects[]` with the matching `fieldId` and exact `objectKind`:

```typescript
const originalCall = {
  externalId: "order-2026-000185",
  expectedVersionUuid: schema.versionUuid,
  input: {}, // Omit the declared reference field here.
  subjects: [{ fieldId: "agreement", objectKind: "contract" as const, uuid: nativeContractUuid }],
};
```

Use only fields and kinds declared by this exact schema; supply an explicit native
version when required. A declaration and ordinary input for the same field are
mutually exclusive. Without a declaration, an optional field may be omitted or
explicitly null; a required field needs its matching declaration. Existing native
document-entry subject declarations without `fieldId` retain their envelope.

On a fresh Start, the backend must admit the native object, persist the genuine
case subject and bind the field to that subject and resolved version. The SDK
neither invents a case-subject UUID nor renames/canonicalizes native identities.
Keep the original field declarations and version unchanged on replay. Types and
metadata do not grant domain authority or claim that every deployment has the
fresh binding wiring enabled. Unsupported native requirements fail closed with
`PROCESS_CAPABILITY_NOT_READY`. No callback response or required-delivery method
is added here.

Typed process errors remain in `ChaindocError.response` (`ProcessErrorResponse`):
404 `PROCESS_NOT_FOUND`; 403 forbidden/launch forbidden; 400 input/deadline invalid;
409 changed meaning, moved version, unavailable requirements or unresolved
admission. Only fresh `PROCESS_INPUT_INVALID` includes sanitized field codes and
paths. Hidden/replay refusals reveal no field details. Authentication, global
validation and guard errors retain their own native response shape; they are not
coerced into a process refusal. Start returns a receipt, not case contents.

`getCase` requires `read_case`. Owning a Start receipt can yield only `{caseUuid,status}`;
full scalar metadata requires the current explicit full read policy. Narrow `status`
folds closing into running. `getEvents` independently requires `read_events` and its
current full read policy: neither case-read permission nor receipt ownership implies
this permission. Its `public_event_history` observation contains `events`, `hasMore`
and `nextAfter`. Each event has `eventUuid`, `eventType`, `occurredAt` and kind-specific
safe native `data`. These are historical fields, not raw journal payloads or personal
event content. Actors, internal sequences, hashes and hidden counts are absent.
Fact-applied events are included only when the immutable journal records
`matchState: applied`; noted and legacy unmarked fact-received records are omitted.
The marker itself and native fact identifiers are not returned. The SDK keeps `data` recursively JSON
typed rather than promising every field for every event kind.

`getEvents(caseUuid)` still requests the first page. Optional `{limit, afterEventUuid}`
selects the next page: limit is 1–100 (default 100), and the cursor must identify an
available event of this exact case under current permission. Use the returned
`nextAfter` only while `hasMore` is true; the final page has `nextAfter:null`. The SDK
does not traverse pages or replace an unavailable cursor automatically.

```typescript
let history = await chaindoc.processes.getEvents(caseUuid, { limit: 50 });
while (history.hasMore && history.nextAfter !== null) {
  history = await chaindoc.processes.getEvents(caseUuid, {
    limit: 50,
    afterEventUuid: history.nextAfter,
  });
}
```

`getData` requires current full `read_case` disclosure; material listing/content/
thumbnail need `read_material`. `exportData` needs the independent `export` action.
The server repeats native source, erasure and sensitive-content checks. Binary
methods return the existing `DownloadResult` (`data:ArrayBuffer`, `contentType`,
optional `fileName`), never invented JSON. Export posts `{}` without automatic retry.

`resubmit` requires the `resubmit` action and the same initiating key's ended case.
Its closed envelope replaces Start's `externalId` with `commandKey` (1–255 characters).
Persist the exact original command, version and optional input/subjects/material refs/
deadline/note/signer messages. Equal replay returns the native receipt; the SDK does
not generate keys or refresh versions. Resubmit errors contain only `errorKey`, without
Start's optional field diagnostics.

Every intake operation, including status and abandon, requires a current WRITE key
and `intake` grant. Begin accepts only `{expectedVersionUuid,fieldId,file:{name,mimeType,size}}`.
The server owns key/entry/field binding, quota, scan and current-target checks. Begin
is not automatically retried because it has no public idempotency key. Intake metadata
contains UUID, state, field ID, declared size, received bytes and creation/acceptance/
settlement timestamps; acceptance/settlement timestamps may be null. States are
pending, accepted, rejected, bound and abandoned. Only an accepted native intake can
be submitted in a supported Start/resubmit field; a UUID alone does not grant use.

Full upload and chunks send Blob or Uint8Array bytes verbatim with
`Content-Type: application/offset+octet-stream`; chunks also send `Upload-Offset`.
Neither binary method automatically retries. After an uncertain result, read intake
status and resume at its `receivedBytes`, respecting server chunk limits; the SDK
never guesses the offset or serializes bytes as JSON. No file contents or storage IDs
are returned. Intake/global refusal codes remain in native `ChaindocError.response`.

The reference snapshot remains the earlier discovery/Start subset and its schema
dependencies. It was not regenerated for these additional source routes. Source/type/runtime checks
and release publication are separate; no verification or publication is claimed.

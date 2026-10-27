# Public Processes source contract

This SDK source implements discovery and Start from backend source `793ce4c8a`
(including `07519c0ab`), not a published SDK release or a deployment claim.

| SDK method | Public route | Result |
| --- | --- | --- |
| `processes.list()` | `GET /api/v1/processes` | `{processes:[{processKey,name}]}`; no hidden total |
| `processes.getEntry(processKey, entryKey)` | `GET /api/v1/processes/{processKey}/entries/{entryKey}` | Current pinned input schema, material constraints and version UUID |
| `processes.start(processKey, entryKey, params)` | `POST /api/v1/processes/{processKey}/entries/{entryKey}/cases` | HTTP 200 `{caseUuid,lifecycle,replayed}` |

These addresses use stable public process/entry keys, not definition UUIDs or numeric
IDs. Each path segment is URL-encoded. The key's workspace supplies scope; there is
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
    externalId: 'order-2026-000184',
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

The supported discovery subset is document-free `api`/`form` entrances;
`requiredSubjects` is empty. Unsupported native requirements fail closed with
`PROCESS_CAPABILITY_NOT_READY`. Request types describe the Start envelope and do
not promise admission of every subject/material combination. No upload/intake,
case read, resubmit, callback response or required-delivery method is added here.

Typed process errors remain in `ChaindocError.response` (`ProcessErrorResponse`):
404 `PROCESS_NOT_FOUND`; 403 forbidden/launch forbidden; 400 input/deadline invalid;
409 changed meaning, moved version, unavailable requirements or unresolved
admission. Only fresh `PROCESS_INPUT_INVALID` includes sanitized field codes and
paths. Hidden/replay refusals reveal no field details. Authentication, global
validation and guard errors retain their own native response shape; they are not
coerced into a process refusal. Start returns a receipt, not case contents.

The reference snapshot includes only the three exposed Processes paths and their
schema dependencies from the stated backend source. Source/type/runtime checks
and release publication are separate; no verification or publication is claimed.

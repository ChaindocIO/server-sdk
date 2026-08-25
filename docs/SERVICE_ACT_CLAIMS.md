# `AC-27.9` — the named inventory of service-act claims in this package

⛔ **The criterion's failure clause has two halves**: a claim left in the package, **and** a known
address corrected while the list is not presented. This file is the list, generated:

```
node scripts/service-act-claims.mjs           # the list below
node scripts/service-act-claims.mjs --check   # exit 1 if any matched line has no verdict
```

⚠️ **The search is a VOCABULARY over every tracked file, not a set of known phrases.** Eighteen
spellings of «this act is a person's own», `dist/` excluded as generated, and each hit carried
under a digest of its own line, so a rewording loses its verdict and comes back.

⚠️ **Three files are excluded and this document is one of them** — the instrument, its
dispositions and this list all QUOTE the vocabulary they search for, so the guard found itself the
moment they were tracked. Two floors keep that exclusion from growing into a way to make the guard
quiet: the search must match SOMETHING, and it must still reach a line in each of `docs/`, `src/`
and `references/`.

⚠️ **Both controls, run:** appending *«The API key owner personally signs with their own hand»* to
`docs/GETTING_STARTED.md` — a paraphrase no exact-phrase check would catch — makes `--check` name
the file and line; and adding an unreachable area to the floor list makes it refuse for the other
reason. Removing each returns it to green.

## The list

```
# AC-27.9 — every line of chaindoc-websdk-server-sdk matching the service-act vocabulary
# 53 tracked files (dist/ excluded), 36 lines matched, 9 files

docs/ADVANCED_USAGE.md:252	not-a-claim: document ACCESS, not signing	// Notify document owner
docs/ADVANCED_USAGE.md:360	not-a-claim: document ACCESS, not signing	| `private`    | Only owner can access       |
docs/ADVANCED_USAGE.md:496	not-a-claim: about the integrator’s own config	- Store template UUIDs and signer-slot keys in your own integration config.
docs/API_REFERENCE.md:620	states the service act — this is the corrected sentence	key's human owner; the signer row it acts on is named by `signatureId` and the right to act on it
docs/API_REFERENCE.md:621	states the service act — this is the corrected sentence	comes from that row, never from the key owner's e-mail address matching it.
references/public-api.snapshot.json:6393	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Requires secret key (sk_). Attaches an existing document to a DRAFT contract that does not have one yet (typically created via /empty or /minimal). Document must belong to the API key 
references/public-api.snapshot.json:7844	states the service act — “the act is the integration key’s … not the key owner as a person”	"description": "Requires secret key (sk_). Applies the business-side signature to a signing request using a saved signature, identified by its hash from GET /api/v1/signatures. The act is the integrat
references/public-api.snapshot.json:8917	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Returns the activity history (views, downloads, verification checks) for the document current version. Both pk_ and sk_ keys are accepted; the API key owner must have access to the doc
references/public-api.snapshot.json:9020	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Requires secret key (sk_). Posts a top-level comment on the document current version. The API key owner must have collaborate access to the document.",
references/public-api.snapshot.json:9075	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Returns the list of download events recorded for the document. Both pk_ and sk_ keys are accepted; the API key owner must have access to the document.",
references/public-api.snapshot.json:9334	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Returns a paginated list of documents the API key owner can access, filtered by an optional free-text query and lifecycle status. Both pk_ and sk_ keys are accepted.",
references/public-api.snapshot.json:9404	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"summary": "Search documents accessible to the API key owner",
references/public-api.snapshot.json:9413	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Returns a paginated list of documents explicitly shared with the API key owner (via direct or role-based access). Both pk_ and sk_ keys are accepted.",
references/public-api.snapshot.json:9483	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"summary": "List documents shared with the API key owner",
references/public-api.snapshot.json:9536	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Returns the document binary as an attachment. Both pk_ and sk_ keys are accepted; the API key owner must have access to the underlying document.",
references/public-api.snapshot.json:10909	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Requires secret key (sk_). Returns a paginated list of every invoice across all contracts owned by the API key owner, with status filters and aggregate counts.",
references/public-api.snapshot.json:13052	states the service act — corrected at its source (public-api.controller.ts) and regenerated	"description": "Requires secret key (sk_). Signs the signer row this key is entitled to act on — the row bound to the key owner's account, or an unbound row the invitation was delivered to; a row boun
references/public-api.snapshot.json:14207	not-a-claim: ACCESS or SCOPE — “the API key owner must have access”, “contracts owned by the API key owner”	"description": "Requires secret key (sk_). Returns transaction totals grouped by payment-method type for contracts owned by the API key owner, within the given date range.",
src/__tests__/normalize-email.test.ts:46	not-a-claim: a fixture address	{ email: 'Owner@Example.com', signingMethod: 'delegated' as const },
src/__tests__/normalize-email.test.ts:51	not-a-claim: a fixture address	signerEmail: 'Owner@Example.com',
src/__tests__/normalize-email.test.ts:71	not-a-claim: a fixture address	{ email: 'owner@example.com', signingMethod: 'delegated' },
src/__tests__/normalize-email.test.ts:75	not-a-claim: a fixture address	expect.objectContaining({ signerEmail: 'owner@example.com' }),
src/__tests__/normalize-email.test.ts:79	not-a-claim: a fixture address	expect(recipients[0]?.email).toBe('Owner@Example.com');
src/__tests__/normalize-email.test.ts:80	not-a-claim: a fixture address	expect(fields[0]?.signerEmail).toBe('Owner@Example.com');
src/__tests__/signatures.test.ts:16	not-a-claim: a fixture address	{ email: 'owner@example.com', signingMethod: 'delegated' },
src/__tests__/signatures.test.ts:24	not-a-claim: a fixture address	signerEmail: 'owner@example.com',
src/__tests__/signatures.test.ts:39	not-a-claim: a fixture address	{ email: 'owner@example.com', signingMethod: 'delegated' },
src/__tests__/signatures.test.ts:47	not-a-claim: a fixture address	signerEmail: 'owner@example.com',
src/__tests__/templates.test.ts:22	not-a-claim: a fixture address	email: 'owner@example.com',
src/__tests__/templates.test.ts:75	not-a-claim: a fixture address	email: 'owner@example.com',
src/__tests__/validate-email.test.ts:64	not-a-claim: a fixture address	recipients: [{ email: 'owner@example.com', signingMethod: 'delegated' }],
src/modules/contracts.ts:308	states the service act — the line says the act is the KEY’s	* Sign a contract on the workspace's behalf, **as the integration key**.
src/modules/contracts.ts:310	states the service act — the line says the act is the KEY’s	* ⛔ This is not the business owner's own act, and the package used to say it was. The signature
src/types/index.ts:734	states the service act — the line says the act is the KEY’s	* Parameters for signing a contract on the workspace's behalf, as the integration key.
src/types/index.ts:736	states the service act — the line says the act is the KEY’s	* ⛔ Named `BusinessSign…` for wire compatibility; the ACT is the key's, not the key owner's
src/types/index.ts:2246	not-a-claim: SCOPE — whose contracts are listed	* owner's contracts, plus aggregate status counts.
```

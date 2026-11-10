/**
 * **The input types of this SDK do not promise a role audience, and no longer accept coordinate fields; that
 * is confirmed by a type check rather than by a comment.**
 *
 * What changed against 2.x (contract of 2026-11): `"team"` is an input value again - it now means the
 * workspace's own audience - while a role audience (`accessRoles`) stays withdrawn; `media` and a file as the
 * document itself are gone (a file is converted, from Storage); a signature request no longer takes
 * `fields` by page coordinates (a place is a chip in the text, recipients bind by `role`).
 *
 * ⛔ **This file is a fixture, not a runtime module.** It exports types only, is imported by nothing, and is
 * not on `tsup`'s entry (`src/index.ts`), so it is compiled by `npm run typecheck` and shipped by nothing.
 * Every `@ts-expect-error` below is an assertion in both directions: `tsc` fails if the line stops erroring.
 *
 * Run: `npm run typecheck`
 */
import type {
  AccessEmail,
  AccessType,
  AccessTypeInput,
  CreateDocumentFromContentParams,
  CreateDocumentFromStorageParams,
  CreateSignatureRequestParams,
  DocumentContent,
  UpdateDocumentRightsParams,
} from "../types";

const CONTENT: DocumentContent = { version: 2, mode: "document", doc: { type: "doc" } };
const NAMED: AccessEmail[] = [{ email: "a@example.com", level: "read" }];

/** Positive control: the four an input may ask for. It must COMPILE. */
export const ALLOWED_ON_INPUT: AccessTypeInput[] = ["private", "public", "restricted", "team"];
export const READABLE_ON_RESPONSE: AccessType[] = ["private", "public", "restricted", "team"];

// @ts-expect-error a role audience never was an input value.
export const REFUSED_AS_INPUT_ROLE: AccessTypeInput = "team_role";

// ── create from content ──────────────────────────────────────────────────────────────────────
export const CREATE_ALLOWED: CreateDocumentFromContentParams = {
  name: "n",
  content: CONTENT,
  status: "draft",
  accessType: "team",
  accessEmails: NAMED,
};

export const CREATE_WITH_ROLES: CreateDocumentFromContentParams = {
  name: "n",
  content: CONTENT,
  status: "draft",
  // @ts-expect-error `accessRoles` was removed from the input types.
  accessRoles: [{ roleId: 1, level: "read" }],
};

export const CREATE_WITH_MEDIA: CreateDocumentFromContentParams = {
  name: "n",
  content: CONTENT,
  status: "draft",
  // @ts-expect-error a file is converted from Storage; there is no `media` input any more.
  media: { key: "k" },
};

// ── create from storage ──────────────────────────────────────────────────────────────────────
export const CREATE_FROM_STORAGE_PUBLISHED: CreateDocumentFromStorageParams = {
  storageFileId: "s",
  name: "n",
  // @ts-expect-error a document made from a file always lands as a draft.
  status: "published",
};

export const CREATE_FROM_STORAGE_WITH_META: CreateDocumentFromStorageParams = {
  storageFileId: "s",
  name: "n",
  // @ts-expect-error a conversion takes no `meta`.
  meta: [],
};

// ── update rights ────────────────────────────────────────────────────────────────────────────
export const UPDATE_RIGHTS_WITH_TEAM: UpdateDocumentRightsParams = { accessType: "team" };

export const UPDATE_RIGHTS_WITH_ROLES: UpdateDocumentRightsParams = {
  accessType: "restricted",
  // @ts-expect-error the field a role grant would have travelled in no longer exists.
  accessRoles: [{ roleId: 1, level: "read" }],
};

// ── signature request: no coordinates ────────────────────────────────────────────────────────
export const REQUEST_BY_ROLE: CreateSignatureRequestParams = {
  versionId: "v",
  deadline: new Date(),
  recipients: [{ email: "a@example.com", role: "client" }],
};

export const REQUEST_WITH_COORDINATES: CreateSignatureRequestParams = {
  versionId: "v",
  deadline: new Date(),
  recipients: [{ email: "a@example.com", role: "client" }],
  // @ts-expect-error placed fields by page coordinates are refused by the API (SETUP_FIELDS_STAND_IN_THE_TEXT).
  fields: [],
};

// ── the removed types are not exported ───────────────────────────────────────────────────────
// @ts-expect-error `AccessRole` was removed from the public surface.
export type StillExportedRole = import("../types").AccessRole;
// @ts-expect-error `SignatureRequestField` (page coordinates) was removed from the public surface.
export type StillExportedField = import("../types").SignatureRequestField;

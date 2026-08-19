/**
 * **The input types of this SDK do not promise the withdrawn team audience, and that is confirmed
 * by a type check rather than by a comment.** Narrowing the types and documenting the narrowing
 * would leave nothing to go red if the narrowing were ever reverted.
 *
 * ⛔ **This file is a fixture, not a runtime module.** It exports types only, is imported by
 * nothing, and is not on `tsup`'s entry (`src/index.ts`), so it is compiled by `pnpm typecheck`
 * and shipped by nothing. Every `@ts-expect-error` below is an assertion in both directions:
 * `tsc` fails if the line stops erroring — which is what happens the moment somebody widens an
 * input back to `AccessType` or restores `accessRoles`.
 *
 * Run: `npm run typecheck`
 */
import type {
  AccessEmail,
  AccessType,
  AccessTypeInput,
  CreateDocumentParams,
  CreateDocumentFromStorageParams,
  Media,
  MetaTag,
  UpdateDocumentRightsParams,
} from "../types";

/**
 * ⚠️ The valid remainder of every literal below, factored out DELIBERATELY. `@ts-expect-error`
 * suppresses whatever error the next line carries — and TypeScript reports an excess-property
 * error only for the FIRST unknown key in a literal. So one wrong required field anywhere in the
 * object makes the directive pass on the wrong error, and the assertion silently stops being
 * about the audience. The first draft of this file did exactly that: it invented a `folderId`
 * field, and two of the six `@ts-expect-error`s were consuming that instead.
 */
const MEDIA: Media = { type: undefined, name: "f.pdf", key: "k", url: "https://x/y" };
const META: MetaTag[] = [];
const NAMED: AccessEmail[] = [{ email: "a@b.c", level: "read" }];

/** The three an input may ask for. This is the positive control: it must COMPILE. */
export const ALLOWED_ON_INPUT: AccessTypeInput[] = ["private", "public", "restricted"];

/** The response union still carries the fourth. Historical, non-authorising, and readable. */
export const READABLE_ON_RESPONSE: AccessType[] = ["private", "public", "restricted", "team"];

// ── the withdrawn audience is not an input value ─────────────────────────────────────────────
// @ts-expect-error `"team"` is not assignable to `AccessTypeInput` — that is the criterion.
export const REFUSED_AS_INPUT: AccessTypeInput = "team";

// @ts-expect-error a role audience never existed as an input value either.
export const REFUSED_AS_INPUT_ROLE: AccessTypeInput = "team_role";

// ── create ───────────────────────────────────────────────────────────────────────────────────
/** The positive control for the whole shape: this literal must COMPILE. */
export const CREATE_ALLOWED: CreateDocumentParams = {
  name: "n",
  description: "d",
  media: MEDIA,
  meta: META,
  hashtags: [],
  status: "draft",
  accessType: "restricted",
  accessEmails: NAMED,
};

export const CREATE_WITH_TEAM: CreateDocumentParams = {
  name: "n",
  description: "d",
  media: MEDIA,
  meta: META,
  hashtags: [],
  status: "draft",
  // @ts-expect-error accessType on a create is AccessTypeInput, which has no "team".
  accessType: "team",
};

export const CREATE_WITH_ROLES: CreateDocumentParams = {
  name: "n",
  description: "d",
  media: MEDIA,
  meta: META,
  hashtags: [],
  status: "draft",
  // @ts-expect-error `accessRoles` was removed from the input types.
  accessRoles: [{ roleId: 1, level: "read" }],
};

// ── create from storage ──────────────────────────────────────────────────────────────────────
export const CREATE_FROM_STORAGE_WITH_TEAM: CreateDocumentFromStorageParams = {
  storageFileId: "s",
  name: "n",
  description: "d",
  meta: META,
  hashtags: [],
  status: "draft",
  // @ts-expect-error the from-storage entrance takes the same narrowed union.
  accessType: "team",
};

export const CREATE_FROM_STORAGE_WITH_ROLES: CreateDocumentFromStorageParams = {
  storageFileId: "s",
  name: "n",
  description: "d",
  meta: META,
  hashtags: [],
  status: "draft",
  // @ts-expect-error `accessRoles` is gone from this input too.
  accessRoles: [{ roleId: 1, level: "read" }],
};

// ── update rights ────────────────────────────────────────────────────────────────────────────
export const UPDATE_RIGHTS_WITH_TEAM: UpdateDocumentRightsParams = {
  // @ts-expect-error changing an existing document to the team audience does not compile either.
  accessType: "team",
};

export const UPDATE_RIGHTS_WITH_ROLES: UpdateDocumentRightsParams = {
  accessType: "restricted",
  // @ts-expect-error the field a role grant would have travelled in no longer exists.
  accessRoles: [{ roleId: 1, level: "read" }],
};

// ── the removed type is not exported ──────────────────────────────────────────────────────────
// @ts-expect-error `AccessRole` was removed from the public surface.
export type StillExported = import("../types").AccessRole;

// Compile-only fixture (no runtime): a title-only document create / update MUST
// typecheck. This file is intentionally NOT imported by the entry (src/index.ts),
// so tsup never bundles it, and `package.json#files` ships only `dist/`, so it is
// never published. Its sole job is to make `npm run typecheck` FAIL if
// `description` / `meta` / `hashtags` ever regress back to REQUIRED on these
// params - keeping the SDK types in lockstep with the relaxed backend DTOs.
//
// 3.0: a document is made from `content` (a text) or converted from a Storage file; there is no `media`.

import type {
  CreateDocumentFromContentParams,
  CreateDocumentFromStorageParams,
  UpdateDocumentWithContentParams,
  UpdateDocumentWithFileParams,
} from "../types";

// Title-only create from a text - no description / meta / hashtags / access.
export const titleOnlyCreate = {
  name: "Untitled document",
  content: { version: 2, mode: "document", doc: { type: "doc" } },
  status: "draft",
} satisfies CreateDocumentFromContentParams;

// Title-only create-from-storage (status defaults to draft).
export const titleOnlyFromStorage = {
  storageFileId: "00000000-0000-0000-0000-000000000000",
  name: "Untitled document",
} satisfies CreateDocumentFromStorageParams;

// Title-only update from a text.
export const titleOnlyUpdate = {
  name: "Untitled document",
  content: { version: 2, mode: "document", doc: { type: "doc" } },
  baseVersionId: "00000000-0000-0000-0000-000000000000",
  status: "draft",
} satisfies UpdateDocumentWithContentParams;

// Title-only update from a Storage file.
export const titleOnlyUpdateFromFile = {
  name: "Untitled document",
  storageFileId: "00000000-0000-0000-0000-000000000000",
  status: "draft",
} satisfies UpdateDocumentWithFileParams;

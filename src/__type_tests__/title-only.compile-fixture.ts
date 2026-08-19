// Compile-only fixture (no runtime): a title-only document create / update MUST
// typecheck. This file is intentionally NOT imported by the entry (src/index.ts),
// so tsup never bundles it, and `package.json#files` ships only `dist/`, so it is
// never published. Its sole job is to make `npm run typecheck` FAIL if
// `description` / `meta` / `hashtags` ever regress back to REQUIRED on these
// params — keeping the SDK types in lockstep with the relaxed backend DTOs.
//
// `satisfies` checks assignability without widening, so a missing REQUIRED field
// is a compile error here, while the omitted OPTIONAL fields are accepted.

import type {
  CreateDocumentParams,
  CreateDocumentFromStorageParams,
  UpdateDocumentParams,
  Media,
} from "../types";

const media: Media = {
  type: "document",
  name: "contract.pdf",
  key: "drive/abc/contract.pdf",
  url: "https://example.test/contract.pdf",
};

// Title-only create — no description / meta / hashtags / access.
export const titleOnlyCreate = {
  name: "Untitled document",
  media,
  status: "draft",
} satisfies CreateDocumentParams;

// Title-only create-from-storage.
export const titleOnlyFromStorage = {
  storageFileId: "00000000-0000-0000-0000-000000000000",
  name: "Untitled document",
  status: "draft",
} satisfies CreateDocumentFromStorageParams;

// Title-only update (creates a new version) — description / meta / hashtags omitted.
export const titleOnlyUpdate = {
  name: "Untitled document",
  media,
  status: "draft",
} satisfies UpdateDocumentParams;

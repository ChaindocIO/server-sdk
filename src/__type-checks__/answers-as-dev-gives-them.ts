/**
 * Compile-time check (`tsc --noEmit`): the answers dev gives today are assignable to the SDK's types, and answers in the
 * shapes SDK 3.0.0 typed still are. Values are dev's own (SDK piece 10's probe, 2026-11-26), addresses replaced.
 */
import type {
  BusinessSignResponse,
  DocumentContent,
  DocumentContentResponse,
  DocumentConversion,
  GetMyRequestsResponse,
  SignatureRequestRejectedData,
  SignatureRequestStatus,
  WebhookEventDataMap,
  WebhookEventType,
} from "../types";

// `GET /signatures/requests/{id}/status` on a declined request.
export const declined: SignatureRequestStatus = {
  success: true,
  requestId: "a0c4de28-b819-40b9-b202-3faf0ea0849a",
  status: "cancelled",
  versionId: "5b1d6a1e-0000-4000-8000-000000000000",
  totalSigners: 1,
  signedCount: 0,
  pendingCount: 1,
  isCompleted: false,
  dueDate: "2026-11-29T04:36:58.000Z",
  signers: [{ id: "s-1", email: "signer@example.com", role: "client", hasSigned: false, signer: null }],
  declinedBy: { email: "signer@example.com", username: "QA Signer" },
  declineComment: "piece 09: decline told apart from a cancel",
  declinedVia: "document",
  declinedAt: "2026-11-26T04:37:36.373Z",
};

// The same read as SDK 3.0.0 typed it (no role, no decline fields): still an answer of this type.
export const asIn300: SignatureRequestStatus = {
  success: true,
  requestId: "r",
  status: "pending",
  totalSigners: 1,
  signedCount: 0,
  pendingCount: 1,
  isCompleted: false,
  dueDate: "2026-12-01T00:00:00.000Z",
  signers: [{ id: "s", email: "signer@example.com", hasSigned: false }],
};

// `GET /signatures/requests?status=declined` — an item carries `createdAt`, `completedAt` and the decline.
export const list: GetMyRequestsResponse = {
  items: [
    {
      id: "a0c4de28-b819-40b9-b202-3faf0ea0849a",
      versionId: "v",
      status: "cancelled",
      dueDate: "2026-11-29T04:36:58.000Z",
      isKycRequired: false,
      createdAt: "2026-11-26T04:36:58.000Z",
      completedAt: null,
      signers: [{ id: "s-1", email: "signer@example.com", role: "client", hasSigned: false, signer: null }],
      declinedBy: { email: "signer@example.com", username: "QA Signer" },
      declineComment: "no",
      declinedVia: "document",
      declinedAt: "2026-11-26T04:37:36.373Z",
    },
  ],
  total: 1,
  pageNumber: 1,
  pageSize: 5,
};

// `GET /documents/conversions/{id}`: ready, and converting with its progress.
export const ready: DocumentConversion = {
  id: "fe544084-69eb-458a-bdf7-0fa393bda318",
  status: "ready",
  kind: "new",
  documentId: "d",
  versionId: "v",
  review: "ready_for_review",
  progress: null,
};
export const converting: DocumentConversion = {
  id: "c",
  status: "converting",
  kind: "new",
  documentId: null,
  versionId: null,
  review: null,
  progress: { stage: "draft", page: 2, pages: 5 },
};
// @ts-expect-error SDK 3.0.0 typed `progress` as a number; the server never sent one.
export const wrongProgress: DocumentConversion = { ...converting, progress: 40 };

// `documents.getContent` answers version 3; what it gave is sent back as it is.
export const content: DocumentContent = { version: 3, mode: "document", doc: { type: "doc" } };
export const read: Pick<DocumentContentResponse, "contentVersion" | "content"> = { contentVersion: 3, content };
// @ts-expect-error there is no content version 4.
export const noSuchVersion: DocumentContent = { version: 4, mode: "document", doc: { type: "doc" } };

// `contracts.businessSign` — the recorded signature whose contract is still being completed.
export const pending: BusinessSignResponse = {
  success: true,
  contractId: "c",
  signingRequestId: "r",
  message: "Signature recorded; the contract is being completed",
  completionPending: true,
};

// Webhooks: the 23rd event, and a contract refusal that names the contract.
export const ksef: WebhookEventType = "invoice.ksef_accepted";
export const refused: SignatureRequestRejectedData = {
  signatureRequestId: "r",
  documentId: "d",
  versionId: "v",
  documentTitle: "Contract",
  status: "cancelled",
  rejectedAt: "2026-11-26T02:40:00.000Z",
  rejectedVia: "contract",
  rejectedByEmail: "signer@example.com",
  reason: "no",
  contractId: "c",
  signingRequestId: "sr",
  agreementId: null,
  workspace: { uuid: "w" },
};
export const created: WebhookEventDataMap["signature.request.created"] = {
  requestId: "r",
  signatureRequestId: "r",
  documentId: "d",
  versionId: "v",
  recipients: ["signer@example.com"],
  deadline: "2026-12-01T00:00:00.000Z",
  workspace: { uuid: "w" },
};

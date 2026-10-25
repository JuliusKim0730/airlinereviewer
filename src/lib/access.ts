// Who may do what. Everyone can browse; any action needs a session (guest is
// enough); writing and companion features need a verified boarding pass.

export type AccountKind = "none" | "guest" | "google";

export interface Viewer {
  account: AccountKind;
  /** Number of boarding passes this viewer has verified. */
  verifiedTrips: number;
}

export type Action =
  | "browse"
  | "react" // like, bookmark, view my records
  | "verifyTicket"
  | "writeReview"
  | "writePost"
  | "postStory"
  | "companion" // create or join a companion post, chat
  | "syncRecords"; // keep records permanently across devices

export type AccessResult =
  | { ok: true }
  | { ok: false; need: "login" | "verify" | "google" };

const NEEDS_SESSION: Action[] = ["react", "verifyTicket", "writeReview", "writePost", "postStory", "companion", "syncRecords"];
const NEEDS_VERIFIED: Action[] = ["writeReview", "writePost", "postStory", "companion"];

export function checkAccess(viewer: Viewer, action: Action): AccessResult {
  if (action === "browse") return { ok: true };
  if (viewer.account === "none" && NEEDS_SESSION.includes(action)) return { ok: false, need: "login" };
  if (action === "syncRecords" && viewer.account !== "google") return { ok: false, need: "google" };
  if (NEEDS_VERIFIED.includes(action) && viewer.verifiedTrips < 1) return { ok: false, need: "verify" };
  return { ok: true };
}

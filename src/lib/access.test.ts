import { describe, expect, it } from "vitest";
import { checkAccess, type Viewer } from "./access";

const anon: Viewer = { account: "none", verifiedTrips: 0 };
const guest: Viewer = { account: "guest", verifiedTrips: 0 };
const verifiedGuest: Viewer = { account: "guest", verifiedTrips: 1 };
const google: Viewer = { account: "google", verifiedTrips: 0 };

describe("checkAccess", () => {
  it("lets anyone browse", () => {
    expect(checkAccess(anon, "browse")).toEqual({ ok: true });
  });

  it("asks anonymous visitors to log in before any action", () => {
    for (const action of ["react", "verifyTicket", "writeReview", "companion"] as const) {
      expect(checkAccess(anon, action)).toEqual({ ok: false, need: "login" });
    }
  });

  it("lets guests verify a boarding pass", () => {
    expect(checkAccess(guest, "verifyTicket")).toEqual({ ok: true });
  });

  it("requires a verified boarding pass to write or join companions", () => {
    expect(checkAccess(guest, "writePost")).toEqual({ ok: false, need: "verify" });
    expect(checkAccess(guest, "writeReview")).toEqual({ ok: true });
    expect(checkAccess(google, "companion")).toEqual({ ok: false, need: "verify" });
    expect(checkAccess(verifiedGuest, "writeReview")).toEqual({ ok: true });
    expect(checkAccess(verifiedGuest, "companion")).toEqual({ ok: true });
  });

  it("only Google accounts keep records across devices", () => {
    expect(checkAccess(verifiedGuest, "syncRecords")).toEqual({ ok: false, need: "google" });
    expect(checkAccess(google, "syncRecords")).toEqual({ ok: true });
  });
});

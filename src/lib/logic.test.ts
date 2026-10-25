import { describe, expect, it } from "vitest";
import { buildBcbp, parseBcbp } from "./bcbp";
import { seasonAt } from "./cityInfo";
import { stayWindows, todayIso, windowAt } from "./stay";
import { totalKrw, travelStyle, yearRecap } from "./stats";
import { computeTrust } from "./trust";

describe("buildBcbp", () => {
  it("round-trips through the parser", () => {
    const raw = buildBcbp({ surname: "KIM", givenName: "JULIUS", pnr: "ABC123", from: "ICN", to: "BKK", carrier: "KE", flightNumber: "651", date: "2026-10-25", seat: "32K" });
    const leg = parseBcbp(raw, new Date("2026-10-25")).legs[0];
    expect(leg).toMatchObject({ from: "ICN", to: "BKK", carrier: "KE", flightNumber: "651", date: "2026-10-25", seat: "32K" });
  });
});

describe("stayWindows", () => {
  const trips = [
    { from: "ICN", to: "BKK", date: "2026-10-25" },
    { from: "BKK", to: "ICN", date: "2026-10-30" },
    { from: "ICN", to: "DAD", date: "2026-12-01" },
  ];
  it("closes a stay with the next flight out, or defaults to a week", () => {
    expect(stayWindows(trips)).toEqual([
      { iata: "BKK", city: "방콕", from: "2026-10-25", to: "2026-10-30" },
      { iata: "DAD", city: "다낭", from: "2026-12-01", to: "2026-12-08" },
    ]);
  });
  it("finds the window covering a date", () => {
    const w = stayWindows(trips);
    expect(windowAt(w, "BKK", "2026-10-28")?.to).toBe("2026-10-30");
    expect(windowAt(w, "BKK", "2026-11-02")).toBeUndefined();
  });
  it("uses Korea time for today", () => {
    expect(todayIso(new Date("2026-10-25T16:00:00Z"))).toBe("2026-10-26");
  });
});

describe("computeTrust", () => {
  it("starts new users at level 1 with every next step listed", () => {
    const t = computeTrust({ verifiedTrips: 0, google: false, ratings: [], reviews: 0, posts: 0, reports: 0 });
    expect(t).toMatchObject({ score: 0, level: 1, label: "새내기" });
    expect(t.nextSteps).toHaveLength(4);
  });
  it("rewards verification and good ratings and punishes no-shows", () => {
    const good = computeTrust({ verifiedTrips: 3, google: true, ratings: [{ score: 5, showedUp: true }], reviews: 1, posts: 0, reports: 0 });
    expect(good.score).toBe(30 + 10 + 5 + 2);
    expect(good.level).toBe(3);
    const noShow = computeTrust({ verifiedTrips: 3, google: true, ratings: [{ score: 1, showedUp: false }], reviews: 0, posts: 0, reports: 0 });
    expect(noShow.score).toBe(20);
  });
});

describe("stats", () => {
  const trips = [
    { from: "ICN", to: "BKK", date: "2026-03-01", carrier: "KE" },
    { from: "BKK", to: "ICN", date: "2026-03-04", carrier: "KE" },
    { from: "ICN", to: "HND", date: "2026-08-10", carrier: "OZ" },
  ];
  it("summarises a year", () => {
    const r = yearRecap(trips, 2026);
    expect(r).toMatchObject({ year: 2026, flights: 3, cities: 2, topCarrier: "KE" });
    expect(r.longestLeg?.to === "BKK" || r.longestLeg?.from === "BKK").toBe(true);
  });
  it("names a travel style", () => {
    expect(travelStyle(trips)?.title).toBeTruthy();
    expect(travelStyle([])).toBeNull();
  });
  it("totals expenses in KRW and reports unknown currencies", () => {
    expect(totalKrw([{ amount: 1000, currency: "THB" }, { amount: 5000, currency: "KRW" }, { amount: 1, currency: "XYZ" }], { THB: 40 })).toEqual({ total: 45000, missing: ["XYZ"] });
  });
  it("knows rough seasons", () => {
    expect(seasonAt("BKK", 1)?.code).toBe("G");
    expect(seasonAt("ZZZ", 1)).toBeUndefined();
  });
});

import { partnerUrl, pickProducts } from "./products";

describe("products", () => {
  it("fills slots with one search card per partner after curated items", () => {
    const curated = [{ partner: "klook" as const, partnerName: "Klook", title: "왓아룬 투어", subtitle: "", url: "https://example.com/a" }];
    const picked = pickProducts("방콕", curated, {});
    expect(picked.map((p) => p.partner)).toEqual(["klook", "myrealtrip", "monkeytravel"]);
    expect(picked[0].title).toBe("왓아룬 투어");
  });
  it("adds affiliate parameters to partner links", () => {
    expect(partnerUrl("https://x.com/s?query={query}", "방콕", "aid=7")).toBe("https://x.com/s?query=%EB%B0%A9%EC%BD%95&aid=7");
    expect(partnerUrl("https://x.com/", "방콕", "aid=7")).toBe("https://x.com/?aid=7");
  });
});

import { airlineSummary } from "./stats";

describe("airlineSummary", () => {
  it("averages per airline, best first", () => {
    expect(airlineSummary([{ carrier: "KE", overall: 4 }, { carrier: "KE", overall: 5 }, { carrier: "VJ", overall: 3 }])).toEqual([
      { carrier: "KE", count: 2, avg: 4.5 },
      { carrier: "VJ", count: 1, avg: 3 },
    ]);
  });
});

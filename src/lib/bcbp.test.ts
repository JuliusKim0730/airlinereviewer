import { describe, expect, it } from "vitest";
import { BcbpError, parseBcbp, resolveJulianDate } from "./bcbp";
import { findAirport } from "./airports";
import { greatCircleKm } from "./geo";

const pad = (s: string, n: number) => s.padEnd(n, " ");

function leg(o: { pnr: string; from: string; to: string; carrier: string; flight: string; day: string; seat: string; variable?: string }) {
  const variable = o.variable ?? "";
  return (
    pad(o.pnr, 7) + o.from + o.to + pad(o.carrier, 3) + pad(o.flight, 5) + o.day + "Y" + o.seat + "0042 " + "1" +
    variable.length.toString(16).toUpperCase().padStart(2, "0") + variable
  );
}

describe("parseBcbp", () => {
  it("parses the IATA reference single-leg example", () => {
    const pass = parseBcbp("M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 326J001A0025 100", new Date("2026-11-01"));
    expect(pass.surname).toBe("DESMARAIS");
    expect(pass.givenName).toBe("LUC");
    expect(pass.electronicTicket).toBe(true);
    expect(pass.legs).toHaveLength(1);
    expect(pass.legs[0]).toMatchObject({
      pnr: "ABC123",
      from: "YUL",
      to: "FRA",
      carrier: "AC",
      flightNumber: "834",
      julianDate: 326,
      date: "2026-11-22",
      compartment: "J",
      seat: "1A",
      checkInSequence: "25",
    });
  });

  it("skips the variable-size field to read the second leg", () => {
    const raw =
      "M2" + pad("KIM/JULIUS MR", 20) + "E" +
      leg({ pnr: "XYZ789", from: "ICN", to: "BKK", carrier: "KE", flight: "0651", day: "298", seat: "032K", variable: ">5180" }) +
      leg({ pnr: "XYZ789", from: "BKK", to: "ICN", carrier: "KE", flight: "0652", day: "305", seat: "041A" });
    const pass = parseBcbp(raw, new Date("2026-10-25"));
    expect(pass.givenName).toBe("JULIUS");
    expect(pass.legs.map((l) => `${l.from}-${l.to} ${l.carrier}${l.flightNumber} ${l.date} ${l.seat}`)).toEqual([
      "ICN-BKK KE651 2026-10-25 32K",
      "BKK-ICN KE652 2026-11-01 41A",
    ]);
  });

  it("rejects non-BCBP input", () => {
    expect(() => parseBcbp("hello")).toThrow(BcbpError);
    expect(() => parseBcbp("X1" + "A".repeat(80))).toThrow(BcbpError);
  });
});

describe("resolveJulianDate", () => {
  it("picks last year for a late-December flight scanned in early January", () => {
    expect(resolveJulianDate(360, new Date("2027-01-03"))).toBe("2026-12-26");
  });
  it("picks next year for an early-January flight scanned in late December", () => {
    expect(resolveJulianDate(5, new Date("2026-12-28"))).toBe("2027-01-05");
  });
});

describe("greatCircleKm", () => {
  it("measures ICN to BKK at roughly 3,700 km", () => {
    const km = greatCircleKm(findAirport("ICN")!, findAirport("BKK")!);
    expect(km).toBeGreaterThan(3600);
    expect(km).toBeLessThan(3800);
  });
});

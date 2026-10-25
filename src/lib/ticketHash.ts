import type { BoardingPass, BoardingPassLeg } from "./bcbp";

/** Fingerprint of one boarding-pass leg, so the PNR itself never leaves the device. */
export async function ticketHash(pass: BoardingPass, leg: BoardingPassLeg): Promise<string> {
  const key = [leg.pnr, pass.surname, leg.from, leg.to, leg.carrier, leg.flightNumber, leg.julianDate].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

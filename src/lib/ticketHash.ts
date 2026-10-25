import type { BoardingPass, BoardingPassLeg } from "./bcbp";

/** Fingerprint of one boarding-pass leg, so the PNR itself never leaves the device. */
export async function ticketHash(pass: BoardingPass, leg: BoardingPassLeg): Promise<string> {
  const key = [leg.pnr, pass.surname, leg.from, leg.to, leg.carrier, leg.flightNumber, leg.julianDate].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const normalizeName = (pass: BoardingPass) => `${pass.surname}/${pass.givenName}`.toUpperCase().replace(/[^A-Z/]/g, "");

/** Fingerprint of the passenger name, so an account can be bound to one traveller without storing the name. */
export async function passengerHash(pass: BoardingPass): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizeName(pass)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// HONG/GILDONG is shown as HO + stars / GI + stars: enough to recognise, not enough to identify.
export function passengerMask(pass: BoardingPass): string {
  return normalizeName(pass)
    .split("/")
    .map((part) => (part ? part.slice(0, 2) + "**" : ""))
    .join("/");
}

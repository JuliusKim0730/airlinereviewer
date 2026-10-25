import { findAirport } from "./airports";

/** Korean departure airports: arriving here means coming home, not a trip. */
export const HOME_AIRPORTS = new Set(["ICN", "GMP", "PUS", "TAE", "CJJ", "MWX"]);

const DEFAULT_STAY_DAYS = 7;

export interface StayWindow {
  iata: string;
  city: string;
  /** Arrival date (ISO). */
  from: string;
  /** Departure date (ISO): the next verified flight out of the city, or arrival + 7 days. */
  to: string;
}

export interface TripLike {
  from: string;
  to: string;
  date: string;
}

const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 864e5).toISOString().slice(0, 10);

/** Work out when the traveller was (or will be) in each destination from their verified legs. */
export function stayWindows(trips: TripLike[]): StayWindow[] {
  const sorted = [...trips].sort((a, b) => a.date.localeCompare(b.date));
  const windows: StayWindow[] = [];
  sorted.forEach((leg, i) => {
    if (HOME_AIRPORTS.has(leg.to)) return;
    const next = sorted.slice(i + 1).find((l) => l.from === leg.to && l.date >= leg.date);
    windows.push({
      iata: leg.to,
      city: findAirport(leg.to)?.city ?? leg.to,
      from: leg.date,
      to: next ? next.date : addDays(leg.date, DEFAULT_STAY_DAYS),
    });
  });
  return windows;
}

/** The window covering `date` in `iata`, if any. */
export function windowAt(windows: StayWindow[], iata: string, date: string): StayWindow | undefined {
  return windows.find((w) => w.iata === iata && w.from <= date && date <= w.to);
}

export function todayIso(now: Date = new Date()): string {
  // Korean service: "today" follows Korea time.
  return new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
}

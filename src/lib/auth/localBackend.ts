// Development backend used when Supabase is not configured. Keeps the session
// and trips in localStorage so the whole flow can be tried without a server.

import type { AuthBackend, AuthState, NewTrip, Trip } from "./types";
import { EMPTY_STATE } from "./types";

const SESSION_KEY = "alr.session";
const TRIPS_KEY = "alr.trips";

interface StoredSession {
  account: "guest" | "google";
  displayName: string | null;
}

type StoredTrip = Trip & { ticketHash: string };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode); the session simply won't persist.
  }
}

export function createLocalBackend(): AuthBackend {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    mode: "local",
    async load(): Promise<AuthState> {
      const session = read<StoredSession>(SESSION_KEY);
      if (!session) return EMPTY_STATE;
      const trips: Trip[] = (read<StoredTrip[]>(TRIPS_KEY) ?? []).map((t) => ({
        id: t.id,
        from: t.from,
        to: t.to,
        carrier: t.carrier,
        flightNumber: t.flightNumber,
        date: t.date,
        seat: t.seat,
        compartment: t.compartment,
        verifiedAt: t.verifiedAt,
      }));
      return { account: session.account, displayName: session.displayName, trips };
    },
    async signInAsGuest() {
      write(SESSION_KEY, { account: "guest", displayName: null } satisfies StoredSession);
      notify();
    },
    async signInWithGoogle() {
      // Trips stay under the same key, mirroring Supabase identity linking.
      write(SESSION_KEY, { account: "google", displayName: "개발 모드 사용자" } satisfies StoredSession);
      notify();
    },
    async signOut() {
      write(SESSION_KEY, null);
      write(TRIPS_KEY, null);
      notify();
    },
    async addTrips(newTrips: NewTrip[]) {
      const trips = read<StoredTrip[]>(TRIPS_KEY) ?? [];
      let added = 0;
      for (const t of newTrips) {
        if (trips.some((existing) => existing.ticketHash === t.ticketHash)) continue;
        trips.push({ ...t, id: crypto.randomUUID(), verifiedAt: new Date().toISOString() });
        added++;
      }
      write(TRIPS_KEY, trips);
      notify();
      return { added, duplicates: newTrips.length - added };
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

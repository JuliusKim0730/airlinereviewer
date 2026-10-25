// Development backend used when Supabase is not configured. Keeps the session
// and trips in localStorage so the whole flow can be tried without a server.

import type { AuthBackend, AuthState, NewTrip, Trip } from "./types";
import { EMPTY_STATE, randomNickname } from "./types";

const SESSION_KEY = "alr.session";
const TRIPS_KEY = "alr.trips";

interface StoredSession {
  account: "guest" | "google";
  userId: string;
  nickname: string;
  passengerHash?: string;
  passengerMask?: string;
  nameMismatches?: number;
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
      if (!session.userId) {
        // Sessions saved before user ids existed.
        session.userId = crypto.randomUUID();
        session.nickname = randomNickname();
        write(SESSION_KEY, session);
      }
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
      return {
        account: session.account,
        userId: session.userId,
        nickname: session.nickname,
        trips,
        passengerMask: session.passengerMask ?? null,
        nameMismatches: session.nameMismatches ?? 0,
      };
    },
    async signInAsGuest() {
      write(SESSION_KEY, { account: "guest", userId: crypto.randomUUID(), nickname: randomNickname() } satisfies StoredSession);
      notify();
    },
    async signInWithGoogle() {
      // Same user id and trips, mirroring Supabase identity linking.
      const current = read<StoredSession>(SESSION_KEY);
      write(SESSION_KEY, {
        ...current,
        account: "google",
        userId: current?.userId ?? crypto.randomUUID(),
        nickname: current?.nickname ?? randomNickname(),
      } satisfies StoredSession);
      notify();
    },
    async setNickname(nickname) {
      const current = read<StoredSession>(SESSION_KEY);
      if (!current) return;
      write(SESSION_KEY, { ...current, nickname });
      notify();
    },
    async signOut() {
      write(SESSION_KEY, null);
      write(TRIPS_KEY, null);
      notify();
    },
    async addTrips(newTrips: NewTrip[]) {
      const session = read<StoredSession>(SESSION_KEY);
      if (!session) throw new Error("로그인이 필요합니다.");
      const trips = read<StoredTrip[]>(TRIPS_KEY) ?? [];
      let added = 0;
      let nameMismatch = 0;
      for (const t of newTrips) {
        // The first verified pass binds this account to that passenger name.
        if (!session.passengerHash) {
          session.passengerHash = t.passengerHash;
          session.passengerMask = t.passengerMask;
        }
        if (session.passengerHash !== t.passengerHash) {
          nameMismatch++;
          continue;
        }
        if (trips.some((existing) => existing.ticketHash === t.ticketHash)) continue;
        trips.push({ ...t, id: crypto.randomUUID(), verifiedAt: new Date().toISOString() });
        added++;
      }
      if (nameMismatch > 0) session.nameMismatches = (session.nameMismatches ?? 0) + 1;
      write(SESSION_KEY, session);
      write(TRIPS_KEY, trips);
      notify();
      return { added, duplicates: newTrips.length - added - nameMismatch, nameMismatch };
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

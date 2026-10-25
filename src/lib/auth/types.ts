import type { AccountKind } from "@/lib/access";

export interface Trip {
  id: string;
  from: string;
  to: string;
  carrier: string;
  flightNumber: string;
  date: string;
  seat: string;
  compartment: string;
  verifiedAt: string;
}

export type NewTrip = Omit<Trip, "id" | "verifiedAt"> & {
  /** SHA-256 of PNR + surname + leg, used to stop the same ticket being claimed twice. */
  ticketHash: string;
};

export interface AuthState {
  account: AccountKind;
  displayName: string | null;
  trips: Trip[];
}

export interface AddTripsResult {
  added: number;
  duplicates: number;
}

export interface AuthBackend {
  /** "local" stores everything in this browser; "supabase" talks to the real backend. */
  mode: "local" | "supabase";
  load(): Promise<AuthState>;
  signInAsGuest(): Promise<void>;
  /** For a guest, links Google to the same account so their records carry over. May redirect. */
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  addTrips(trips: NewTrip[]): Promise<AddTripsResult>;
  onChange(listener: () => void): () => void;
}

export const EMPTY_STATE: AuthState = { account: "none", displayName: null, trips: [] };

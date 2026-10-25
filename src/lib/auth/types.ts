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
  /** SHA-256 of the passenger name, used to bind an account to one traveller. */
  passengerHash: string;
  /** Masked passenger name for display, first two letters of each part. */
  passengerMask: string;
};

export interface AuthState {
  account: AccountKind;
  userId: string | null;
  nickname: string | null;
  trips: Trip[];
  /** Masked name of the passenger this account is bound to, once a pass is verified. */
  passengerMask: string | null;
  /** Boarding passes refused because the passenger name did not match. */
  nameMismatches: number;
}

export interface AddTripsResult {
  added: number;
  duplicates: number;
  /** Legs refused because the passenger name differs from the account's. */
  nameMismatch: number;
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
  setNickname(nickname: string): Promise<void>;
  onChange(listener: () => void): () => void;
}

export const EMPTY_STATE: AuthState = { account: "none", userId: null, nickname: null, trips: [], passengerMask: null, nameMismatches: 0 };

export const randomNickname = () => `여행자${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

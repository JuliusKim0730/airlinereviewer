import { createClient } from "@supabase/supabase-js";
import type { AuthBackend, AuthState, NewTrip, Trip } from "./types";
import { EMPTY_STATE } from "./types";

interface TripRow {
  id: string;
  dep_iata: string;
  arr_iata: string;
  carrier: string;
  flight_number: string;
  flight_date: string;
  seat: string;
  compartment: string;
  created_at: string;
}

const toTrip = (r: TripRow): Trip => ({
  id: r.id,
  from: r.dep_iata,
  to: r.arr_iata,
  carrier: r.carrier,
  flightNumber: r.flight_number,
  date: r.flight_date,
  seat: r.seat,
  compartment: r.compartment,
  verifiedAt: r.created_at,
});

export function createSupabaseBackend(url: string, anonKey: string): AuthBackend {
  const supabase = createClient(url, anonKey);

  return {
    mode: "supabase",
    async load(): Promise<AuthState> {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return EMPTY_STATE;
      const { data: rows } = await supabase
        .from("trips")
        .select("id, dep_iata, arr_iata, carrier, flight_number, flight_date, seat, compartment, created_at")
        .order("flight_date", { ascending: false });
      return {
        account: user.is_anonymous ? "guest" : "google",
        displayName: (user.user_metadata?.full_name as string | undefined) ?? null,
        trips: (rows ?? []).map(toTrip),
      };
    },
    async signInAsGuest() {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    },
    async signInWithGoogle() {
      const { data } = await supabase.auth.getSession();
      const redirectTo = `${window.location.origin}/me`;
      // Linking keeps the anonymous user's id, so guest trips become the Google account's trips.
      const { error } = data.session?.user.is_anonymous
        ? await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo } })
        : await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) throw error;
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async addTrips(newTrips: NewTrip[]) {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) throw new Error("로그인이 필요합니다.");
      let added = 0;
      for (const t of newTrips) {
        const { error } = await supabase.from("trips").insert({
          user_id: userId,
          dep_iata: t.from,
          arr_iata: t.to,
          carrier: t.carrier,
          flight_number: t.flightNumber,
          flight_date: t.date,
          seat: t.seat,
          compartment: t.compartment,
          ticket_hash: t.ticketHash,
          verification_method: "barcode",
        });
        if (!error) added++;
        else if (error.code !== "23505") throw error; // 23505 = ticket already claimed
      }
      return { added, duplicates: newTrips.length - added };
    },
    onChange(listener) {
      const { data } = supabase.auth.onAuthStateChange(() => listener());
      return () => data.subscription.unsubscribe();
    },
  };
}

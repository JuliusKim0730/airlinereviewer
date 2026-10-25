"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { checkAccess, type Action, type Viewer } from "@/lib/access";
import { createLocalRepo, type CurrentUser } from "@/lib/data/localRepo";
import type { Repo } from "@/lib/data/repo";
import { createSupabaseRepo } from "@/lib/data/supabaseRepo";
import { stayWindows, type StayWindow } from "@/lib/stay";
import { getSupabase } from "@/lib/supabaseClient";
import { computeTrust, type TrustResult } from "@/lib/trust";
import { createLocalBackend } from "./localBackend";
import { createSupabaseBackend } from "./supabaseBackend";
import { EMPTY_STATE, type AuthBackend, type AuthState, type NewTrip, type AddTripsResult } from "./types";

interface AuthContextValue extends AuthState {
  mode: AuthBackend["mode"];
  ready: boolean;
  viewer: Viewer;
  repo: Repo;
  trust: TrustResult;
  stays: StayWindow[];
  /** Resolves with the state after signing in, so callers can re-check access. */
  signInAsGuest(): Promise<AuthState>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  addTrips(trips: NewTrip[]): Promise<AddTripsResult>;
  setNickname(nickname: string): Promise<void>;
  /** Re-read trust inputs after something that changes them (a review, a rating). */
  refreshTrust(): Promise<void>;
  can(action: Action): ReturnType<typeof checkAccess>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type TrustExtras = Awaited<ReturnType<Repo["trustInputs"]>>;
const NO_EXTRAS: TrustExtras = { ratings: [], reviews: 0, posts: 0, reports: 0 };

function createUserSlot() {
  let user: CurrentUser | null = null;
  return {
    get: () => user,
    set: (next: CurrentUser | null) => {
      user = next;
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // The repository reads the signed-in user from this slot on every call.
  const [session] = useState(createUserSlot);
  const [{ backend, repo }] = useState(() => {
    const sb = getSupabase();
    const currentUser = session.get;
    return sb
      ? { backend: createSupabaseBackend(sb), repo: createSupabaseRepo(sb, currentUser) }
      : { backend: createLocalBackend(), repo: createLocalRepo(currentUser) };
  });
  const [state, setState] = useState<AuthState>(EMPTY_STATE);
  const [extras, setExtras] = useState<TrustExtras>(NO_EXTRAS);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const next = await backend.load();
    const nextExtras = next.userId ? await repo.trustInputs(next.userId) : NO_EXTRAS;
    setState(next);
    setExtras(nextExtras);
    setReady(true);
    return next;
  }, [backend, repo]);

  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const next = await backend.load();
      const nextExtras = next.userId ? await repo.trustInputs(next.userId) : NO_EXTRAS;
      if (!alive) return;
      setState(next);
      setExtras(nextExtras);
      setReady(true);
    };
    sync();
    const off = backend.onChange(sync);
    return () => {
      alive = false;
      off();
    };
  }, [backend, repo]);

  const trust = useMemo(
    () => computeTrust({ verifiedTrips: state.trips.length, google: state.account === "google", ...extras }),
    [state.trips.length, state.account, extras],
  );

  // Layout effect: runs before any page's data-loading effects in the same commit.
  useLayoutEffect(() => {
    session.set(state.userId ? { id: state.userId, name: state.nickname ?? "여행자", trust: trust.score } : null);
  }, [session, state.userId, state.nickname, trust.score]);

  const value = useMemo<AuthContextValue>(() => {
    const viewer: Viewer = { account: state.account, verifiedTrips: state.trips.length };
    return {
      ...state,
      mode: backend.mode,
      ready,
      viewer,
      repo,
      trust,
      stays: stayWindows(state.trips),
      signInAsGuest: async () => {
        await backend.signInAsGuest();
        return reload();
      },
      signInWithGoogle: () => backend.signInWithGoogle(),
      signOut: () => backend.signOut(),
      addTrips: async (trips) => {
        const result = await backend.addTrips(trips);
        await reload();
        return result;
      },
      setNickname: async (nickname) => {
        await backend.setNickname(nickname);
        await reload();
      },
      refreshTrust: async () => {
        await reload();
      },
      can: (action) => checkAccess(viewer, action),
    };
  }, [state, ready, backend, repo, trust, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

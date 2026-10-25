"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { checkAccess, type Action, type Viewer } from "@/lib/access";
import { createLocalBackend } from "./localBackend";
import { createSupabaseBackend } from "./supabaseBackend";
import { EMPTY_STATE, type AuthBackend, type AuthState, type NewTrip, type AddTripsResult } from "./types";

interface AuthContextValue extends AuthState {
  mode: AuthBackend["mode"];
  ready: boolean;
  viewer: Viewer;
  /** Resolves with the state after signing in, so callers can re-check access. */
  signInAsGuest(): Promise<AuthState>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  addTrips(trips: NewTrip[]): Promise<AddTripsResult>;
  can(action: Action): ReturnType<typeof checkAccess>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function createBackend(): AuthBackend {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createSupabaseBackend(url, key) : createLocalBackend();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [backend] = useState(createBackend);
  const [state, setState] = useState<AuthState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const next = await backend.load();
    setState(next);
    setReady(true);
    return next;
  }, [backend]);

  useEffect(() => {
    let alive = true;
    const sync = () =>
      backend.load().then((next) => {
        if (!alive) return;
        setState(next);
        setReady(true);
      });
    sync();
    const off = backend.onChange(sync);
    return () => {
      alive = false;
      off();
    };
  }, [backend]);

  const value = useMemo<AuthContextValue>(() => {
    const viewer: Viewer = { account: state.account, verifiedTrips: state.trips.length };
    return {
      ...state,
      mode: backend.mode,
      ready,
      viewer,
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
      can: (action) => checkAccess(viewer, action),
    };
  }, [state, ready, backend, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

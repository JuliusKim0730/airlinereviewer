"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { checkAccess, type Action } from "@/lib/access";
import { useAuth } from "@/lib/auth/AuthProvider";

interface Pending {
  action: Action;
  onAllowed?: () => void;
}

type RequireAccess = (action: Action, onAllowed?: () => void) => void;

const GateContext = createContext<RequireAccess | null>(null);

/**
 * Wraps actions that need a session or a verified boarding pass. When the viewer
 * lacks access, a sheet explains what is needed; once satisfied, the action runs.
 */
export function GateProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [pending, setPending] = useState<Pending | null>(null);

  const requireAccess = useCallback<RequireAccess>(
    (action, onAllowed) => {
      if (auth.can(action).ok) onAllowed?.();
      else setPending({ action, onAllowed });
    },
    [auth],
  );

  const access = pending ? auth.can(pending.action) : null;

  // Signing in as a guest may already satisfy the request; if so, run it and close.
  const continueAsGuest = async () => {
    const next = await auth.signInAsGuest();
    if (pending && checkAccess({ account: next.account, verifiedTrips: next.trips.length }, pending.action).ok) {
      pending.onAllowed?.();
      setPending(null);
    }
  };

  return (
    <GateContext.Provider value={requireAccess}>
      {children}
      {pending && access && !access.ok && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPending(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {access.need === "login" && (
              <>
                <h2 className="text-lg font-semibold">로그인하고 시작해요</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  게스트로도 보딩패스를 인증할 수 있어요. 구글로 로그인하면 기록이 계정에 저장돼 어느 기기에서나 볼 수 있어요.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button className="rounded-xl bg-sky-600 px-4 py-3 font-medium text-white" onClick={() => auth.signInWithGoogle()}>
                    구글로 로그인
                  </button>
                  <button className="rounded-xl border border-zinc-300 px-4 py-3 font-medium dark:border-zinc-700" onClick={continueAsGuest}>
                    게스트로 시작
                  </button>
                </div>
              </>
            )}
            {access.need === "verify" && (
              <>
                <h2 className="text-lg font-semibold">보딩패스 인증이 필요해요</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  실제로 비행기를 탄 사람만 글을 쓰고 동행을 구할 수 있어요. 둘러보기는 지금처럼 계속 할 수 있어요.
                </p>
                <Link
                  href="/verify"
                  className="mt-5 block rounded-xl bg-sky-600 px-4 py-3 text-center font-medium text-white"
                  onClick={() => setPending(null)}
                >
                  보딩패스 인증하기
                </Link>
              </>
            )}
            {access.need === "google" && (
              <>
                <h2 className="text-lg font-semibold">구글로 기록 저장하기</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  게스트 기록은 이 기기에만 있어요. 구글 계정을 연결하면 지금까지의 기록을 그대로 옮겨서 보관해요.
                </p>
                <button className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-3 font-medium text-white" onClick={() => auth.signInWithGoogle()}>
                  구글 계정 연결
                </button>
              </>
            )}
            <button className="mt-3 w-full py-2 text-sm text-zinc-500" onClick={() => setPending(null)}>
              나중에
            </button>
          </div>
        </div>
      )}
    </GateContext.Provider>
  );
}

export function useRequireAccess(): RequireAccess {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error("useRequireAccess must be used inside GateProvider");
  return ctx;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRequireAccess } from "./Gate";
import { SERVICE_NAME } from "./Splash";

const TABS = [
  { href: "/", label: "홈" },
  { href: "/companions", label: "동행" },
  { href: "/verify", label: "인증" },
  { href: "/me", label: "내 기록" },
];

function AccountBadge() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  if (!auth.ready) return null;
  if (auth.account === "none") {
    return (
      <button className="rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white" onClick={() => requireAccess("react")}>
        로그인
      </button>
    );
  }
  const label = auth.account === "google" ? auth.displayName ?? "구글 계정" : "게스트";
  return (
    <span className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      {label}
      {auth.trips.length > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">인증 탑승객</span>}
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold tracking-tight text-sky-700 dark:text-sky-400">
            {SERVICE_NAME}
          </Link>
          <AccountBadge />
        </div>
      </header>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-6">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`block py-3 text-center text-sm ${pathname === tab.href ? "font-semibold text-sky-700 dark:text-sky-400" : "text-zinc-500"}`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRequireAccess } from "./Gate";
import { SERVICE_NAME } from "./Splash";

const LEFT_TABS = [
  { href: "/", label: "홈" },
  { href: "/reviews", label: "후기" },
];
const RIGHT_TABS = [
  { href: "/companions", label: "동행" },
  { href: "/me", label: "내 기록" },
];

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
    </svg>
  );
}

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
  const label = `${auth.nickname ?? "여행자"} · ${auth.account === "google" ? "구글" : "게스트"}`;
  return (
    <span className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      {label}
      {auth.trips.length > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">인증 탑승객</span>}
    </span>
  );
}

function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`block py-3 text-center text-sm ${active ? "font-semibold text-sky-700 dark:text-sky-400" : "text-zinc-500"}`}>
      {label}
    </Link>
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
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="mx-auto grid max-w-xl grid-cols-5 items-end">
          {LEFT_TABS.map((tab) => (
            <li key={tab.href}>
              <TabLink href={tab.href} label={tab.label} active={pathname === tab.href} />
            </li>
          ))}
          <li className="flex justify-center">
            <Link
              href="/verify"
              aria-label="보딩패스 인증"
              className={`-mt-7 mb-1 flex h-16 w-16 flex-col items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white dark:ring-zinc-950 ${
                pathname === "/verify" ? "bg-sky-800" : "bg-sky-600"
              }`}
            >
              <PlaneIcon />
              <span className="text-[10px] font-semibold leading-none">인증</span>
            </Link>
          </li>
          {RIGHT_TABS.map((tab) => (
            <li key={tab.href}>
              <TabLink href={tab.href} label={tab.label} active={pathname === tab.href} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

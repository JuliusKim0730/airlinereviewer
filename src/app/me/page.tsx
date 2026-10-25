"use client";

import Link from "next/link";
import { useRequireAccess } from "@/components/Gate";
import { findAirport } from "@/lib/airports";
import { useAuth } from "@/lib/auth/AuthProvider";
import { greatCircleKm, laps } from "@/lib/geo";

export default function MePage() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();

  if (!auth.ready) return null;

  if (auth.account === "none") {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-xl font-semibold">내 여행 기록</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">로그인하면 인증한 비행과 여행 통계가 여기에 쌓여요.</p>
        <button className="rounded-xl bg-sky-600 px-4 py-3 font-medium text-white" onClick={() => requireAccess("react")}>
          로그인하기
        </button>
      </div>
    );
  }

  const totalKm = auth.trips.reduce((sum, t) => {
    const a = findAirport(t.from);
    const b = findAirport(t.to);
    return a && b ? sum + greatCircleKm(a, b) : sum;
  }, 0);
  const airlines = new Set(auth.trips.map((t) => t.carrier)).size;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">내 여행 기록</h1>

      {auth.account === "guest" && (
        <div className="rounded-xl bg-sky-50 p-4 text-sm dark:bg-sky-950">
          <p>게스트 기록은 이 기기에만 저장돼요. 구글 계정을 연결하면 지금 기록을 그대로 옮겨서 보관해요.</p>
          <button className="mt-3 font-medium text-sky-700 dark:text-sky-400" onClick={() => requireAccess("syncRecords")}>
            구글로 저장하기
          </button>
        </div>
      )}

      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500">비행</dt>
          <dd className="text-xl font-semibold">{auth.trips.length}회</dd>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500">거리</dt>
          <dd className="text-xl font-semibold">{Math.round(totalKm).toLocaleString()}km</dd>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <dt className="text-xs text-zinc-500">항공사</dt>
          <dd className="text-xl font-semibold">{airlines}곳</dd>
        </div>
      </dl>
      {totalKm > 0 && <p className="text-sm text-zinc-500">지구를 {laps(totalKm).toFixed(2)}바퀴 날았어요.</p>}

      {auth.trips.length === 0 ? (
        <Link href="/verify" className="rounded-xl bg-sky-600 px-4 py-3 text-center font-medium text-white">
          첫 보딩패스 인증하기
        </Link>
      ) : (
        <ul className="flex flex-col gap-2">
          {auth.trips.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="font-medium">
                {t.from} → {t.to}
              </span>
              <span className="text-sm text-zinc-500">
                {t.carrier}
                {t.flightNumber} · {t.date}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button className="self-start text-sm text-zinc-500 underline underline-offset-4" onClick={() => auth.signOut()}>
        로그아웃
      </button>
      {auth.mode === "local" && <p className="text-xs text-zinc-400">개발 모드: Supabase 설정 전이라 기록이 이 브라우저에만 저장돼요.</p>}
    </div>
  );
}

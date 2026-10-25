"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FlightCard from "@/components/FlightCard";
import { useRequireAccess } from "@/components/Gate";
import TravelMap from "@/components/TravelMap";
import { Sheet, TrustBadge, useToast } from "@/components/ui";
import { airlineName } from "@/lib/airlines";
import { findAirport } from "@/lib/airports";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Trip } from "@/lib/auth/types";
import { cityCurrency, seasonAt } from "@/lib/cityInfo";
import type { Expense } from "@/lib/data/types";
import { laps } from "@/lib/geo";
import { HOME_AIRPORTS, todayIso } from "@/lib/stay";
import { legKm, totalKrw, travelStyle, yearRecap } from "@/lib/stats";
import { TRUST_POINTS } from "@/lib/trust";
import { useLoad } from "@/lib/useLoad";

interface Rates {
  date: string;
  rates: Record<string, number>;
  approximate: string[];
}

const fetchRates = (date?: string): Promise<Rates> => fetch(`/api/rates${date ? `?date=${date}` : ""}`).then((r) => r.json());

const CATEGORIES: { key: Expense["category"]; label: string }[] = [
  { key: "flight", label: "항공" },
  { key: "stay", label: "숙소" },
  { key: "food", label: "식비" },
  { key: "activity", label: "투어·체험" },
  { key: "shopping", label: "쇼핑" },
  { key: "transport", label: "교통" },
  { key: "etc", label: "기타" },
];

export default function MePage() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();

  if (!auth.ready) return null;
  if (auth.account === "none") {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-xl font-semibold">내 여행 기록</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">로그인하면 인증한 비행, 여행 통계, 신뢰도가 여기에 쌓여요.</p>
        <button className="rounded-xl bg-sky-600 px-4 py-3 font-medium text-white" onClick={() => requireAccess("react")}>
          로그인하기
        </button>
      </div>
    );
  }
  return <MyRecords />;
}

function MyRecords() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [expenses, reloadExpenses] = useLoad(() => auth.repo.listExpenses(), `expenses:${auth.userId}`);
  const [rates] = useLoad(() => fetchRates(), "rates:latest");
  const [openTrip, setOpenTrip] = useState<Trip | null>(null);
  const [editingName, setEditingName] = useState(false);

  const trips = auth.trips;
  const totalKm = trips.reduce((s, t) => s + legKm(t), 0);
  const destinations = auth.stays;
  const carriers = new Set(trips.map((t) => t.carrier));
  const spent = rates && expenses ? totalKrw(expenses, rates.rates) : null;
  const style = travelStyle(trips);
  const year = Number(todayIso().slice(0, 4));
  const recap = yearRecap(trips, year);
  const mapCities = useMemo(
    () =>
      [...new Map(destinations.map((w) => [w.iata, w])).values()].flatMap((w) => {
        const a = findAirport(w.iata);
        return a ? [{ iata: a.iata, city: a.city, lat: a.lat, lon: a.lon, stories: 0, companions: 0, reviews: 0 }] : [];
      }),
    [destinations],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {auth.nickname}
            <button className="text-xs font-normal text-zinc-400 underline" onClick={() => setEditingName(true)}>
              바꾸기
            </button>
          </h1>
          <p className="text-sm text-zinc-500">{auth.account === "google" ? "구글 계정" : "게스트"}</p>
        </div>
        <TrustBadge score={auth.trust.score} />
      </header>

      {auth.account === "guest" && (
        <div className="rounded-xl bg-sky-50 p-4 text-sm dark:bg-sky-950">
          <p>게스트 기록은 이 기기에만 저장돼요. 구글 계정을 연결하면 지금 기록을 그대로 옮겨서 보관해요.</p>
          <button className="mt-3 font-medium text-sky-700 dark:text-sky-400" onClick={() => requireAccess("syncRecords")}>
            구글로 저장하기
          </button>
        </div>
      )}

      <TrustCard />

      <dl className="grid grid-cols-2 gap-3 text-center">
        <Tile label="비행" value={`${trips.length}회`} />
        <Tile label="날아간 거리" value={`${Math.round(totalKm).toLocaleString()}km`} sub={totalKm > 0 ? `지구 ${laps(totalKm).toFixed(2)}바퀴` : undefined} />
        <Tile label="다녀온 도시" value={`${new Set(destinations.map((d) => d.iata)).size}곳`} />
        <Tile label="탄 항공사" value={`${carriers.size}곳`} sub={[...carriers].slice(0, 3).map(airlineName).join(", ") || undefined} />
        <Tile
          label="쓴 돈"
          value={spent ? `₩${spent.total.toLocaleString()}` : "-"}
          sub={rates && expenses?.some((e) => rates.approximate.includes(e.currency)) ? "일부 환율은 대략값" : "여행별로 기록해 보세요"}
          wide
        />
      </dl>

      {trips.length === 0 ? (
        <Link href="/verify" className="rounded-xl bg-sky-600 px-4 py-3 text-center font-medium text-white">
          첫 보딩패스 인증하기
        </Link>
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-semibold">내 여행 지도</h2>
            <TravelMap cities={mapCities} routes={trips} />
          </section>

          {style && (
            <section className="rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500 p-5 text-white">
              <p className="text-sm opacity-80">나의 여행 스타일</p>
              <p className="mt-1 text-2xl font-bold">{style.title}</p>
              <p className="mt-1 text-sm opacity-90">{style.detail}</p>
            </section>
          )}

          {recap.flights > 0 && (
            <section className="rounded-2xl bg-zinc-900 p-5 text-white dark:bg-zinc-800">
              <p className="text-sm text-zinc-400">{recap.year} 티뷰 리캡</p>
              <p className="mt-2 text-lg font-semibold">
                올해 {recap.flights}번 날아서 {recap.km.toLocaleString()}km, {recap.cities}개 도시를 다녀왔어요.
              </p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-zinc-300">
                {recap.topCity && <li>가장 많이 간 곳 · {recap.topCity}</li>}
                {recap.topCarrier && <li>가장 많이 탄 항공사 · {airlineName(recap.topCarrier)}</li>}
                {recap.longestLeg && (
                  <li>
                    가장 긴 비행 · {recap.longestLeg.from} → {recap.longestLeg.to} ({recap.longestLeg.km.toLocaleString()}km)
                  </li>
                )}
              </ul>
            </section>
          )}

          <WhatIfNow />

          <section>
            <h2 className="mb-3 font-semibold">인증한 비행</h2>
            <ul className="flex flex-col gap-2">
              {trips.map((t) => {
                const tripSpent = rates && expenses ? totalKrw(expenses.filter((e) => e.tripId === t.id), rates.rates).total : 0;
                return (
                  <li key={t.id}>
                    <button className="flex w-full items-baseline justify-between rounded-xl border border-zinc-200 px-4 py-3 text-left dark:border-zinc-800" onClick={() => setOpenTrip(t)}>
                      <span className="font-medium">
                        {t.from} → {t.to} <span className="text-sm font-normal text-zinc-500">{findAirport(t.to)?.city}</span>
                      </span>
                      <span className="text-sm text-zinc-500">
                        {t.date}
                        {tripSpent > 0 && ` · ₩${tripSpent.toLocaleString()}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <button className="self-start text-sm text-zinc-500 underline underline-offset-4" onClick={() => auth.signOut()}>
        로그아웃
      </button>
      {auth.mode === "local" && <p className="text-xs text-zinc-400">개발 모드: Supabase 연결 전이라 기록이 이 브라우저에만 저장돼요.</p>}

      {openTrip && <TripSheet trip={openTrip} expenses={(expenses ?? []).filter((e) => e.tripId === openTrip.id)} onClose={() => setOpenTrip(null)} onChanged={reloadExpenses} />}
      {editingName && <NicknameSheet onClose={() => setEditingName(false)} />}
    </div>
  );
}

function Tile({ label, value, sub, wide }: { label: string; value: string; sub?: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
      {sub && <dd className="truncate text-xs text-zinc-500">{sub}</dd>}
    </div>
  );
}

function TrustCard() {
  const { trust, passengerMask, nameMismatches } = useAuth();
  return (
    <section className="rounded-2xl border border-emerald-200 p-4 dark:border-emerald-900">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">
          신뢰도 Lv.{trust.level} · {trust.label}
        </h2>
        <span className="text-sm text-zinc-500">{trust.score}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${trust.score}%` }} />
      </div>
      {trust.nextSteps.length > 0 && (
        <>
          <p className="mt-4 text-sm font-medium">신뢰도 올리는 법</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {trust.nextSteps.map((s) => (
              <li key={s.text} className="flex justify-between">
                <span>· {s.text}</span>
                <span className="text-emerald-600">+{s.points}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {passengerMask && <p className="mt-3 text-sm">🎫 인증된 탑승객 이름 {passengerMask}</p>}
      {nameMismatches > 0 && (
        <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          다른 이름의 보딩패스 인증 시도 {nameMismatches}회 ({nameMismatches * TRUST_POINTS.nameMismatch}점)
        </p>
      )}
      <p className="mt-3 text-xs text-zinc-500">
        동행에서 노쇼하면 {TRUST_POINTS.noShow}점, 신고가 확인되면 {TRUST_POINTS.report}점, 다른 사람 이름의 보딩패스를 인증하려 하면 {TRUST_POINTS.nameMismatch}점이에요. 신뢰도는 동행 모집·신청 때 상대에게 보여요.
      </p>
    </section>
  );
}

function WhatIfNow() {
  const auth = useAuth();
  const today = todayIso();
  const month = Number(today.slice(5, 7));
  const past = [...new Map(auth.stays.filter((w) => w.from < today).map((w) => [w.iata, w])).values()].slice(0, 4);
  const [compare] = useLoad(async () => {
    const latest = await fetchRates();
    const then = await Promise.all(past.map((w) => fetchRates(w.from)));
    return { latest, then };
  }, `whatif:${past.map((w) => w.iata + w.from).join(",")}`);
  if (past.length === 0) return null;

  return (
    <section>
      <h2 className="mb-1 font-semibold">지금 다시 가면?</h2>
      <p className="mb-3 text-xs text-zinc-500">이번 달 날씨와 그때 대비 환율이에요. 계절 정보는 대략적인 기준이에요.</p>
      <ul className="flex flex-col gap-2">
        {past.map((w, i) => {
          const season = seasonAt(w.iata, month);
          const cur = cityCurrency(w.iata);
          const nowRate = cur && cur !== "KRW" ? compare?.latest.rates[cur] : undefined;
          const thenRate = cur && cur !== "KRW" ? compare?.then.at(i)?.rates[cur] : undefined;
          const approx = cur ? compare?.latest.approximate.includes(cur) : true;
          const change = nowRate && thenRate && !approx ? Math.round(((nowRate - thenRate) / thenRate) * 1000) / 10 : null;
          return (
            <li key={w.iata} className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
              <p className="font-medium">
                {w.city} <span className="font-normal text-zinc-500">· {w.from.slice(0, 7).replace("-", ".")} 방문</span>
              </p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {month}월은 {season?.label ?? "정보 없음"}
                {season?.code === "G" && " 👍"}
                {change !== null &&
                  ` · ${cur} 환율이 그때보다 ${Math.abs(change)}% ${change > 0 ? "올라서 조금 비싸졌어요" : change < 0 ? "내려서 더 저렴해졌어요" : "그대로예요"}`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TripSheet({ trip, expenses, onClose, onChanged }: { trip: Trip; expenses: Expense[]; onClose: () => void; onChanged: () => void }) {
  const auth = useAuth();
  const destination = HOME_AIRPORTS.has(trip.to) ? trip.from : trip.to;
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(cityCurrency(destination) ?? "KRW");
  const [category, setCategory] = useState<Expense["category"]>("food");
  const [memo, setMemo] = useState("");
  const [toast, showToast] = useToast();
  const field = "rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  const currencies = [...new Set(["KRW", cityCurrency(destination) ?? "KRW", "USD"])];

  return (
    <Sheet title={`${trip.from} → ${trip.to}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <FlightCard leg={trip} />
        <section>
          <h3 className="mb-2 text-sm font-semibold">이 여행에서 쓴 돈</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <span>
                  {CATEGORIES.find((c) => c.key === e.category)?.label} {e.memo && <span className="text-zinc-500">· {e.memo}</span>}
                </span>
                <span className="flex items-center gap-2">
                  {e.amount.toLocaleString()} {e.currency}
                  <button className="text-xs text-zinc-400" onClick={async () => (await auth.repo.deleteExpense(e.id), onChanged())}>
                    삭제
                  </button>
                </span>
              </li>
            ))}
            {expenses.length === 0 && <li className="text-zinc-500">아직 기록이 없어요.</li>}
          </ul>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const value = Number(amount.replace(/,/g, ""));
              if (!value || value < 0) return;
              await auth.repo.addExpense({ tripId: trip.id, category, amount: value, currency, memo: memo.trim() });
              setAmount("");
              setMemo("");
              onChanged();
              showToast("기록했어요.");
            }}
          >
            <div className="flex gap-2">
              <select className={field} value={category} onChange={(e) => setCategory(e.target.value as Expense["category"])}>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input className={`${field} min-w-0 flex-1`} inputMode="decimal" placeholder="금액" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select className={field} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <input className={field} placeholder="메모 (선택)" maxLength={100} value={memo} onChange={(e) => setMemo(e.target.value)} />
            <button className="rounded-lg bg-sky-600 py-2 text-sm font-medium text-white">추가</button>
          </form>
        </section>
      </div>
      {toast}
    </Sheet>
  );
}

function NicknameSheet({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const [name, setName] = useState(auth.nickname ?? "");
  const valid = name.trim().length >= 2 && name.trim().length <= 12;
  return (
    <Sheet title="닉네임 바꾸기" onClose={onClose}>
      <input className="w-full rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900" maxLength={12} value={name} onChange={(e) => setName(e.target.value)} />
      <p className="mt-1 text-xs text-zinc-500">2~12자. 후기, 게시글, 동행에 이 이름이 보여요.</p>
      <button
        className="mt-4 w-full rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-40"
        disabled={!valid}
        onClick={async () => {
          await auth.setNickname(name.trim());
          onClose();
        }}
      >
        저장
      </button>
    </Sheet>
  );
}

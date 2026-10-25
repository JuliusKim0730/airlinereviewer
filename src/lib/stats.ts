import { findAirport } from "./airports";
import { cityTags, type CityTag } from "./cityInfo";
import { greatCircleKm } from "./geo";
import { HOME_AIRPORTS, stayWindows, type TripLike } from "./stay";

export interface StatTrip extends TripLike {
  carrier: string;
}

const STYLE_BY_TAG: Record<CityTag, string> = {
  food: "미식 탐험가",
  beach: "바다 휴양러",
  city: "도시 산책자",
  culture: "문화 탐방가",
  nature: "자연 힐링러",
  shopping: "쇼핑 사냥꾼",
  nightlife: "밤도깨비 여행자",
};

export function legKm(t: TripLike): number {
  const a = findAirport(t.from);
  const b = findAirport(t.to);
  return a && b ? greatCircleKm(a, b) : 0;
}

/** Name a travel style from where someone goes and how long they stay. */
export function travelStyle(trips: TripLike[]): { title: string; detail: string } | null {
  const windows = stayWindows(trips);
  if (windows.length === 0) return null;
  const counts = new Map<CityTag, number>();
  windows.forEach((w) => cityTags(w.iata).forEach((tag, i) => counts.set(tag, (counts.get(tag) ?? 0) + (3 - Math.min(i, 2)))));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const avgDays = windows.reduce((sum, w) => sum + (Date.parse(w.to) - Date.parse(w.from)) / 864e5, 0) / windows.length;
  const pace = avgDays <= 4 ? "짧고 굵게 다니는" : avgDays >= 10 ? "느긋하게 머무는" : "적당히 머무는";
  return { title: top ? STYLE_BY_TAG[top] : "자유로운 여행자", detail: `${pace} 여행 스타일 · 평균 ${Math.round(avgDays)}일 체류` };
}

export interface Recap {
  year: number;
  flights: number;
  km: number;
  cities: number;
  topCarrier: string | null;
  topCity: string | null;
  longestLeg: { from: string; to: string; km: number } | null;
}

export function yearRecap(trips: StatTrip[], year: number): Recap {
  const inYear = trips.filter((t) => t.date.startsWith(String(year)));
  const tally = <K,>(keys: K[]) => {
    const m = new Map<K, number>();
    keys.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  const destinations = inYear.map((t) => t.to).filter((iata) => !HOME_AIRPORTS.has(iata));
  const legs = inYear.map((t) => ({ from: t.from, to: t.to, km: legKm(t) }));
  const longest = legs.sort((a, b) => b.km - a.km)[0] ?? null;
  const topIata = tally(destinations);
  return {
    year,
    flights: inYear.length,
    km: Math.round(legs.reduce((s, l) => s + l.km, 0)),
    cities: new Set(destinations).size,
    topCarrier: tally(inYear.map((t) => t.carrier)),
    topCity: topIata ? findAirport(topIata)?.city ?? topIata : null,
    longestLeg: longest && longest.km > 0 ? { ...longest, km: Math.round(longest.km) } : null,
  };
}

export interface ExpenseLike {
  amount: number;
  currency: string;
}

/** Sum expenses in KRW. `ratesToKrw` maps currency → KRW per unit; unknown currencies are skipped and listed. */
export function totalKrw(expenses: ExpenseLike[], ratesToKrw: Record<string, number>): { total: number; missing: string[] } {
  const missing = new Set<string>();
  let total = 0;
  for (const e of expenses) {
    const rate = e.currency === "KRW" ? 1 : ratesToKrw[e.currency];
    if (rate === undefined) missing.add(e.currency);
    else total += e.amount * rate;
  }
  return { total: Math.round(total), missing: [...missing] };
}

/** Average 가심비 per airline from boarding-pass verified reviews only, best first. */
export function airlineSummary(reviews: { carrier: string; value: number; verified: boolean }[]): { carrier: string; count: number; avg: number }[] {
  const by = new Map<string, { sum: number; count: number }>();
  reviews.forEach((r) => {
    if (!r.verified || !r.carrier) return;
    const e = by.get(r.carrier) ?? { sum: 0, count: 0 };
    e.sum += r.value;
    e.count++;
    by.set(r.carrier, e);
  });
  return [...by.entries()]
    .map(([carrier, e]) => ({ carrier, count: e.count, avg: Math.round((e.sum / e.count) * 10) / 10 }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);
}

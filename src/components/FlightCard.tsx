"use client";

import { useEffect, useState } from "react";
import { airlineName } from "@/lib/airlines";
import { findAirport } from "@/lib/airports";
import { legKm } from "@/lib/stats";

interface FlightInfo {
  configured: boolean;
  aircraft?: string;
  registration?: string;
}

export interface FlightLeg {
  from: string;
  to: string;
  carrier: string;
  flightNumber: string;
  date: string;
  seat: string;
  compartment: string;
}

const CABIN: Record<string, string> = { F: "퍼스트", A: "퍼스트", J: "비즈니스", C: "비즈니스", D: "비즈니스", W: "프리미엄 이코노미" };

/** Boarding-pass style card: route, airline, actual aircraft (when the flight API is configured), distance. */
export default function FlightCard({ leg }: { leg: FlightLeg }) {
  const [info, setInfo] = useState<{ key: string; data: FlightInfo } | null>(null);
  const key = `${leg.carrier}${leg.flightNumber}/${leg.date}`;

  useEffect(() => {
    let alive = true;
    fetch(`/api/flight?carrier=${leg.carrier}&number=${leg.flightNumber}&date=${leg.date}`)
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((data: FlightInfo) => alive && setInfo({ key, data }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key, leg.carrier, leg.flightNumber, leg.date]);

  const from = findAirport(leg.from);
  const to = findAirport(leg.to);
  const km = Math.round(legKm(leg));
  const data = info?.key === key ? info.data : null;
  // Rough block time: 800 km/h cruise plus 30 minutes on the ground.
  const minutes = km ? Math.round((km / 800) * 60 + 30) : 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900 dark:from-sky-950 dark:to-zinc-900">
      <div className="flex items-center justify-between bg-sky-600 px-4 py-2 text-sm text-white">
        <span className="font-semibold">{airlineName(leg.carrier)}</span>
        <span>
          {leg.carrier}
          {leg.flightNumber}
        </span>
      </div>
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-3xl font-bold tracking-tight">{leg.from}</p>
          <p className="text-xs text-zinc-500">{from?.city ?? ""}</p>
        </div>
        <div className="flex flex-1 flex-col items-center px-3 text-xs text-zinc-500">
          <span>✈</span>
          <span className="w-full border-t border-dashed border-sky-300" />
          {minutes > 0 && <span className="mt-1">약 {Math.floor(minutes / 60)}시간 {minutes % 60}분</span>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight">{leg.to}</p>
          <p className="text-xs text-zinc-500">{to?.city ?? ""}</p>
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-2 px-4 py-4 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">날짜</dt>
          <dd>{leg.date.slice(5).replace("-", ".")}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">좌석</dt>
          <dd>{leg.seat || "-"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">클래스</dt>
          <dd>{CABIN[leg.compartment] ?? "이코노미"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">거리</dt>
          <dd>{km ? `${km.toLocaleString()}km` : "-"}</dd>
        </div>
      </dl>
      {data?.aircraft && (
        <p className="border-t border-sky-100 px-4 py-2 text-sm dark:border-sky-900">
          기종 <span className="font-medium">{data.aircraft}</span>
          {data.registration && <span className="text-zinc-500"> · {data.registration}</span>}
        </p>
      )}
    </article>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryObject } from "topojson-specification";
import land from "world-atlas/land-110m.json";
import { findAirport } from "@/lib/airports";
import type { CityActivity } from "@/lib/cityActivity";
import ProductCards from "./ProductCards";

const W = 400;
const H = 440;

const VIEWS = {
  asia: { label: "아시아", bounds: [[96, -4], [148, 47]] as [number, number][] },
  world: { label: "세계", bounds: [[-170, -50], [180, 72]] as [number, number][] },
};
type ViewKey = keyof typeof VIEWS;

/** Korean service: Incheon is always on the map as the home base. */
const HOME = findAirport("ICN")!;

const topology = land as unknown as Topology<{ land: GeometryObject }>;
const landShape = feature(topology, topology.objects.land);

interface Props {
  cities: CityActivity[];
  /** My verified flights, drawn as great-circle arcs. */
  routes: { from: string; to: string }[];
}

export default function TravelMap({ cities, routes }: Props) {
  const [view, setView] = useState<ViewKey>("asia");
  const [selected, setSelected] = useState<string | null>(null);

  const { path, project } = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [12, 12],
        [W - 12, H - 12],
      ],
      { type: "MultiPoint", coordinates: VIEWS[view].bounds },
    );
    return {
      path: geoPath(projection),
      project: (lon: number, lat: number) => projection([lon, lat]) ?? [-100, -100],
    };
  }, [view]);

  const legs = routes
    .map((r) => [findAirport(r.from), findAirport(r.to)] as const)
    .filter(([a, b]) => a && b)
    .map(([a, b]) => ({ a: a!, b: b! }));
  const arcs = legs.map(({ a, b }) => path({ type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] }) ?? "");
  const endpoints = [...new Map(legs.flatMap(({ a, b }) => [a, b]).map((ap) => [ap.iata, ap])).values()].filter((ap) => ap.iata !== HOME.iata);

  const city = cities.find((c) => c.iata === selected);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 dark:border-sky-900">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="여행자들이 있는 도시 지도">
          <rect width={W} height={H} className="fill-sky-100 dark:fill-sky-950" />
          <path d={path(geoGraticule10()) ?? ""} className="fill-none stroke-sky-200 dark:stroke-sky-900" strokeWidth={0.5} />
          <path d={path(landShape) ?? ""} className="fill-white stroke-sky-200 dark:fill-zinc-800 dark:stroke-zinc-700" strokeWidth={0.6} />
          {arcs.map((d, i) => (
            <path key={i} d={d} className="fill-none stroke-sky-600" strokeWidth={1.6} strokeDasharray="5 4" strokeLinecap="round" />
          ))}
          {endpoints.map((ap) => {
            const [x, y] = project(ap.lon, ap.lat);
            return <circle key={ap.iata} cx={x} cy={y} r={3} className="fill-white stroke-sky-600" strokeWidth={1.6} />;
          })}
          {(() => {
            const [x, y] = project(HOME.lon, HOME.lat);
            return (
              <g transform={`translate(${x} ${y})`} aria-label="인천국제공항">
                <circle r={7} className="fill-zinc-900 dark:fill-white" stroke="white" strokeWidth={2} />
                <circle r={2.5} className="fill-white dark:fill-zinc-900" />
                <text x={11} y={4} className="map-label font-bold">
                  인천
                </text>
              </g>
            );
          })()}
          {cities.map((c) => {
            const [x, y] = project(c.lon, c.lat);
            const active = c.iata === selected;
            const total = c.stories + c.companions + c.reviews;
            const r = 5 + Math.min(total, 6);
            return (
              <g key={c.iata} transform={`translate(${x} ${y})`} className="cursor-pointer" onClick={() => setSelected(active ? null : c.iata)}>
                {c.stories > 0 && (
                  <circle r={r} className="animate-ping fill-sky-400/60" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                )}
                <circle r={r} className={active ? "fill-sky-800" : "fill-sky-600"} stroke="white" strokeWidth={2} />
                <text y={r + 13} textAnchor="middle" className="map-label font-semibold">
                  {c.city}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute right-2 top-2 flex gap-1 rounded-full bg-white/90 p-1 text-xs shadow-sm dark:bg-zinc-900/90">
          {(Object.keys(VIEWS) as ViewKey[]).map((key) => (
            <button
              key={key}
              className={`rounded-full px-3 py-1 ${view === key ? "bg-sky-600 text-white" : "text-zinc-600 dark:text-zinc-300"}`}
              onClick={() => setView(key)}
            >
              {VIEWS[key].label}
            </button>
          ))}
        </div>
      </div>

      {city ? (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold">{city.city}</span>
            <span className="text-sm text-zinc-500">{city.iata}</span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            지금 이 순간 {city.stories} · 동행 {city.companions} · 후기 {city.reviews}
          </p>
          <div className="mt-3 flex gap-2 text-sm">
            <Link href="/reviews" className="flex-1 rounded-lg border border-zinc-300 py-2 text-center dark:border-zinc-700">
              후기 보기
            </Link>
            <Link href="/companions" className="flex-1 rounded-lg bg-sky-600 py-2 text-center font-medium text-white">
              동행 보기
            </Link>
          </div>
          <div className="mt-4">
            <ProductCards iata={city.iata} city={city.city} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          핀을 누르면 그 도시의 스토리, 동행, 후기를 볼 수 있어요. {routes.length > 0 && "점선은 내가 인증한 비행이에요."}
        </p>
      )}
    </div>
  );
}

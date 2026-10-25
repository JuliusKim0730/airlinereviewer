"use client";

import { useState } from "react";
import { BcbpError, parseBcbp, type BoardingPass } from "@/lib/bcbp";
import { findAirport } from "@/lib/airports";
import { greatCircleKm } from "@/lib/geo";

const SAMPLE = "M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 326J001A0025 100";

export default function TicketVerifier() {
  const [raw, setRaw] = useState("");
  const [pass, setPass] = useState<BoardingPass | null>(null);
  const [error, setError] = useState<string | null>(null);

  function verify(text: string) {
    setRaw(text);
    try {
      setPass(parseBcbp(text));
      setError(null);
    } catch (e) {
      setPass(null);
      setError(e instanceof BcbpError ? e.message : "바코드를 읽지 못했습니다.");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">보딩패스 바코드 내용</span>
        <textarea
          className="min-h-24 rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="카메라 스캔은 다음 단계에서 붙습니다. 지금은 바코드 문자열을 붙여 넣어 주세요."
          value={raw}
          onChange={(e) => verify(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="self-start text-sm text-zinc-500 underline underline-offset-4"
        onClick={() => verify(SAMPLE)}
      >
        예시 바코드로 해보기
      </button>

      {error && raw && <p className="text-sm text-red-600">{error}</p>}

      {pass && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            탑승객 {pass.surname}/{pass.givenName} · 인증 등급: 바코드
          </p>
          {pass.legs.map((leg, i) => {
            const from = findAirport(leg.from);
            const to = findAirport(leg.to);
            const km = from && to ? Math.round(greatCircleKm(from, to)) : null;
            return (
              <article key={i} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tracking-tight">
                    {leg.from} → {leg.to}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {leg.carrier}
                    {leg.flightNumber}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {from?.city ?? leg.from} → {to?.city ?? leg.to}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-zinc-500">날짜</dt>
                    <dd>{leg.date}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">좌석</dt>
                    <dd>
                      {leg.seat} ({leg.compartment})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">거리</dt>
                    <dd>{km ? `${km.toLocaleString()} km` : "-"}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

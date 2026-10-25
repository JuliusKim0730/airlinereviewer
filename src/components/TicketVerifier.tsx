"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BcbpError, buildBcbp, parseBcbp, type BoardingPass } from "@/lib/bcbp";
import { findAirport } from "@/lib/airports";
import { useAuth } from "@/lib/auth/AuthProvider";
import { HOME_AIRPORTS, todayIso } from "@/lib/stay";
import { passengerHash, passengerMask, ticketHash } from "@/lib/ticketHash";
import BarcodeScanner, { decodeImage } from "./BarcodeScanner";
import FlightCard from "./FlightCard";
import { useRequireAccess } from "./Gate";
import ProductCards from "./ProductCards";

/** A boarding pass for today, Incheon to Bangkok, so the whole flow can be tried without a real ticket. */
function demoPass(): string {
  const pnr = Math.random().toString(36).slice(2, 8).toUpperCase();
  return buildBcbp({ surname: "TVIEW", givenName: "DEMO", pnr, from: "ICN", to: "BKK", carrier: "KE", flightNumber: "651", date: todayIso(), seat: "32K" });
}

export default function TicketVerifier() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [pass, setPass] = useState<BoardingPass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ message: string; ok: boolean } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  const read = useCallback((text: string) => {
    setSaved(null);
    try {
      setPass(parseBcbp(text));
      setError(null);
    } catch (e) {
      setPass(null);
      setError(e instanceof BcbpError ? e.message : "바코드를 읽지 못했어요.");
    }
  }, []);

  const onScanned = useCallback(
    (text: string) => {
      setScanning(false);
      read(text);
    },
    [read],
  );

  async function onImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      read(await decodeImage(file));
    } catch {
      setPass(null);
      setError("사진에서 바코드를 찾지 못했어요. 바코드가 잘 보이게 다시 찍어 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function save(p: BoardingPass) {
    const nameHash = await passengerHash(p);
    const trips = await Promise.all(
      p.legs.map(async (leg) => ({
        from: leg.from,
        to: leg.to,
        carrier: leg.carrier,
        flightNumber: leg.flightNumber,
        date: leg.date,
        seat: leg.seat,
        compartment: leg.compartment,
        ticketHash: await ticketHash(p, leg),
        passengerHash: nameHash,
        passengerMask: passengerMask(p),
      })),
    );
    try {
      const { added, duplicates, nameMismatch } = await auth.addTrips(trips);
      setSaved(
        nameMismatch > 0
          ? {
              ok: false,
              message: `이 계정은 ${auth.passengerMask ?? "다른 탑승객"} 이름으로 인증돼 있어요. 본인 보딩패스만 인증할 수 있어요. 다른 이름으로 인증을 시도하면 신뢰도가 내려가요.`,
            }
          : added === 0
          ? { ok: false, message: "이미 인증된 티켓이에요. 같은 티켓은 한 계정에서만 인증할 수 있어요." }
          : { ok: true, message: duplicates > 0 ? `${added}개 구간을 인증했어요. ${duplicates}개는 이미 인증된 구간이에요.` : "인증 완료! 이제 후기, 지금 이 순간, 동행이 열려요." },
      );
    } catch {
      setSaved({ ok: false, message: "저장에 실패했어요. 잠시 후 다시 시도해 주세요." });
    }
  }

  const destination = pass?.legs.find((l) => !HOME_AIRPORTS.has(l.to));

  return (
    <section className="flex flex-col gap-4">
      {!pass && (
        <div className="grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center gap-2 rounded-2xl bg-sky-600 p-5 font-medium text-white" onClick={() => setScanning(true)}>
            <span className="text-2xl">📷</span>
            카메라로 스캔
          </button>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-sky-200 p-5 font-medium text-sky-700 dark:border-sky-800 dark:text-sky-300">
            <span className="text-2xl">🖼️</span>
            {busy ? "읽는 중…" : "사진·캡처 올리기"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
          </label>
        </div>
      )}

      {!pass && (
        <details className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">바코드 문자열 직접 입력</summary>
          <textarea
            className="mt-2 min-h-20 w-full rounded-lg border border-zinc-300 bg-white p-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="M1HONG/GILDONG ..."
          />
          <button className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-white dark:bg-white dark:text-zinc-900" onClick={() => read(manual)}>
            읽기
          </button>
        </details>
      )}

      {!pass && (
        <button type="button" className="self-start text-sm text-zinc-500 underline underline-offset-4" onClick={() => read(demoPass())}>
          예시 보딩패스로 해보기 (오늘 인천 → 방콕)
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {pass && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">
            탑승객 {pass.surname}/{pass.givenName} · 바코드 인증
          </p>
          {pass.legs.map((leg, i) => (
            <FlightCard key={i} leg={leg} />
          ))}

          {!saved && (
            <button type="button" className="rounded-xl bg-sky-600 px-4 py-3 font-medium text-white" onClick={() => requireAccess("verifyTicket", () => save(pass))}>
              이 탑승으로 인증하기
            </button>
          )}
          {saved && <p className={`text-sm ${saved.ok ? "text-sky-700 dark:text-sky-400" : "text-red-600"}`}>{saved.message}</p>}

          {saved?.ok && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/reviews#write" className="rounded-xl bg-sky-600 py-3 text-center font-medium text-white">
                이 비행 후기 쓰기
              </Link>
              <Link href="/companions" className="rounded-xl border border-zinc-300 py-3 text-center font-medium dark:border-zinc-700">
                동행 찾기
              </Link>
            </div>
          )}

          {destination && <ProductCards iata={destination.to} city={findAirport(destination.to)?.city ?? destination.to} />}

          <button className="self-start text-sm text-zinc-500 underline underline-offset-4" onClick={() => (setPass(null), setSaved(null))}>
            다른 보딩패스 인증하기
          </button>
        </div>
      )}

      {scanning && <BarcodeScanner onResult={onScanned} onClose={() => setScanning(false)} />}
    </section>
  );
}

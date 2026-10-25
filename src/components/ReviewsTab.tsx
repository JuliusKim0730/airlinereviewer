"use client";

import { useEffect, useState } from "react";
import { airlineName } from "@/lib/airlines";
import { findAirport } from "@/lib/airports";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMPTY_DETAILS, type Review, type ReviewDetails } from "@/lib/data/types";
import { airlineSummary } from "@/lib/stats";
import { useLoad } from "@/lib/useLoad";
import { useRequireAccess } from "./Gate";
import { MediaImage, ModerationMenu, PhotoPicker, Sheet, StarInput, Stars, useToast } from "./ui";

type Choice<K extends keyof ReviewDetails> = { key: Exclude<ReviewDetails[K], "">; label: string }[];

const SEAT_SPACE: Choice<"seatSpace"> = [
  { key: "roomy", label: "넉넉해요" },
  { key: "ok", label: "보통" },
  { key: "tight", label: "좁아요" },
];
const SEAT_TEMP: Choice<"seatTemp"> = [
  { key: "hot", label: "더웠어요" },
  { key: "ok", label: "적당" },
  { key: "cold", label: "추웠어요" },
];
const RECLINE: Choice<"recline"> = [
  { key: "fine", label: "잘 젖혀져요" },
  { key: "limited", label: "조금만" },
  { key: "none", label: "안 젖혀져요" },
];
const LAVATORY: Choice<"lavatory"> = [
  { key: "clean", label: "깨끗해요" },
  { key: "ok", label: "보통" },
  { key: "bad", label: "불편해요" },
];

const labelOf = <K extends keyof ReviewDetails>(choices: Choice<K>, key: ReviewDetails[K]) => choices.find((c) => c.key === key)?.label ?? "";
const VALUE_WORDS = ["", "돈 아까워요", "아쉬워요", "낸 만큼", "만족해요", "완전 이득"];

const field = "rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function ReviewsTab() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [reviews, reload] = useLoad(() => auth.repo.listReviews(), `reviews:${auth.userId}`);
  const [carrier, setCarrier] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [open, setOpen] = useState<Review | null>(null);
  const [writing, setWriting] = useState(false);
  const [toast, showToast] = useToast();

  // /reviews#write opens the composer (linked from the verification screen).
  // Waits for the session to load so the access check sees the signed-in user.
  useEffect(() => {
    if (!auth.ready || window.location.hash !== "#write") return;
    history.replaceState(null, "", "/reviews");
    setTimeout(() => requireAccess("writeReview", () => setWriting(true)), 0);
  }, [auth.ready, requireAccess]);

  const summary = airlineSummary(reviews ?? []);
  const shown = (reviews ?? []).filter((r) => (!carrier || r.carrier === carrier) && (!verifiedOnly || r.verified));
  const chip = (active: boolean) => `flex-none rounded-full px-3 py-1 ${active ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">🎫 표시는 보딩패스로 탑승을 인증한 후기예요.</p>
        <button className="flex-none rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white" onClick={() => requireAccess("writeReview", () => setWriting(true))}>
          후기 쓰기
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
        <button className={chip(verifiedOnly)} onClick={() => setVerifiedOnly(!verifiedOnly)}>
          🎫 인증 후기만
        </button>
        <button className={chip(!carrier)} onClick={() => setCarrier(null)}>
          전체 항공사
        </button>
        {summary.map((s) => (
          <button key={s.carrier} className={chip(carrier === s.carrier)} onClick={() => setCarrier(s.carrier)}>
            {airlineName(s.carrier)} ★{s.avg} ({s.count})
          </button>
        ))}
      </div>

      {reviews === null ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <ReviewItem key={r.id} review={r} onOpen={() => setOpen(r)} />
          ))}
          {shown.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">아직 후기가 없어요.</li>}
        </ul>
      )}

      {open && (
        <ReviewDetail
          review={open}
          onClose={() => setOpen(null)}
          onBlocked={() => {
            setOpen(null);
            reload();
          }}
        />
      )}

      {writing && (
        <ReviewComposer
          onClose={() => setWriting(false)}
          onSaved={async (verified) => {
            setWriting(false);
            reload();
            await auth.refreshTrust();
            showToast(verified ? "인증 후기를 올렸어요. 신뢰도가 올라갔어요." : "후기를 올렸어요.");
          }}
        />
      )}
      {toast}
    </div>
  );
}

function routeText(r: Review) {
  if (!r.from && !r.to) return r.carrier ? airlineName(r.carrier) : "탑승 정보 없음";
  return `${r.from || "?"} → ${r.to || "?"}`;
}

function VerifiedBadge({ review: r }: { review: Review }) {
  return r.verified ? (
    <span className="flex-none whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">🎫 보딩패스 인증</span>
  ) : (
    <span className="flex-none whitespace-nowrap rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">{r.isPast ? "미인증 · 과거 탑승" : "미인증"}</span>
  );
}

function feelChips(d: ReviewDetails) {
  return [
    d.seatSpace && `좌석 ${labelOf(SEAT_SPACE, d.seatSpace)}`,
    d.seatTemp && labelOf(SEAT_TEMP, d.seatTemp),
    d.recline && `등받이 ${labelOf(RECLINE, d.recline)}`,
    d.lavatory && `화장실 ${labelOf(LAVATORY, d.lavatory)}`,
  ].filter(Boolean) as string[];
}

function ReviewItem({ review: r, onOpen }: { review: Review; onOpen: () => void }) {
  const chips = feelChips(r.details);
  return (
    <li>
      <button className="w-full rounded-xl border border-zinc-200 p-4 text-left dark:border-zinc-800" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">
              {routeText(r)} {r.to && <span className="font-normal text-zinc-500">{findAirport(r.to)?.city}</span>}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {r.carrier && `${airlineName(r.carrier)} ${r.carrier}${r.flightNumber}`}
              {r.aircraft && ` · ${r.aircraft}`}
              {r.seat && ` · ${r.seat}`}
            </p>
          </div>
          <VerifiedBadge review={r} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Stars value={r.value} />
          <span className="text-xs text-zinc-500">가심비 · {VALUE_WORDS[r.value]}</span>
        </div>
        <p className="mt-1 font-medium">{r.summary}</p>
        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {c}
              </span>
            ))}
          </div>
        )}
        {r.photos.length > 0 && <p className="mt-2 text-xs text-zinc-500">📷 사진 {r.photos.length}장</p>}
        <p className="mt-2 text-xs text-zinc-500">
          {r.authorName}
          {r.flightDate && ` · ${r.flightDate} 탑승`} · 자세히 보기 ›
        </p>
      </button>
    </li>
  );
}

function ReviewDetail({ review: r, onClose, onBlocked }: { review: Review; onClose: () => void; onBlocked: () => void }) {
  const d = r.details;
  const section = (title: string, body: React.ReactNode) =>
    body ? (
      <section>
        <h3 className="mb-1 text-sm font-semibold">{title}</h3>
        <div className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{body}</div>
      </section>
    ) : null;
  const seatFeel = [feelChips({ ...d, lavatory: "" }).join(" · "), d.seatNote].filter(Boolean).join("\n");
  const lavatory = [d.lavatory && labelOf(LAVATORY, d.lavatory), d.lavatoryNote].filter(Boolean).join("\n");
  const empty = !seatFeel && !d.pros && !d.cons && !d.tips && !d.meal && !lavatory && !d.extra;

  return (
    <Sheet title={routeText(r)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm text-zinc-500">
            {r.carrier && (
              <p>
                {airlineName(r.carrier)} {r.carrier}
                {r.flightNumber}
                {r.aircraft && ` · ${r.aircraft}`}
              </p>
            )}
            <p>
              {r.flightDate && `${r.flightDate} 탑승`}
              {r.seat && ` · 좌석 ${r.seat}`}
            </p>
          </div>
          <span className="flex items-center gap-2">
            <VerifiedBadge review={r} />
            <ModerationMenu target="review" targetId={r.id} authorId={r.authorId} onBlocked={onBlocked} />
          </span>
        </div>
        {!r.verified && <p className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-500 dark:bg-zinc-900">작성자가 직접 입력한 후기예요. 보딩패스로 탑승이 확인되지는 않았어요.</p>}

        <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <Stars value={r.value} size="text-lg" />
            <span className="text-sm font-medium">가심비 {r.value}/5 · {VALUE_WORDS[r.value]}</span>
          </div>
          <p className="mt-1 font-semibold">{r.summary}</p>
        </div>

        {section("💺 좌석 체감", seatFeel)}
        {section("👍 장점", d.pros)}
        {section("👎 단점", d.cons)}
        {section("💡 팁", d.tips)}
        {section("🍱 기내식·음료", d.meal)}
        {section("🚻 화장실", lavatory)}
        {section("✍️ 하고 싶은 말", d.extra)}
        {empty && <p className="text-sm text-zinc-500">한 줄 요약만 남긴 후기예요.</p>}

        {r.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {r.photos.map((src) => (
              <MediaImage key={src} src={src} alt="후기 사진" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        )}
        <p className="text-xs text-zinc-500">
          {r.authorName} · {r.createdAt.slice(0, 10)} 작성
        </p>
      </div>
    </Sheet>
  );
}

function ChoiceRow<K extends keyof ReviewDetails>({ label, choices, value, onChange }: { label: string; choices: Choice<K>; value: ReviewDetails[K]; onChange: (v: ReviewDetails[K]) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="flex gap-1">
        {choices.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`rounded-full px-2.5 py-1 text-xs ${value === c.key ? "bg-sky-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"}`}
            onClick={() => onChange((value === c.key ? "" : c.key) as ReviewDetails[K])}
          >
            {c.label}
          </button>
        ))}
      </span>
    </div>
  );
}

type FlightMode = "verified" | "manual" | "none";

function ReviewComposer({ onClose, onSaved }: { onClose: () => void; onSaved: (verified: boolean) => void }) {
  const auth = useAuth();
  const trips = [...auth.trips].sort((a, b) => b.date.localeCompare(a.date));
  const [mode, setMode] = useState<FlightMode>(trips.length ? "verified" : "none");
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [manual, setManual] = useState({ from: "", to: "", carrier: "", flightNumber: "", flightDate: "", seat: "", isPast: true });
  const [value, setValue] = useState(0);
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState<ReviewDetails>(EMPTY_DETAILS);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trip = trips.find((t) => t.id === tripId);
  const ready = value > 0 && summary.trim().length > 0 && (mode !== "verified" || trip);
  const set = <K extends keyof ReviewDetails>(k: K, v: ReviewDetails[K]) => setDetails({ ...details, [k]: v });
  const iata = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const flight =
      mode === "verified" && trip
        ? { tripId: trip.id, isPast: false, from: trip.from, to: trip.to, carrier: trip.carrier, flightNumber: trip.flightNumber, flightDate: trip.date, seat: trip.seat }
        : mode === "manual"
          ? { tripId: null, ...manual, carrier: manual.carrier.toUpperCase() }
          : { tripId: null, isPast: false, from: "", to: "", carrier: "", flightNumber: "", flightDate: "", seat: "" };
    const trimmed = Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v.trim()])) as unknown as ReviewDetails;
    try {
      await auth.repo.createReview({ ...flight, aircraft: null, value, summary: summary.trim(), details: trimmed, photos });
      onSaved(mode === "verified");
    } catch {
      setError("올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const area = (k: "seatNote" | "pros" | "cons" | "tips" | "meal" | "lavatoryNote" | "extra", placeholder: string, rows = 2) => (
    <textarea className={`${field} w-full`} rows={rows} maxLength={1000} placeholder={placeholder} value={details[k]} onChange={(e) => set(k, e.target.value)} />
  );
  const tab = (m: FlightMode, label: string) => (
    <button type="button" className={`flex-1 rounded-lg py-1.5 text-sm ${mode === m ? "bg-white font-medium shadow-sm dark:bg-zinc-700" : "text-zinc-500"}`} onClick={() => setMode(m)}>
      {label}
    </button>
  );

  return (
    <Sheet title="후기 쓰기" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">
            가심비 <span className="text-xs font-normal text-red-500">필수</span>
          </h3>
          <StarInput label="낸 돈 대비 마음의 만족도" value={value} onChange={setValue} />
          {value > 0 && <p className="text-right text-sm text-zinc-500">{VALUE_WORDS[value]}</p>}
          <input className={field} maxLength={80} placeholder="한 줄 요약 (예: 좌석은 좁지만 이 가격이면 완전 이득)" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <p className="text-right text-xs text-zinc-400">{summary.length}/80</p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">
            탑승 정보 <span className="text-xs font-normal text-zinc-400">선택</span>
          </h3>
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {trips.length > 0 && tab("verified", "🎫 인증한 비행")}
            {tab("manual", "직접 입력")}
            {tab("none", "입력 안 함")}
          </div>
          {mode === "verified" && trip && (
            <>
              <select className={field} value={tripId} onChange={(e) => setTripId(e.target.value)}>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.date} {t.from}→{t.to} {t.carrier}
                    {t.flightNumber}
                  </option>
                ))}
              </select>
              <p className="text-xs text-sky-700 dark:text-sky-400">보딩패스로 자동 입력돼요. 이 후기에는 🎫 인증 표시가 붙어요.</p>
            </>
          )}
          {mode === "manual" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input className={field} placeholder="출발 (ICN)" value={manual.from} onChange={(e) => setManual({ ...manual, from: iata(e.target.value) })} />
                <input className={field} placeholder="도착 (BKK)" value={manual.to} onChange={(e) => setManual({ ...manual, to: iata(e.target.value) })} />
                <input className={field} placeholder="항공사 코드 (KE)" maxLength={3} value={manual.carrier} onChange={(e) => setManual({ ...manual, carrier: e.target.value.toUpperCase() })} />
                <input className={field} placeholder="편명 (651)" maxLength={5} value={manual.flightNumber} onChange={(e) => setManual({ ...manual, flightNumber: e.target.value.replace(/\D/g, "") })} />
                <input className={field} type="date" aria-label="탑승일" value={manual.flightDate} onChange={(e) => setManual({ ...manual, flightDate: e.target.value })} />
                <input className={field} placeholder="좌석 (32K)" maxLength={4} value={manual.seat} onChange={(e) => setManual({ ...manual, seat: e.target.value.toUpperCase() })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={manual.isPast} onChange={(e) => setManual({ ...manual, isPast: e.target.checked })} />
                예전에 탄 비행이에요 (보딩패스가 없어요)
              </label>
              <p className="text-xs text-zinc-500">직접 입력한 후기는 &lsquo;미인증&rsquo;으로 표시되고, 항공사 평균 점수에는 들어가지 않아요.</p>
            </>
          )}
          {mode === "none" && <p className="text-xs text-zinc-500">탑승 정보 없이 올리면 &lsquo;미인증&rsquo;으로 표시돼요.</p>}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-semibold">
            자세히 <span className="text-xs font-normal text-zinc-400">선택 · 다음 사람이 가장 궁금해하는 것들</span>
          </h3>
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm font-medium">💺 좌석 체감</p>
            <ChoiceRow label="공간" choices={SEAT_SPACE} value={details.seatSpace} onChange={(v) => set("seatSpace", v)} />
            <ChoiceRow label="온도" choices={SEAT_TEMP} value={details.seatTemp} onChange={(v) => set("seatTemp", v)} />
            <ChoiceRow label="등받이" choices={RECLINE} value={details.recline} onChange={(v) => set("recline", v)} />
            {area("seatNote", "비상구 앞줄은 등받이가 안 젖혀져요, 창가 쪽 에어컨이 세요…")}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              👍 장점
              {area("pros", "솔직하게 좋았던 점")}
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              👎 단점
              {area("cons", "솔직하게 아쉬웠던 점")}
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              💡 팁
              {area("tips", "발권·체크인 카운터 위치, 모바일 체크인, 좌석 고르는 법, 다른 항공사와 비교…", 3)}
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              🍱 기내식·음료
              {area("meal", "메뉴, 맛, 유료 여부")}
            </label>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <ChoiceRow label="🚻 화장실" choices={LAVATORY} value={details.lavatory} onChange={(v) => set("lavatory", v)} />
            {area("lavatoryNote", "크기, 청결, 줄 서는 시간…")}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium">
            ✍️ 추가로 남기고 싶은 말
            {area("extra", "", 3)}
          </label>
        </section>

        <PhotoPicker files={photos} onChange={setPhotos} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-40" disabled={!ready || busy} onClick={submit}>
          {busy ? "올리는 중…" : "후기 올리기"}
        </button>
      </div>
    </Sheet>
  );
}

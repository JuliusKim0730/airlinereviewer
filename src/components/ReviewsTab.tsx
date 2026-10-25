"use client";

import { useEffect, useState } from "react";
import { airlineName } from "@/lib/airlines";
import { findAirport } from "@/lib/airports";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Ratings, Review } from "@/lib/data/types";
import { airlineSummary } from "@/lib/stats";
import { useLoad } from "@/lib/useLoad";
import { useRequireAccess } from "./Gate";
import { MediaImage, ModerationMenu, PhotoPicker, Sheet, StarInput, Stars, useToast } from "./ui";

const RATING_LABELS: Record<keyof Ratings, string> = { seat: "좌석", meal: "기내식", service: "서비스", punctuality: "정시성" };

export default function ReviewsTab() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [reviews, reload] = useLoad(() => auth.repo.listReviews(), `reviews:${auth.userId}`);
  const [carrier, setCarrier] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [toast, showToast] = useToast();

  // /reviews#write opens the composer (linked from the verification screen).
  useEffect(() => {
    if (window.location.hash !== "#write") return;
    history.replaceState(null, "", "/reviews");
    const t = setTimeout(() => requireAccess("writeReview", () => setWriting(true)), 0);
    return () => clearTimeout(t);
  }, [requireAccess]);

  const summary = airlineSummary(reviews ?? []);
  const shown = (reviews ?? []).filter((r) => !carrier || r.carrier === carrier);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">실제로 탄 사람만 쓴 후기예요.</p>
        <button className="rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white" onClick={() => requireAccess("writeReview", () => setWriting(true))}>
          후기 쓰기
        </button>
      </div>

      {summary.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
          <button className={`flex-none rounded-full px-3 py-1 ${!carrier ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`} onClick={() => setCarrier(null)}>
            전체
          </button>
          {summary.map((s) => (
            <button
              key={s.carrier}
              className={`flex-none rounded-full px-3 py-1 ${carrier === s.carrier ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
              onClick={() => setCarrier(s.carrier)}
            >
              {airlineName(s.carrier)} ★{s.avg} ({s.count})
            </button>
          ))}
        </div>
      )}

      {reviews === null ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <ReviewItem key={r.id} review={r} onBlocked={reload} />
          ))}
          {shown.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">아직 후기가 없어요.</li>}
        </ul>
      )}

      {writing && (
        <ReviewComposer
          onClose={() => setWriting(false)}
          onSaved={async () => {
            setWriting(false);
            reload();
            await auth.refreshTrust();
            showToast("후기를 올렸어요. 신뢰도가 올라갔어요.");
          }}
        />
      )}
      {toast}
    </div>
  );
}

function ReviewItem({ review: r, onBlocked }: { review: Review; onBlocked: () => void }) {
  return (
    <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {r.from} → {r.to} <span className="font-normal text-zinc-500">{findAirport(r.to)?.city}</span>
          </p>
          <p className="text-xs text-zinc-500">
            {airlineName(r.carrier)} {r.carrier}
            {r.flightNumber}
            {r.aircraft && ` · ${r.aircraft}`}
            {r.seat && ` · ${r.seat}`}
          </p>
        </div>
        <ModerationMenu target="review" targetId={r.id} authorId={r.authorId} onBlocked={onBlocked} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Stars value={r.overall} />
        <span className="text-xs text-zinc-500">
          {(Object.keys(RATING_LABELS) as (keyof Ratings)[]).map((k) => `${RATING_LABELS[k]} ${r.ratings[k]}`).join(" · ")}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
      {r.photos.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {r.photos.map((src) => (
            <MediaImage key={src} src={src} alt="후기 사진" className="h-24 w-24 flex-none rounded-lg object-cover" />
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        {r.authorName} · <span className="text-sky-700 dark:text-sky-400">인증 탑승</span> · {r.flightDate}
      </p>
    </li>
  );
}

function ReviewComposer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const auth = useAuth();
  const [tripId, setTripId] = useState(auth.trips[0]?.id ?? "");
  const [ratings, setRatings] = useState<Ratings>({ seat: 0, meal: 0, service: 0, punctuality: 0 });
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const trip = auth.trips.find((t) => t.id === tripId);
  const rated = Object.values(ratings).every((v) => v > 0);
  const overall = rated ? Math.round((Object.values(ratings).reduce((a, b) => a + b, 0) / 4) * 2) / 2 : 0;

  async function submit() {
    if (!trip || !rated || !body.trim()) return;
    setBusy(true);
    try {
      await auth.repo.createReview({
        tripId: trip.id,
        from: trip.from,
        to: trip.to,
        carrier: trip.carrier,
        flightNumber: trip.flightNumber,
        flightDate: trip.date,
        aircraft: null,
        seat: trip.seat,
        ratings,
        overall,
        body: body.trim(),
        photos,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="후기 쓰기" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          어떤 비행이었나요?
          <select className="rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900" value={tripId} onChange={(e) => setTripId(e.target.value)}>
            {auth.trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.date} {t.from}→{t.to} {t.carrier}
                {t.flightNumber}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-2">
          {(Object.keys(RATING_LABELS) as (keyof Ratings)[]).map((k) => (
            <StarInput key={k} label={RATING_LABELS[k]} value={ratings[k]} onChange={(v) => setRatings({ ...ratings, [k]: v })} />
          ))}
          {rated && <p className="text-right text-sm text-zinc-500">종합 ★ {overall}</p>}
        </div>
        <textarea
          className="min-h-28 rounded-lg border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="좌석, 기내식, 승무원, 창밖 풍경… 다음 사람에게 도움이 될 이야기를 남겨 주세요."
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <PhotoPicker files={photos} onChange={setPhotos} />
        <button className="rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-40" disabled={!trip || !rated || !body.trim() || busy} onClick={submit}>
          {busy ? "올리는 중…" : "후기 올리기"}
        </button>
      </div>
    </Sheet>
  );
}

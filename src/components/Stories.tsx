"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMediaUrl } from "@/lib/data/media";
import type { Story } from "@/lib/data/types";
import { todayIso } from "@/lib/stay";
import { useRequireAccess } from "./Gate";
import { ModerationMenu, Sheet, useToast } from "./ui";

const IMAGE_MS = 5000;
const MAX_VIDEO_SECONDS = 30;
const MAX_BYTES = 20 * 1024 * 1024;

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60e3);
  return m < 60 ? `${Math.max(m, 1)}분 전` : `${Math.floor(m / 60)}시간 전`;
}

/** Story bubbles grouped by city, plus the "+ 올리기" entry point. */
export default function StoryStrip({ stories, onPosted }: { stories: Story[]; onPosted: () => void }) {
  const requireAccess = useRequireAccess();
  const [viewing, setViewing] = useState<Story[] | null>(null);
  const [posting, setPosting] = useState(false);
  const [toast, showToast] = useToast();
  const byCity = [...stories.reduce((m, s) => m.set(s.iata, [...(m.get(s.iata) ?? []), s]), new Map<string, Story[]>()).values()];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">지금 이 순간</h2>
        <button className="text-sm text-sky-700 dark:text-sky-400" onClick={() => requireAccess("postStory", () => setPosting(true))}>
          + 올리기
        </button>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {byCity.map((group) => (
          <li key={group[0].iata} className="flex w-16 flex-none flex-col items-center gap-1">
            <button className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-fuchsia-500 p-[3px]" onClick={() => setViewing(group)}>
              <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-medium dark:bg-zinc-900">{group[0].city}</span>
            </button>
            <span className="text-xs text-zinc-500">{ago(group[0].createdAt)}</span>
          </li>
        ))}
        {byCity.length === 0 && <li className="text-sm text-zinc-500">지금 올라온 순간이 없어요.</li>}
      </ul>
      {viewing && <StoryViewer stories={viewing} onClose={() => setViewing(null)} />}
      {posting && (
        <StoryComposer
          onClose={() => setPosting(false)}
          onPosted={() => {
            setPosting(false);
            showToast("올렸어요. 24시간 뒤에 사라져요.");
            onPosted();
          }}
        />
      )}
      {toast}
    </section>
  );
}

function StoryViewer({ stories, onClose }: { stories: Story[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const story = stories.at(index);
  const src = useMediaUrl(story?.mediaUrl || null);
  const next = () => (index + 1 < stories.length ? setIndex(index + 1) : onClose());

  // Images advance on a timer; videos advance when they end.
  useEffect(() => {
    if (!story || story.mediaType === "video") return;
    const t = setTimeout(() => (index + 1 < stories.length ? setIndex(index + 1) : onClose()), IMAGE_MS);
    return () => clearTimeout(t);
  }, [story, index, stories.length, onClose]);

  if (!story) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex gap-1 px-3 pt-3">
        {stories.map((s, i) => (
          <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded bg-white/30">
            <span
              className={`block h-full bg-white ${i < index ? "w-full" : i === index && story.mediaType === "image" ? "animate-[story_5s_linear_forwards]" : "w-0"}`}
              style={i === index && story.mediaType === "video" ? { width: "100%" } : undefined}
            />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span>
          <span className="font-semibold">{story.authorName}</span> · {story.city} · {ago(story.createdAt)}
        </span>
        <span className="flex items-center gap-3">
          <ModerationMenu target="story" targetId={story.id} authorId={story.authorId} onBlocked={onClose} />
          <button onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </span>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {!story.mediaUrl ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 p-8 text-center text-2xl font-bold">
            {story.caption}
          </div>
        ) : story.mediaType === "video" ? (
          src && <video key={src} src={src} className="max-h-full max-w-full" autoPlay playsInline onEnded={next} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- user upload
          src && <img src={src} alt={story.caption} className="max-h-full max-w-full object-contain" />
        )}
        <button className="absolute inset-y-0 left-0 w-1/3" aria-label="이전" onClick={() => setIndex(Math.max(0, index - 1))} />
        <button className="absolute inset-y-0 right-0 w-1/3" aria-label="다음" onClick={next} />
      </div>
      {story.mediaUrl && story.caption && <p className="px-4 pb-8 pt-3 text-center">{story.caption}</p>}
    </div>
  );
}

function StoryComposer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const auth = useAuth();
  const today = todayIso();
  const here = auth.stays.filter((w) => w.from <= today && today <= w.to);
  const [iata, setIata] = useState(here[0]?.iata ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (here.length === 0) {
    return (
      <Sheet title="지금 이 순간" onClose={onClose}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">지금 여행 중인 도시에서만 올릴 수 있어요. 이번 여행의 보딩패스를 인증하면 그 도시의 순간을 공유할 수 있어요.</p>
        <Link href="/verify" className="mt-4 block rounded-xl bg-sky-600 py-3 text-center font-medium text-white" onClick={onClose}>
          보딩패스 인증하기
        </Link>
      </Sheet>
    );
  }

  async function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (f.size > MAX_BYTES) return setError("20MB 이하 파일만 올릴 수 있어요.");
    if (f.type.startsWith("video/")) {
      const seconds = await new Promise<number>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => resolve(v.duration);
        v.onerror = () => resolve(0);
        v.src = URL.createObjectURL(f);
      });
      if (seconds > MAX_VIDEO_SECONDS) return setError(`영상은 ${MAX_VIDEO_SECONDS}초까지 올릴 수 있어요.`);
    }
    setFile(f);
  }

  async function submit() {
    const w = here.find((x) => x.iata === iata);
    if (!w || !file) return;
    setBusy(true);
    try {
      await auth.repo.createStory({ iata: w.iata, city: w.city, file, caption: caption.trim() });
      onPosted();
    } catch {
      setError("올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const field = "rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  return (
    <Sheet title="지금 이 순간" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {here.length > 1 && (
          <select className={field} value={iata} onChange={(e) => setIata(e.target.value)}>
            {here.map((w) => (
              <option key={w.iata} value={w.iata}>
                {w.city}
              </option>
            ))}
          </select>
        )}
        <p className="text-sm text-zinc-500">📍 {here.find((w) => w.iata === iata)?.city}에서 올리는 순간은 24시간 뒤에 사라져요.</p>
        <label className="flex h-40 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 text-sm text-zinc-500 dark:border-zinc-700">
          {file ? `${file.type.startsWith("video/") ? "🎬" : "🖼️"} ${file.name}` : "사진 또는 영상 (30초까지) 선택"}
          <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <input className={field} placeholder="한 줄 남기기 (선택)" maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-40" disabled={!file || busy} onClick={submit}>
          {busy ? "올리는 중…" : "올리기"}
        </button>
      </div>
    </Sheet>
  );
}

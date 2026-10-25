"use client";

import { useState } from "react";
import { useRequireAccess } from "@/components/Gate";
import Splash from "@/components/Splash";
import { SAMPLE_REVIEWS, SAMPLE_STORIES } from "@/lib/sampleData";

export default function Home() {
  const requireAccess = useRequireAccess();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const toggleLike = (id: string) =>
    requireAccess("react", () =>
      setLiked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    );

  return (
    <>
      <Splash />
      <div className="flex flex-col gap-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">지금 이 순간</h2>
            <button
              className="text-sm text-sky-700 dark:text-sky-400"
              onClick={() => requireAccess("postStory", () => setNotice("스토리 올리기는 다음 단계에서 열려요."))}
            >
              + 올리기
            </button>
          </div>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {SAMPLE_STORIES.map((s) => (
              <li key={s.id} className="flex w-16 flex-none flex-col items-center gap-1">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-sky-700 p-[3px]">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-xs font-medium dark:bg-zinc-900">
                    {s.city}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">{s.minutesAgo < 60 ? `${s.minutesAgo}분 전` : `${Math.floor(s.minutesAgo / 60)}시간 전`}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">인증 탑승객 후기</h2>
            <button
              className="rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white"
              onClick={() => requireAccess("writeReview", () => setNotice("후기 작성 화면은 다음 단계에서 열려요."))}
            >
              후기 쓰기
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {SAMPLE_REVIEWS.map((r) => (
              <li key={r.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{r.route}</span>
                  <span className="text-sm text-zinc-500">
                    {r.flight} · {r.aircraft} · {r.seat}
                  </span>
                </div>
                <p className="mt-2 text-sm">{r.text}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                  <span>
                    {r.author} · <span className="text-sky-700 dark:text-sky-400">인증 탑승</span> · ★ {r.rating}
                  </span>
                  <button onClick={() => toggleLike(r.id)} aria-pressed={liked.has(r.id)}>
                    {liked.has(r.id) ? "♥ 좋아요" : "♡ 좋아요"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {notice && (
          <p className="fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-white" onClick={() => setNotice(null)}>
            {notice}
          </p>
        )}
      </div>
    </>
  );
}

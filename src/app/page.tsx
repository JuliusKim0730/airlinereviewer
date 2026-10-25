"use client";

import { useState } from "react";
import { useRequireAccess } from "@/components/Gate";
import Splash from "@/components/Splash";
import TravelMap from "@/components/TravelMap";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cityActivity } from "@/lib/cityActivity";
import { SAMPLE_COMPANIONS, SAMPLE_REVIEWS, SAMPLE_STORIES } from "@/lib/sampleData";

const CITIES = cityActivity({ stories: SAMPLE_STORIES, companions: SAMPLE_COMPANIONS, reviews: SAMPLE_REVIEWS });

export default function Home() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <Splash />
      <div className="flex flex-col gap-6">
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
          <h2 className="mb-3 font-semibold">여행자들이 있는 곳</h2>
          <TravelMap cities={CITIES} routes={auth.trips} />
        </section>

        {notice && (
          <p className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-white" onClick={() => setNotice(null)}>
            {notice}
          </p>
        )}
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRequireAccess } from "@/components/Gate";
import { SAMPLE_COMPANIONS } from "@/lib/sampleData";

export default function CompanionsPage() {
  const requireAccess = useRequireAccess();
  const [notice, setNotice] = useState<string | null>(null);
  const later = () => setNotice("동행 모집·신청은 3단계에서 열려요. 지금은 권한 흐름만 연결돼 있어요.");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">부분동행</h1>
        <button className="rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white" onClick={() => requireAccess("companion", later)}>
          동행 모집
        </button>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        보딩패스로 그 도시에 가는 게 확인된 사람만 모집하고 신청할 수 있어요.
      </p>
      <ul className="flex flex-col gap-3">
        {SAMPLE_COMPANIONS.map((c) => (
          <li key={c.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{c.city}</span>
              <span className="text-sm text-zinc-500">{c.date}</span>
            </div>
            <p className="mt-1">{c.activity}</p>
            <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
              <span>
                {c.host} · {c.trust} · {c.people}
              </span>
              <button className="font-medium text-sky-700 dark:text-sky-400" onClick={() => requireAccess("companion", later)}>
                신청하기
              </button>
            </div>
          </li>
        ))}
      </ul>
      {notice && (
        <p className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-white" onClick={() => setNotice(null)}>
          {notice}
        </p>
      )}
    </div>
  );
}

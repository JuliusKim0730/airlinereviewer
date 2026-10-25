"use client";

import { useCallback, useEffect, useState } from "react";
import { useMediaUrl } from "@/lib/data/media";
import type { ReportTarget } from "@/lib/data/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRequireAccess } from "./Gate";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-sm text-zinc-500" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function useToast(): [React.ReactNode, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2600);
    return () => clearTimeout(t);
  }, [message]);
  const el = message ? (
    <p role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-white" onClick={() => setMessage(null)}>
      {message}
    </p>
  ) : null;
  return [el, useCallback((m: string) => setMessage(m), [])];
}

export function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  return (
    <span className={`${size} text-amber-500`} aria-label={`별점 ${value}`}>
      {"★".repeat(Math.round(value))}
      <span className="text-zinc-300 dark:text-zinc-600">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

export function StarInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n}점`} className={`text-2xl ${n <= value ? "text-amber-500" : "text-zinc-300 dark:text-zinc-600"}`} onClick={() => onChange(n)}>
            ★
          </button>
        ))}
      </span>
    </div>
  );
}

export function TrustBadge({ score }: { score: number }) {
  const level = score >= 80 ? 5 : score >= 60 ? 4 : score >= 40 ? 3 : score >= 20 ? 2 : 1;
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">신뢰 Lv.{level}</span>;
}

export function MediaImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const resolved = useMediaUrl(src);
  if (!resolved) return <div className={`${className} animate-pulse bg-zinc-100 dark:bg-zinc-800`} />;
  // eslint-disable-next-line @next/next/no-img-element -- user uploads (blob/object URLs), not optimisable
  return <img src={resolved} alt={alt} className={className} />;
}

export function PhotoPicker({ files, onChange, max = 4 }: { files: File[]; onChange: (files: File[]) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) => (
        <span key={i} className="relative">
          <FilePreview file={f} />
          <button type="button" className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-zinc-900 text-xs text-white" onClick={() => onChange(files.filter((_, j) => j !== i))}>
            ×
          </button>
        </span>
      ))}
      {files.length < max && (
        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-zinc-300 text-2xl text-zinc-400 dark:border-zinc-700">
          +
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onChange([...files, ...Array.from(e.target.files ?? [])].slice(0, max))} />
        </label>
      )}
    </div>
  );
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    const t = setTimeout(() => setUrl(u), 0);
    return () => {
      clearTimeout(t);
      URL.revokeObjectURL(u);
    };
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
  return url ? <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <span className="block h-16 w-16 rounded-lg bg-zinc-100" />;
}

const REASONS = ["스팸·광고", "욕설·혐오", "사기·허위 정보", "노쇼·약속 위반", "기타"];

/** "…" menu with report and block, shown on other people's content. */
export function ModerationMenu({ target, targetId, authorId, onBlocked }: { target: ReportTarget; targetId: string; authorId: string; onBlocked?: () => void }) {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [open, setOpen] = useState(false);
  const [toast, showToast] = useToast();
  if (authorId === auth.userId) return null;

  return (
    <>
      <button className="px-1 text-zinc-400" aria-label="신고·차단" onClick={() => requireAccess("react", () => setOpen(true))}>
        ⋯
      </button>
      {open && (
        <Sheet title="신고·차단" onClose={() => setOpen(false)}>
          <p className="mb-2 text-sm text-zinc-500">신고 사유</p>
          <div className="flex flex-col gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-left text-sm dark:border-zinc-700"
                onClick={async () => {
                  await auth.repo.report(target, targetId, r);
                  setOpen(false);
                  showToast("신고가 접수됐어요. 운영팀이 확인할게요.");
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            className="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
            onClick={async () => {
              await auth.repo.block(authorId);
              setOpen(false);
              showToast("차단했어요. 이 사람의 글과 동행이 더 이상 보이지 않아요.");
              onBlocked?.();
            }}
          >
            이 사람 차단하기
          </button>
        </Sheet>
      )}
      {toast}
    </>
  );
}

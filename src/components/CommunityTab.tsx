"use client";

import { useState } from "react";
import { airlineName, knownAirlines } from "@/lib/airlines";
import { findAirport } from "@/lib/airports";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Board, Post } from "@/lib/data/types";
import { cityTags } from "@/lib/cityInfo";
import { useLoad } from "@/lib/useLoad";
import { useRequireAccess } from "./Gate";
import { MediaImage, ModerationMenu, PhotoPicker, Sheet, useToast } from "./ui";

const BOARDS: { key: Board | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "city", label: "도시" },
  { key: "airline", label: "항공사" },
  { key: "free", label: "자유" },
];

// Cities offered on the city board: every destination we have travel info for.
const CITY_OPTIONS = ["BKK", "DAD", "SGN", "HAN", "CEB", "HND", "NRT", "KIX", "FUK", "TPE", "HKG", "SIN", "CJU", "CDG", "LHR", "FRA", "LAX", "JFK"].filter(
  (iata) => cityTags(iata).length > 0,
);

const tagLabel = (p: Pick<Post, "board" | "tag">) => (p.board === "city" ? findAirport(p.tag)?.city ?? p.tag : p.board === "airline" ? airlineName(p.tag) : "자유");

function timeAgo(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60e3);
  if (m < 60) return `${Math.max(m, 1)}분 전`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 60 / 24)}일 전`;
}

export default function CommunityTab() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [board, setBoard] = useState<Board | "all">("all");
  const [posts, reload] = useLoad(() => auth.repo.listPosts(board === "all" ? undefined : board), `posts:${auth.userId}:${board}`);
  const [openId, setOpenId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [toast, showToast] = useToast();
  const open = posts?.find((p) => p.id === openId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 text-sm">
          {BOARDS.map((b) => (
            <button
              key={b.key}
              className={`rounded-full px-3 py-1 ${board === b.key ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
              onClick={() => setBoard(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <button className="rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white" onClick={() => requireAccess("writePost", () => setWriting(true))}>
          글쓰기
        </button>
      </div>

      {posts === null ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.id}>
              <button className="w-full rounded-xl border border-zinc-200 p-4 text-left dark:border-zinc-800" onClick={() => setOpenId(p.id)}>
                <span className="rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-700 dark:bg-sky-950 dark:text-sky-300">{tagLabel(p)}</span>
                <p className="mt-1 font-semibold">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{p.body}</p>
                {p.photos.length > 0 && <MediaImage src={p.photos[0]} alt="" className="mt-2 h-32 w-full rounded-lg object-cover" />}
                <p className="mt-2 text-xs text-zinc-500">
                  {p.authorName} · {timeAgo(p.createdAt)} · {p.likedByMe ? "♥" : "♡"} {p.likes} · 댓글 {p.comments}
                </p>
              </button>
            </li>
          ))}
          {posts.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">첫 글을 남겨 보세요.</li>}
        </ul>
      )}

      {open && <PostDetail post={open} onClose={() => setOpenId(null)} onChanged={reload} />}
      {writing && (
        <PostComposer
          onClose={() => setWriting(false)}
          onSaved={async () => {
            setWriting(false);
            reload();
            await auth.refreshTrust();
            showToast("글을 올렸어요.");
          }}
        />
      )}
      {toast}
    </div>
  );
}

function PostDetail({ post, onClose, onChanged }: { post: Post; onClose: () => void; onChanged: () => void }) {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [comments, reloadComments] = useLoad(() => auth.repo.listComments(post.id), `comments:${post.id}`);
  const [text, setText] = useState("");

  return (
    <Sheet title={tagLabel(post)} onClose={onClose}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{post.title}</h3>
        <ModerationMenu target="post" targetId={post.id} authorId={post.authorId} onBlocked={() => (onClose(), onChanged())} />
      </div>
      <p className="text-xs text-zinc-500">
        {post.authorName} · {timeAgo(post.createdAt)}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>
      {post.photos.map((src) => (
        <MediaImage key={src} src={src} alt="게시글 사진" className="mt-3 w-full rounded-lg object-cover" />
      ))}
      <button
        className={`mt-4 rounded-full border px-3 py-1 text-sm ${post.likedByMe ? "border-rose-300 text-rose-600" : "border-zinc-300 dark:border-zinc-700"}`}
        onClick={() =>
          requireAccess("react", async () => {
            await auth.repo.toggleLike(post.id);
            onChanged();
          })
        }
      >
        {post.likedByMe ? "♥" : "♡"} 좋아요 {post.likes}
      </button>

      <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <p className="mb-2 text-sm font-semibold">댓글 {comments?.length ?? 0}</p>
        <ul className="flex flex-col gap-3">
          {(comments ?? []).map((c) => (
            <li key={c.id} className="text-sm">
              <span className="font-medium">{c.authorName}</span> <span className="text-xs text-zinc-500">{timeAgo(c.createdAt)}</span>
              <p className="whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            requireAccess("writePost", async () => {
              await auth.repo.addComment(post.id, text.trim());
              setText("");
              reloadComments();
              onChanged();
            });
          }}
        >
          <input className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" placeholder="댓글 달기" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="rounded-lg bg-sky-600 px-3 text-sm font-medium text-white">등록</button>
        </form>
      </div>
    </Sheet>
  );
}

function PostComposer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const auth = useAuth();
  const [board, setBoard] = useState<Board>("city");
  const [tag, setTag] = useState(auth.stays[0]?.iata ?? "BKK");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  function changeBoard(b: Board) {
    setBoard(b);
    setTag(b === "city" ? auth.stays[0]?.iata ?? "BKK" : b === "airline" ? auth.trips[0]?.carrier ?? "KE" : "");
  }

  async function submit() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await auth.repo.createPost({ board, tag, title: title.trim(), body: body.trim(), photos });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const field = "rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  return (
    <Sheet title="글쓰기" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <select className={field} value={board} onChange={(e) => changeBoard(e.target.value as Board)}>
            <option value="city">도시</option>
            <option value="airline">항공사</option>
            <option value="free">자유</option>
          </select>
          {board === "city" && (
            <select className={`${field} flex-1`} value={tag} onChange={(e) => setTag(e.target.value)}>
              {CITY_OPTIONS.map((iata) => (
                <option key={iata} value={iata}>
                  {findAirport(iata)?.city ?? iata}
                </option>
              ))}
            </select>
          )}
          {board === "airline" && (
            <select className={`${field} flex-1`} value={tag} onChange={(e) => setTag(e.target.value)}>
              {knownAirlines().map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <input className={field} placeholder="제목" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={`${field} min-h-32`} placeholder="여행 팁, 사진 후기, 질문을 자유롭게 남겨 주세요." maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
        <PhotoPicker files={photos} onChange={setPhotos} />
        <button className="rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-40" disabled={!title.trim() || !body.trim() || busy} onClick={submit}>
          {busy ? "올리는 중…" : "올리기"}
        </button>
      </div>
    </Sheet>
  );
}

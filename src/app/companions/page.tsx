"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRequireAccess } from "@/components/Gate";
import { ModerationMenu, Sheet, StarInput, TrustBadge, useToast } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CompanionPost } from "@/lib/data/types";
import { todayIso, windowAt } from "@/lib/stay";
import { useLoad } from "@/lib/useLoad";

const SLOTS = ["오전", "점심", "오후", "저녁", "밤"];

const dateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${"일월화수목금토"[d.getUTCDay()]})`;
};

export default function CompanionsPage() {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const [posts, reload] = useLoad(() => auth.repo.listCompanions(), `companions:${auth.userId}`);
  const [mine, reloadMine] = useLoad(() => auth.repo.myRequests(), `myrequests:${auth.userId}`);
  const [city, setCity] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [toast, showToast] = useToast();
  const today = todayIso();

  const upcoming = (posts ?? []).filter((p) => p.date >= today || p.hostId === auth.userId || mine?.some((r) => r.postId === p.id));
  const cities = [...new Map(upcoming.map((p) => [p.iata, p.city])).entries()];
  const shown = upcoming.filter((p) => !city || p.iata === city);
  const open = posts?.find((p) => p.id === openId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">부분동행</h1>
        <button className="rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white" onClick={() => requireAccess("companion", () => setWriting(true))}>
          동행 모집
        </button>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">그 날 그 도시에 있는 게 보딩패스로 확인된 사람만 모집하고 신청할 수 있어요.</p>

      {cities.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
          <button className={`flex-none rounded-full px-3 py-1 ${!city ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`} onClick={() => setCity(null)}>
            전체
          </button>
          {cities.map(([iata, name]) => (
            <button
              key={iata}
              className={`flex-none rounded-full px-3 py-1 ${city === iata ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
              onClick={() => setCity(iata)}
            >
              {name}
              {auth.stays.some((w) => w.iata === iata && w.to >= today) && " ✈"}
            </button>
          ))}
        </div>
      )}

      {posts === null ? (
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((c) => {
            const myRequest = mine?.find((r) => r.postId === c.id);
            return (
              <li key={c.id}>
                <button className="w-full rounded-xl border border-zinc-200 p-4 text-left dark:border-zinc-800" onClick={() => setOpenId(c.id)}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{c.city}</span>
                    <span className="text-sm text-zinc-500">
                      {dateLabel(c.date)} {c.timeSlot}
                    </span>
                  </div>
                  <p className="mt-1">{c.activity}</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                    <span className="flex items-center gap-2">
                      {c.hostName} <TrustBadge score={c.hostTrust} />
                    </span>
                    <span>
                      {c.status === "closed" ? "마감" : `${c.members + 1}/${c.capacity + 1}명`}
                      {c.hostId === auth.userId && " · 내 모집"}
                      {myRequest && ` · ${myRequest.status === "accepted" ? "참여 중" : myRequest.status === "pending" ? "대기 중" : "거절됨"}`}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">아직 모집 중인 동행이 없어요. 첫 모집을 열어 보세요.</li>}
        </ul>
      )}

      {open && (
        <CompanionDetail
          post={open}
          onClose={() => setOpenId(null)}
          onChanged={() => {
            reload();
            reloadMine();
          }}
          toast={showToast}
        />
      )}
      {writing && (
        <CompanionComposer
          onClose={() => setWriting(false)}
          onSaved={() => {
            setWriting(false);
            reload();
            showToast("동행 모집을 열었어요.");
          }}
        />
      )}
      {toast}
    </div>
  );
}

function CompanionComposer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const auth = useAuth();
  const today = todayIso();
  const windows = auth.stays.filter((w) => w.to >= today);
  const [windowIndex, setWindowIndex] = useState(0);
  const w = windows.at(windowIndex);
  const [date, setDate] = useState(w ? (w.from > today ? w.from : today) : today);
  const [timeSlot, setTimeSlot] = useState("저녁");
  const [activity, setActivity] = useState("");
  const [capacity, setCapacity] = useState(2);
  const [busy, setBusy] = useState(false);
  const field = "rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  if (!w) {
    return (
      <Sheet title="동행 모집" onClose={onClose}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">다가오는 여행이 없어요. 가는 비행기의 보딩패스를 인증하면 그 도시에서 동행을 모집할 수 있어요.</p>
        <Link href="/verify" className="mt-4 block rounded-xl bg-sky-600 py-3 text-center font-medium text-white" onClick={onClose}>
          보딩패스 인증하기
        </Link>
      </Sheet>
    );
  }

  const min = w.from > today ? w.from : today;
  async function submit() {
    if (!w || !activity.trim() || date < min || date > w.to) return;
    setBusy(true);
    try {
      await auth.repo.createCompanion({ iata: w.iata, city: w.city, date, timeSlot, activity: activity.trim(), capacity });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="동행 모집" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          어디서?
          <select
            className={field}
            value={windowIndex}
            onChange={(e) => {
              const i = Number(e.target.value);
              setWindowIndex(i);
              const next = windows.at(i)!;
              setDate(next.from > today ? next.from : today);
            }}
          >
            {windows.map((x, i) => (
              <option key={`${x.iata}-${x.from}`} value={i}>
                {x.city} ({x.from.slice(5)} ~ {x.to.slice(5)})
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            언제?
            <input type="date" className={field} min={min} max={w.to} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            시간대
            <select className={field} value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <input className={field} placeholder="무엇을 함께 할까요? (예: 야시장 같이 가요)" maxLength={200} value={activity} onChange={(e) => setActivity(e.target.value)} />
        <label className="flex items-center justify-between text-sm">
          함께할 인원 (나 제외)
          <select className={field} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}명
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-zinc-500">처음 만날 땐 사람이 많은 공공장소에서 만나고, 일정은 앱 채팅으로 나눠 주세요.</p>
        <button className="rounded-xl bg-sky-600 py-3 font-medium text-white disabled:opacity-40" disabled={!activity.trim() || busy} onClick={submit}>
          모집 올리기
        </button>
      </div>
    </Sheet>
  );
}

function CompanionDetail({ post, onClose, onChanged, toast }: { post: CompanionPost; onClose: () => void; onChanged: () => void; toast: (m: string) => void }) {
  const auth = useAuth();
  const requireAccess = useRequireAccess();
  const isHost = post.hostId === auth.userId;
  const [requests, reloadRequests] = useLoad(
    async () => (auth.userId ? (isHost ? auth.repo.listRequests(post.id) : (await auth.repo.myRequests()).filter((r) => r.postId === post.id)) : []),
    `requests:${post.id}:${auth.userId}`,
  );
  const [message, setMessage] = useState("");
  const myRequest = !isHost ? requests?.[0] : undefined;
  const accepted = (requests ?? []).filter((r) => r.status === "accepted");
  const inParty = isHost || myRequest?.status === "accepted";
  const eligible = !!windowAt(auth.stays, post.iata, post.date);
  const met = post.date <= todayIso();
  const full = post.members >= post.capacity;

  const refresh = () => {
    reloadRequests();
    onChanged();
  };

  return (
    <Sheet title={`${post.city} 동행`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-start justify-between">
            <p className="text-lg font-semibold">{post.activity}</p>
            <ModerationMenu target="companion" targetId={post.id} authorId={post.hostId} onBlocked={() => (onClose(), onChanged())} />
          </div>
          <p className="text-sm text-zinc-500">
            {dateLabel(post.date)} {post.timeSlot} · {post.members + 1}/{post.capacity + 1}명
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm">
            모집자 {post.hostName} <TrustBadge score={post.hostTrust} />
          </p>
        </div>

        {isHost && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">신청 {requests?.length ?? 0}</h3>
            <ul className="flex flex-col gap-2">
              {(requests ?? []).map((r) => (
                <li key={r.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      {r.userName} <TrustBadge score={r.userTrust} />
                    </span>
                    {r.status === "pending" ? (
                      <span className="flex gap-2">
                        <button className="text-zinc-500" onClick={async () => (await auth.repo.respondRequest(r.id, false), refresh())}>
                          거절
                        </button>
                        <button className="font-medium text-sky-700 dark:text-sky-400" onClick={async () => (await auth.repo.respondRequest(r.id, true), refresh())}>
                          수락
                        </button>
                      </span>
                    ) : (
                      <span className="text-zinc-500">{r.status === "accepted" ? "함께해요" : "거절함"}</span>
                    )}
                  </div>
                  {r.message && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{r.message}</p>}
                </li>
              ))}
            </ul>
            {post.status === "open" && (
              <button className="mt-3 text-sm text-zinc-500 underline" onClick={async () => (await auth.repo.closeCompanion(post.id), onChanged(), toast("모집을 마감했어요."))}>
                모집 마감하기
              </button>
            )}
          </section>
        )}

        {!isHost && !myRequest && post.status === "open" && (
          <section className="flex flex-col gap-2">
            {auth.account !== "none" && !eligible ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {dateLabel(post.date)}에 {post.city}에 있는 보딩패스가 있어야 신청할 수 있어요.{" "}
                <Link href="/verify" className="underline">
                  인증하러 가기
                </Link>
              </p>
            ) : full ? (
              <p className="text-sm text-zinc-500">인원이 다 찼어요.</p>
            ) : (
              <>
                <input className="rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" placeholder="간단한 인사 (선택)" maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} />
                <button
                  className="rounded-xl bg-sky-600 py-3 font-medium text-white"
                  onClick={() =>
                    requireAccess("companion", async () => {
                      await auth.repo.requestJoin(post.id, message.trim());
                      refresh();
                      toast("신청했어요. 모집자가 수락하면 채팅이 열려요.");
                    })
                  }
                >
                  동행 신청하기
                </button>
              </>
            )}
          </section>
        )}
        {myRequest?.status === "pending" && <p className="text-sm text-zinc-500">모집자의 수락을 기다리고 있어요.</p>}
        {myRequest?.status === "declined" && <p className="text-sm text-zinc-500">아쉽게도 이번엔 함께하지 못하게 됐어요.</p>}

        {inParty && met && (
          <RatePanel
            postId={post.id}
            people={isHost ? accepted.map((r) => ({ id: r.userId, name: r.userName })) : [{ id: post.hostId, name: post.hostName }]}
            onRated={() => toast("평가를 남겼어요. 서로의 신뢰도에 반영돼요.")}
          />
        )}
        {inParty && (isHost ? accepted.length > 0 : true) && <Chat postId={post.id} />}
      </div>
    </Sheet>
  );
}

function RatePanel({ postId, people, onRated }: { postId: string; people: { id: string; name: string }[]; onRated: () => void }) {
  const auth = useAuth();
  const [given, reload] = useLoad(() => auth.repo.ratingsBy(postId), `ratings:${postId}:${auth.userId}`);
  const [scores, setScores] = useState<Record<string, number>>({});
  if (people.length === 0) return null;

  return (
    <section className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950">
      <h3 className="text-sm font-semibold">동행은 어땠나요?</h3>
      <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">평가는 상대의 신뢰도에 반영돼요. 노쇼는 신뢰도가 크게 깎여요.</p>
      {people.map((p) => {
        const done = given?.find((g) => g.rateeId === p.id);
        return (
          <div key={p.id} className="border-t border-emerald-100 py-2 first:border-0 dark:border-emerald-900">
            {done ? (
              <p className="text-sm">
                {p.name}: {done.showedUp ? `★ ${done.score}` : "노쇼로 신고함"}
              </p>
            ) : (
              <>
                <StarInput label={p.name} value={scores[p.id] ?? 0} onChange={(v) => setScores({ ...scores, [p.id]: v })} />
                <div className="mt-1 flex justify-end gap-3 text-sm">
                  <button className="text-rose-600" onClick={async () => (await auth.repo.rateCompanion(postId, p.id, 1, false), reload(), onRated())}>
                    안 나왔어요
                  </button>
                  <button
                    className="font-medium text-emerald-700 disabled:opacity-40 dark:text-emerald-300"
                    disabled={!scores[p.id]}
                    onClick={async () => (await auth.repo.rateCompanion(postId, p.id, scores[p.id], true), reload(), onRated())}
                  >
                    평가 남기기
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}

function Chat({ postId }: { postId: string }) {
  const auth = useAuth();
  const [messages, reload] = useLoad(() => auth.repo.listMessages(postId), `messages:${postId}`);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = auth.repo.onMessages(postId, reload);
    return () => off();
  }, [auth.repo, postId, reload]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">동행 채팅</h3>
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
        {(messages ?? []).map((m) => {
          const mine = m.authorId === auth.userId;
          return (
            <div key={m.id} className={`max-w-[80%] ${mine ? "self-end text-right" : "self-start"}`}>
              {!mine && <p className="text-xs text-zinc-500">{m.authorName}</p>}
              <p className={`inline-block rounded-2xl px-3 py-2 text-sm ${mine ? "bg-sky-600 text-white" : "bg-white dark:bg-zinc-900"}`}>{m.body}</p>
            </div>
          );
        })}
        {messages?.length === 0 && <p className="text-center text-xs text-zinc-500">첫 인사를 건네 보세요.</p>}
        <div ref={endRef} />
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          await auth.repo.sendMessage(postId, text.trim());
          setText("");
        }}
      >
        <input className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" placeholder="메시지" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="rounded-lg bg-sky-600 px-3 text-sm font-medium text-white">전송</button>
      </form>
    </section>
  );
}

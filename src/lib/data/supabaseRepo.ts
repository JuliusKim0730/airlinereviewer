import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareImage } from "./media";
import type { Repo } from "./repo";
import type { CurrentUser } from "./localRepo";
import { normalizeReview, type Comment, type CompanionPost, type CompanionRating, type CompanionRequest, type Expense, type Message, type Post, type Review, type ReviewDetails, type Story } from "./types";

// Column names follow supabase/migrations. Rows are mapped to the app's camelCase types here.

type Row = Record<string, unknown>;

const s = (v: unknown) => (v ?? "") as string;
const n = (v: unknown) => Number(v ?? 0);

const toReview = (r: Row): Review =>
  normalizeReview({
    id: s(r.id),
    authorId: s(r.author_id),
    authorName: s((r.profiles as Row | null)?.nickname),
    tripId: (r.trip_id as string | null) ?? null,
    verified: Boolean(r.verified),
    isPast: Boolean(r.is_past),
    from: s(r.dep_iata),
    to: s(r.arr_iata),
    carrier: s(r.carrier),
    flightNumber: s(r.flight_number),
    flightDate: s(r.flight_date),
    aircraft: (r.aircraft as string | null) ?? null,
    seat: s(r.seat),
    value: n(r.value),
    summary: s(r.summary),
    details: (r.details as ReviewDetails | null) ?? undefined,
    photos: (r.photos as string[] | null) ?? [],
    createdAt: s(r.created_at),
  });

const toComment = (r: Row): Comment => ({
  id: s(r.id),
  postId: s(r.post_id),
  authorId: s(r.author_id),
  authorName: s((r.profiles as Row | null)?.nickname),
  body: s(r.body),
  createdAt: s(r.created_at),
});

const toRequest = (r: Row): CompanionRequest => ({
  id: s(r.id),
  postId: s(r.post_id),
  userId: s(r.user_id),
  userName: s((r.profiles as Row | null)?.nickname),
  userTrust: n(r.user_trust),
  message: s(r.message),
  status: r.status as CompanionRequest["status"],
  createdAt: s(r.created_at),
});

const toMessage = (r: Row): Message => ({
  id: s(r.id),
  postId: s(r.post_id),
  authorId: s(r.author_id),
  authorName: s((r.profiles as Row | null)?.nickname),
  body: s(r.body),
  createdAt: s(r.created_at),
});

function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

export function createSupabaseRepo(sb: SupabaseClient, currentUser: () => CurrentUser | null): Repo {
  const me = () => {
    const user = currentUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    return user;
  };

  async function upload(file: Blob): Promise<string> {
    const user = me();
    const blob = await prepareImage(file);
    const ext = blob.type.split("/")[1]?.split(";")[0] ?? "bin";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    check(await sb.storage.from("media").upload(path, blob, { contentType: blob.type }));
    return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  return {
    async listReviews() {
      return check(await sb.from("reviews").select("*, profiles(nickname)").order("created_at", { ascending: false }).limit(100)).map(toReview);
    },
    async createReview(input) {
      const user = me();
      const photos = await Promise.all(input.photos.map(upload));
      check(
        await sb.from("reviews").insert({
          author_id: user.id,
          trip_id: input.tripId,
          is_past: input.isPast,
          dep_iata: input.from,
          arr_iata: input.to,
          carrier: input.carrier,
          flight_number: input.flightNumber,
          flight_date: input.flightDate || null,
          aircraft: input.aircraft,
          seat: input.seat,
          value: input.value,
          summary: input.summary,
          details: input.details,
          photos,
        }),
      );
    },

    async listPosts(board) {
      const user = currentUser();
      let q = sb.from("posts_with_counts").select("*, profiles(nickname)").order("created_at", { ascending: false }).limit(100);
      if (board) q = q.eq("board", board);
      const rows = check(await q) as Row[];
      const liked = new Set<string>();
      if (user && rows.length) {
        const mine = check(await sb.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", rows.map((r) => r.id as string))) as Row[];
        mine.forEach((l) => liked.add(l.post_id as string));
      }
      return rows.map(
        (r): Post => ({
          id: s(r.id),
          authorId: s(r.author_id),
          authorName: s((r.profiles as Row | null)?.nickname),
          board: r.board as Post["board"],
          tag: s(r.tag),
          title: s(r.title),
          body: s(r.body),
          photos: (r.photos as string[] | null) ?? [],
          likes: n(r.like_count),
          likedByMe: liked.has(s(r.id)),
          comments: n(r.comment_count),
          createdAt: s(r.created_at),
        }),
      );
    },
    async createPost(input) {
      const user = me();
      const photos = await Promise.all(input.photos.map(upload));
      check(await sb.from("posts").insert({ author_id: user.id, board: input.board, tag: input.tag, title: input.title, body: input.body, photos }));
    },
    async toggleLike(postId) {
      const user = me();
      const existing = check(await sb.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", user.id)) as Row[];
      if (existing.length) check(await sb.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id));
      else check(await sb.from("post_likes").insert({ post_id: postId, user_id: user.id }));
    },
    async listComments(postId) {
      return (check(await sb.from("comments").select("*, profiles(nickname)").eq("post_id", postId).order("created_at")) as Row[]).map(toComment);
    },
    async addComment(postId, body) {
      check(await sb.from("comments").insert({ post_id: postId, author_id: me().id, body }));
    },

    async listCompanions() {
      const rows = check(await sb.from("companions_with_members").select("*, profiles(nickname)").order("meet_date")) as Row[];
      return rows.map(
        (r): CompanionPost => ({
          id: s(r.id),
          hostId: s(r.host_id),
          hostName: s((r.profiles as Row | null)?.nickname),
          hostTrust: n(r.host_trust),
          iata: s(r.iata),
          city: s(r.city),
          date: s(r.meet_date),
          timeSlot: s(r.time_slot),
          activity: s(r.activity),
          capacity: n(r.capacity),
          members: n(r.member_count),
          status: r.status as CompanionPost["status"],
          createdAt: s(r.created_at),
        }),
      );
    },
    async createCompanion(input) {
      const user = me();
      check(
        await sb.from("companion_posts").insert({
          host_id: user.id,
          host_trust: user.trust,
          iata: input.iata,
          city: input.city,
          meet_date: input.date,
          time_slot: input.timeSlot,
          activity: input.activity,
          capacity: input.capacity,
        }),
      );
    },
    async closeCompanion(postId) {
      check(await sb.from("companion_posts").update({ status: "closed" }).eq("id", postId));
    },
    async listRequests(postId) {
      return (check(await sb.from("companion_requests").select("*, profiles(nickname)").eq("post_id", postId)) as Row[]).map(toRequest);
    },
    async myRequests() {
      const user = currentUser();
      if (!user) return [];
      return (check(await sb.from("companion_requests").select("*, profiles(nickname)").eq("user_id", user.id)) as Row[]).map(toRequest);
    },
    async requestJoin(postId, message) {
      const user = me();
      check(await sb.from("companion_requests").upsert({ post_id: postId, user_id: user.id, user_trust: user.trust, message }, { onConflict: "post_id,user_id", ignoreDuplicates: true }));
    },
    async respondRequest(requestId, accept) {
      check(await sb.from("companion_requests").update({ status: accept ? "accepted" : "declined" }).eq("id", requestId));
    },
    async listMessages(postId) {
      return (check(await sb.from("companion_messages").select("*, profiles(nickname)").eq("post_id", postId).order("created_at")) as Row[]).map(toMessage);
    },
    async sendMessage(postId, body) {
      check(await sb.from("companion_messages").insert({ post_id: postId, author_id: me().id, body }));
    },
    onMessages(postId, listener) {
      const channel = sb
        .channel(`messages:${postId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "companion_messages", filter: `post_id=eq.${postId}` }, () => listener())
        .subscribe();
      return () => {
        sb.removeChannel(channel);
      };
    },
    async rateCompanion(postId, rateeId, score, showedUp) {
      check(await sb.from("companion_ratings").upsert({ post_id: postId, rater_id: me().id, ratee_id: rateeId, score, showed_up: showedUp }, { onConflict: "post_id,rater_id,ratee_id" }));
    },
    async ratingsBy(postId) {
      const user = currentUser();
      if (!user) return [];
      const rows = check(await sb.from("companion_ratings").select("*").eq("post_id", postId).eq("rater_id", user.id)) as Row[];
      return rows.map(
        (r): CompanionRating => ({
          id: s(r.id),
          postId: s(r.post_id),
          raterId: s(r.rater_id),
          rateeId: s(r.ratee_id),
          score: n(r.score),
          showedUp: Boolean(r.showed_up),
          createdAt: s(r.created_at),
        }),
      );
    },

    async listStories() {
      const rows = check(await sb.from("stories").select("*, profiles(nickname)").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false })) as Row[];
      return rows.map(
        (r): Story => ({
          id: s(r.id),
          iata: s(r.iata),
          city: s(r.city),
          authorId: s(r.author_id),
          authorName: s((r.profiles as Row | null)?.nickname),
          mediaUrl: s(r.media_url),
          mediaType: r.media_type as Story["mediaType"],
          caption: s(r.caption),
          createdAt: s(r.created_at),
          expiresAt: s(r.expires_at),
        }),
      );
    },
    async createStory({ iata, city, file, caption }) {
      const user = me();
      const url = await upload(file);
      check(await sb.from("stories").insert({ author_id: user.id, iata, city, media_url: url, media_type: file.type.startsWith("video/") ? "video" : "image", caption }));
    },

    async listExpenses() {
      const user = currentUser();
      if (!user) return [];
      const rows = check(await sb.from("expenses").select("*").eq("user_id", user.id)) as Row[];
      return rows.map(
        (r): Expense => ({
          id: s(r.id),
          tripId: s(r.trip_id),
          category: r.category as Expense["category"],
          amount: n(r.amount),
          currency: s(r.currency),
          memo: s(r.memo),
          createdAt: s(r.created_at),
        }),
      );
    },
    async addExpense(input) {
      check(await sb.from("expenses").insert({ user_id: me().id, trip_id: input.tripId, category: input.category, amount: input.amount, currency: input.currency, memo: input.memo }));
    },
    async deleteExpense(expenseId) {
      check(await sb.from("expenses").delete().eq("id", expenseId));
    },

    async report(target, targetId, reason) {
      check(await sb.from("reports").insert({ reporter_id: me().id, target_type: target, target_id: targetId, reason }));
    },
    async block(userId) {
      check(await sb.from("blocks").upsert({ user_id: me().id, blocked_id: userId }, { onConflict: "user_id,blocked_id", ignoreDuplicates: true }));
    },
    async blockedIds() {
      const user = currentUser();
      if (!user) return [];
      return (check(await sb.from("blocks").select("blocked_id").eq("user_id", user.id)) as Row[]).map((r) => s(r.blocked_id));
    },

    async trustInputs(userId) {
      const row = check(await sb.rpc("trust_inputs", { target: userId })) as Row | null;
      return {
        ratings: ((row?.ratings as Row[] | null) ?? []).map((r) => ({ score: n(r.score), showedUp: Boolean(r.showed_up) })),
        reviews: n(row?.reviews),
        posts: n(row?.posts),
        reports: n(row?.reports),
      };
    },
    async setNickname(nickname) {
      check(await sb.from("profiles").update({ nickname }).eq("id", me().id));
    },
  };
}

// Development-mode repository: localStorage tables plus IndexedDB media.
// Only this browser sees the data, but every flow works end to end.

import { deleteLocalMedia, prepareImage, putLocalMedia } from "./media";
import type { Repo } from "./repo";
import { seedCompanions, seedPosts, seedReviews, seedStories } from "./seed";
import { normalizeReview, type Comment, type CompanionPost, type CompanionRating, type CompanionRequest, type Expense, type Message, type Post, type Review, type Story } from "./types";

export interface CurrentUser {
  id: string;
  name: string;
  trust: number;
  /** Ids of this user's verified trips. */
  tripIds: string[];
}

interface Like {
  postId: string;
  userId: string;
}

interface ReportRow {
  id: string;
  reporterId: string;
  target: string;
  targetId: string;
  reason: string;
}

interface BlockRow {
  userId: string;
  blockedId: string;
}

const PREFIX = "tview.";

function table<T>(name: string, seed?: () => T[]) {
  const key = PREFIX + name;
  const all = (): T[] => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T[];
    } catch {
      // fall through to seed
    }
    const rows = seed ? seed() : [];
    if (seed) save(rows);
    return rows;
  };
  const save = (rows: T[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(rows));
    } catch {
      // Storage full or blocked; the change is lost for this session.
    }
  };
  return {
    all,
    save,
    insert(row: T) {
      save([...all(), row]);
    },
    update(match: (row: T) => boolean, patch: Partial<T>) {
      save(all().map((r) => (match(r) ? { ...r, ...patch } : r)));
    },
    remove(match: (row: T) => boolean) {
      save(all().filter((r) => !match(r)));
    },
  };
}

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const newestFirst = <T extends { createdAt: string }>(rows: T[]) => [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function createLocalRepo(currentUser: () => CurrentUser | null): Repo {
  const reviews = table<Review>("reviews", seedReviews);
  const posts = table<Omit<Post, "likedByMe" | "likes" | "comments">>("posts", () => seedPosts().map(({ likedByMe: _l, likes: _n, comments: _c, ...p }) => p));
  const likes = table<Like>("likes");
  const comments = table<Comment>("comments");
  const companions = table<Omit<CompanionPost, "members">>("companions", () => seedCompanions().map(({ members: _m, ...c }) => c));
  const requests = table<CompanionRequest>("requests");
  const messages = table<Message>("messages");
  const ratings = table<CompanionRating>("ratings");
  const stories = table<Story>("stories");
  const expenses = table<Expense & { userId: string }>("expenses");
  const reports = table<ReportRow>("reports");
  const blocks = table<BlockRow>("blocks");
  const messageListeners = new Map<string, Set<() => void>>();

  const me = () => {
    const user = currentUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    return user;
  };
  const uploadAll = async (files: Blob[]) => Promise.all(files.map(async (f) => putLocalMedia(await prepareImage(f))));
  const blocked = () => {
    const user = currentUser();
    return new Set(user ? blocks.all().filter((b) => b.userId === user.id).map((b) => b.blockedId) : []);
  };

  return {
    async listReviews() {
      const hidden = blocked();
      return newestFirst(reviews.all().map(normalizeReview).filter((r) => !hidden.has(r.authorId)));
    },
    async createReview(input) {
      const user = me();
      // Only a trip from this account's own verified list makes a review "verified".
      const verified = Boolean(input.tripId && user.tripIds.includes(input.tripId));
      reviews.insert({ ...input, tripId: verified ? input.tripId : null, verified, id: id(), authorId: user.id, authorName: user.name, photos: await uploadAll(input.photos), createdAt: now() });
    },

    async listPosts(board) {
      const user = currentUser();
      const hidden = blocked();
      const allLikes = likes.all();
      const allComments = comments.all();
      const sampleLikes = new Map(seedPosts().map((p) => [p.id, p.likes]));
      return newestFirst(
        posts
          .all()
          .filter((p) => (!board || p.board === board) && !hidden.has(p.authorId))
          .map((p) => ({
            ...p,
            likes: (sampleLikes.get(p.id) ?? 0) + allLikes.filter((l) => l.postId === p.id).length,
            likedByMe: !!user && allLikes.some((l) => l.postId === p.id && l.userId === user.id),
            comments: allComments.filter((c) => c.postId === p.id).length,
          })),
      );
    },
    async createPost(input) {
      const user = me();
      posts.insert({ ...input, id: id(), authorId: user.id, authorName: user.name, photos: await uploadAll(input.photos), createdAt: now() });
    },
    async toggleLike(postId) {
      const user = me();
      const mine = (l: Like) => l.postId === postId && l.userId === user.id;
      if (likes.all().some(mine)) likes.remove(mine);
      else likes.insert({ postId, userId: user.id });
    },
    async listComments(postId) {
      const hidden = blocked();
      return comments
        .all()
        .filter((c) => c.postId === postId && !hidden.has(c.authorId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async addComment(postId, body) {
      const user = me();
      comments.insert({ id: id(), postId, authorId: user.id, authorName: user.name, body, createdAt: now() });
    },

    async listCompanions() {
      const hidden = blocked();
      const allRequests = requests.all();
      const sampleMembers = new Map(seedCompanions().map((c) => [c.id, c.members]));
      return newestFirst(
        companions
          .all()
          .filter((c) => !hidden.has(c.hostId))
          .map((c) => ({
            ...c,
            members: (sampleMembers.get(c.id) ?? 0) + allRequests.filter((r) => r.postId === c.id && r.status === "accepted").length,
          })),
      ).sort((a, b) => a.date.localeCompare(b.date));
    },
    async createCompanion(input) {
      const user = me();
      companions.insert({ ...input, id: id(), hostId: user.id, hostName: user.name, hostTrust: user.trust, status: "open", createdAt: now() });
    },
    async closeCompanion(postId) {
      const user = me();
      companions.update((c) => c.id === postId && c.hostId === user.id, { status: "closed" });
    },
    async listRequests(postId) {
      return requests.all().filter((r) => r.postId === postId);
    },
    async myRequests() {
      const user = currentUser();
      return user ? requests.all().filter((r) => r.userId === user.id) : [];
    },
    async requestJoin(postId, message) {
      const user = me();
      if (requests.all().some((r) => r.postId === postId && r.userId === user.id)) return;
      // Sample hosts can't answer, so they accept right away and say hello (development mode only).
      const host = companions.all().find((c) => c.id === postId);
      const sampleHost = host?.hostId.startsWith("sample-");
      requests.insert({ id: id(), postId, userId: user.id, userName: user.name, userTrust: user.trust, message, status: sampleHost ? "accepted" : "pending", createdAt: now() });
      if (host && sampleHost) {
        messages.insert({ id: id(), postId, authorId: host.hostId, authorName: host.hostName, body: `반가워요 ${user.name}님! ${host.timeSlot}에 만나요 😊`, createdAt: now() });
      }
    },
    async respondRequest(requestId, accept) {
      const user = me();
      const req = requests.all().find((r) => r.id === requestId);
      const post = companions.all().find((c) => c.id === req?.postId);
      if (!req || post?.hostId !== user.id) throw new Error("모집자만 수락할 수 있어요.");
      requests.update((r) => r.id === requestId, { status: accept ? "accepted" : "declined" });
    },
    async listMessages(postId) {
      return messages
        .all()
        .filter((m) => m.postId === postId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async sendMessage(postId, body) {
      const user = me();
      messages.insert({ id: id(), postId, authorId: user.id, authorName: user.name, body, createdAt: now() });
      messageListeners.get(postId)?.forEach((l) => l());
    },
    onMessages(postId, listener) {
      const set = messageListeners.get(postId) ?? new Set();
      set.add(listener);
      messageListeners.set(postId, set);
      return () => set.delete(listener);
    },
    async rateCompanion(postId, rateeId, score, showedUp) {
      const user = me();
      ratings.remove((r) => r.postId === postId && r.raterId === user.id && r.rateeId === rateeId);
      ratings.insert({ id: id(), postId, raterId: user.id, rateeId, score, showedUp, createdAt: now() });
    },
    async ratingsBy(postId) {
      const user = currentUser();
      return user ? ratings.all().filter((r) => r.postId === postId && r.raterId === user.id) : [];
    },

    async listStories() {
      const t = now();
      const expired = stories.all().filter((s) => s.expiresAt <= t);
      if (expired.length) {
        await Promise.all(expired.map((s) => deleteLocalMedia(s.mediaUrl)));
        stories.remove((s) => s.expiresAt <= t);
      }
      const hidden = blocked();
      return newestFirst([...stories.all(), ...seedStories()].filter((s) => !hidden.has(s.authorId)));
    },
    async createStory({ iata, city, file, caption }) {
      const user = me();
      const createdAt = now();
      stories.insert({
        id: id(),
        iata,
        city,
        authorId: user.id,
        authorName: user.name,
        mediaUrl: await putLocalMedia(await prepareImage(file)),
        mediaType: file.type.startsWith("video/") ? "video" : "image",
        caption,
        createdAt,
        expiresAt: new Date(Date.parse(createdAt) + 864e5).toISOString(),
      });
    },

    async listExpenses() {
      const user = currentUser();
      return user ? expenses.all().filter((e) => e.userId === user.id) : [];
    },
    async addExpense(input) {
      const user = me();
      expenses.insert({ ...input, id: id(), userId: user.id, createdAt: now() });
    },
    async deleteExpense(expenseId) {
      const user = me();
      expenses.remove((e) => e.id === expenseId && e.userId === user.id);
    },

    async report(target, targetId, reason) {
      const user = me();
      reports.insert({ id: id(), reporterId: user.id, target, targetId, reason });
    },
    async block(userId) {
      const user = me();
      if (!blocks.all().some((b) => b.userId === user.id && b.blockedId === userId)) blocks.insert({ userId: user.id, blockedId: userId });
    },
    async blockedIds() {
      return [...blocked()];
    },

    async trustInputs(userId) {
      return {
        ratings: ratings.all().filter((r) => r.rateeId === userId).map((r) => ({ score: r.score, showedUp: r.showedUp })),
        reviews: reviews.all().filter((r) => r.authorId === userId).length,
        posts: posts.all().filter((p) => p.authorId === userId).length,
        // Reports count once a moderator upholds them; development mode has no moderators.
        reports: 0,
      };
    },
    async setNickname() {
      // Handled by the local auth backend, which owns the session record.
    },
  };
}

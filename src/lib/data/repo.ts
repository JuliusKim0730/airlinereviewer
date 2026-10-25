import type {
  Comment,
  CompanionPost,
  CompanionRating,
  CompanionRequest,
  Expense,
  Message,
  NewCompanionPost,
  NewPost,
  NewReview,
  Post,
  ReportTarget,
  Review,
  Story,
  Board,
} from "./types";

/** Everything the app reads and writes besides the session itself. */
export interface Repo {
  listReviews(): Promise<Review[]>;
  createReview(input: NewReview): Promise<void>;

  listPosts(board?: Board): Promise<Post[]>;
  createPost(input: NewPost): Promise<void>;
  toggleLike(postId: string): Promise<void>;
  listComments(postId: string): Promise<Comment[]>;
  addComment(postId: string, body: string): Promise<void>;

  listCompanions(): Promise<CompanionPost[]>;
  createCompanion(input: NewCompanionPost): Promise<void>;
  closeCompanion(postId: string): Promise<void>;
  listRequests(postId: string): Promise<CompanionRequest[]>;
  myRequests(): Promise<CompanionRequest[]>;
  requestJoin(postId: string, message: string): Promise<void>;
  respondRequest(requestId: string, accept: boolean): Promise<void>;
  listMessages(postId: string): Promise<Message[]>;
  sendMessage(postId: string, body: string): Promise<void>;
  onMessages(postId: string, listener: () => void): () => void;
  rateCompanion(postId: string, rateeId: string, score: number, showedUp: boolean): Promise<void>;
  ratingsBy(postId: string): Promise<CompanionRating[]>;

  listStories(): Promise<Story[]>;
  createStory(input: { iata: string; city: string; file: Blob; caption: string }): Promise<void>;

  listExpenses(): Promise<Expense[]>;
  addExpense(input: Omit<Expense, "id" | "createdAt">): Promise<void>;
  deleteExpense(id: string): Promise<void>;

  report(target: ReportTarget, targetId: string, reason: string): Promise<void>;
  block(userId: string): Promise<void>;
  blockedIds(): Promise<string[]>;

  /** Inputs for the trust score of any user. */
  trustInputs(userId: string): Promise<{ ratings: { score: number; showedUp: boolean }[]; reviews: number; posts: number; reports: number }>;
  setNickname(nickname: string): Promise<void>;
}

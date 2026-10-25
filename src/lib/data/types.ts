export interface Author {
  authorId: string;
  authorName: string;
}

/** Structured "how it felt" answers. Empty string means the reviewer skipped it. */
export interface ReviewDetails {
  seatSpace: "" | "roomy" | "ok" | "tight";
  seatTemp: "" | "hot" | "ok" | "cold";
  recline: "" | "fine" | "limited" | "none";
  seatNote: string;
  pros: string;
  cons: string;
  /** Check-in counter location, boarding, seat picks, etc. */
  tips: string;
  meal: string;
  lavatory: "" | "clean" | "ok" | "bad";
  lavatoryNote: string;
  extra: string;
}

export const EMPTY_DETAILS: ReviewDetails = {
  seatSpace: "",
  seatTemp: "",
  recline: "",
  seatNote: "",
  pros: "",
  cons: "",
  tips: "",
  meal: "",
  lavatory: "",
  lavatoryNote: "",
  extra: "",
};

export interface Review extends Author {
  id: string;
  /** Set when the review is tied to a boarding pass this author verified. */
  tripId: string | null;
  verified: boolean;
  /** Written from memory about an older flight. */
  isPast: boolean;
  /** Flight fields are optional for unverified reviews; empty string when unknown. */
  from: string;
  to: string;
  carrier: string;
  flightNumber: string;
  flightDate: string;
  aircraft: string | null;
  seat: string;
  /** 가심비: satisfaction for the money, 1-5. Required. */
  value: number;
  /** One-line summary. Required. */
  summary: string;
  details: ReviewDetails;
  photos: string[];
  createdAt: string;
}

export type NewReview = Omit<Review, "id" | "createdAt" | "authorId" | "authorName" | "photos" | "verified"> & { photos: Blob[] };

/** Fills fields missing from reviews saved by older versions of the app. */
export function normalizeReview(r: Partial<Review> & { overall?: number; body?: string }): Review {
  return {
    id: r.id ?? "",
    authorId: r.authorId ?? "",
    authorName: r.authorName ?? "",
    tripId: r.tripId ?? null,
    verified: r.verified ?? Boolean(r.tripId),
    isPast: r.isPast ?? false,
    from: r.from ?? "",
    to: r.to ?? "",
    carrier: r.carrier ?? "",
    flightNumber: r.flightNumber ?? "",
    flightDate: r.flightDate ?? "",
    aircraft: r.aircraft ?? null,
    seat: r.seat ?? "",
    value: r.value ?? Math.round(r.overall ?? 0),
    summary: r.summary ?? (r.body ?? "").split("\n")[0].slice(0, 80),
    details: { ...EMPTY_DETAILS, ...r.details, ...(r.body && !r.details ? { extra: r.body } : {}) },
    photos: r.photos ?? [],
    createdAt: r.createdAt ?? "",
  };
}

export type Board = "city" | "airline" | "free";

export interface Post extends Author {
  id: string;
  board: Board;
  /** City IATA for the city board, carrier code for the airline board, empty for free. */
  tag: string;
  title: string;
  body: string;
  photos: string[];
  likes: number;
  likedByMe: boolean;
  comments: number;
  createdAt: string;
}

export type NewPost = Pick<Post, "board" | "tag" | "title" | "body"> & { photos: Blob[] };

export interface Comment extends Author {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
}

export interface CompanionPost {
  id: string;
  hostId: string;
  hostName: string;
  hostTrust: number;
  iata: string;
  city: string;
  date: string;
  timeSlot: string;
  activity: string;
  capacity: number;
  /** Accepted members, host excluded. */
  members: number;
  status: "open" | "closed";
  createdAt: string;
}

export type NewCompanionPost = Pick<CompanionPost, "iata" | "city" | "date" | "timeSlot" | "activity" | "capacity">;

export interface CompanionRequest {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userTrust: number;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface Message extends Author {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
}

export interface CompanionRating {
  id: string;
  postId: string;
  raterId: string;
  rateeId: string;
  score: number;
  showedUp: boolean;
  createdAt: string;
}

export interface Story extends Author {
  id: string;
  iata: string;
  city: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  createdAt: string;
  expiresAt: string;
}

export interface Expense {
  id: string;
  tripId: string;
  category: "flight" | "stay" | "food" | "activity" | "shopping" | "transport" | "etc";
  amount: number;
  currency: string;
  memo: string;
  createdAt: string;
}

export type ReportTarget = "user" | "review" | "post" | "comment" | "story" | "companion";

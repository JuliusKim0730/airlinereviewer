export interface Author {
  authorId: string;
  authorName: string;
}

export interface Ratings {
  seat: number;
  meal: number;
  service: number;
  punctuality: number;
}

export interface Review extends Author {
  id: string;
  tripId: string | null;
  from: string;
  to: string;
  carrier: string;
  flightNumber: string;
  flightDate: string;
  aircraft: string | null;
  seat: string;
  ratings: Ratings;
  overall: number;
  body: string;
  photos: string[];
  createdAt: string;
}

export type NewReview = Omit<Review, "id" | "createdAt" | "authorId" | "authorName" | "photos"> & { photos: Blob[] };

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

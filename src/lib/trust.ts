// Trust score shown on profiles and companion posts. Every point comes from
// something the person did, so the "how to raise it" list maps 1:1 to the score.

export interface TrustInputs {
  verifiedTrips: number;
  google: boolean;
  /** Ratings received from companions after meeting. */
  ratings: { score: number; showedUp: boolean }[];
  reviews: number;
  posts: number;
  /** Reports against this person that were upheld. */
  reports: number;
  /** Attempts to verify a boarding pass in someone else's name. */
  nameMismatches?: number;
}

export interface TrustResult {
  score: number;
  level: number;
  label: string;
  nextSteps: { text: string; points: number }[];
}

const LEVELS = [
  { min: 80, label: "베테랑 여행자" },
  { min: 60, label: "믿음직한 동행" },
  { min: 40, label: "인증 여행자" },
  { min: 20, label: "첫 비행 완료" },
  { min: 0, label: "새내기" },
];

export const TRUST_POINTS = {
  perTrip: 10,
  maxTrips: 5,
  google: 10,
  perGoodRating: 5,
  maxGoodRatings: 5,
  perContribution: 2,
  maxContributions: 5,
  noShow: -20,
  report: -10,
  nameMismatch: -10,
};

export function computeTrust(input: TrustInputs): TrustResult {
  const P = TRUST_POINTS;
  const trips = Math.min(input.verifiedTrips, P.maxTrips);
  const goodRatings = Math.min(input.ratings.filter((r) => r.showedUp && r.score >= 4).length, P.maxGoodRatings);
  const noShows = input.ratings.filter((r) => !r.showedUp).length;
  const contributions = Math.min(input.reviews + input.posts, P.maxContributions);

  const raw =
    trips * P.perTrip +
    (input.google ? P.google : 0) +
    goodRatings * P.perGoodRating +
    contributions * P.perContribution +
    noShows * P.noShow +
    input.reports * P.report +
    (input.nameMismatches ?? 0) * P.nameMismatch;
  const score = Math.max(0, Math.min(100, raw));
  const levelIndex = LEVELS.findIndex((l) => score >= l.min);

  const nextSteps: TrustResult["nextSteps"] = [];
  if (trips < P.maxTrips) nextSteps.push({ text: `보딩패스 인증하기 (${trips}/${P.maxTrips})`, points: P.perTrip });
  if (!input.google) nextSteps.push({ text: "구글 계정 연결하기", points: P.google });
  if (goodRatings < P.maxGoodRatings) nextSteps.push({ text: `동행 후 좋은 평가 받기 (${goodRatings}/${P.maxGoodRatings})`, points: P.perGoodRating });
  if (contributions < P.maxContributions) nextSteps.push({ text: `후기나 게시글 남기기 (${contributions}/${P.maxContributions})`, points: P.perContribution });

  return { score, level: LEVELS.length - levelIndex, label: LEVELS[levelIndex].label, nextSteps };
}

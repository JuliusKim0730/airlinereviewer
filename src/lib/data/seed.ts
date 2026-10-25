// Example content for development mode so every screen has something to browse.
// Authors use ids starting with "sample-" so they can never collide with real users.

import type { CompanionPost, Post, Review, Story } from "./types";

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60e3).toISOString();
const dayFromNow = (days: number) => new Date(Date.now() + days * 864e5 + 9 * 3600e3).toISOString().slice(0, 10);

export function seedReviews(): Review[] {
  const base = { tripId: null, photos: [], aircraft: null };
  return [
    { ...base, id: "sample-r1", authorId: "sample-u1", authorName: "구름여행자", from: "ICN", to: "BKK", carrier: "KE", flightNumber: "651", flightDate: dayFromNow(-20), aircraft: "A330-300", seat: "32K", ratings: { seat: 4, meal: 5, service: 4, punctuality: 4 }, overall: 4.5, body: "기내식 비빔밥 최고. 좌석 간격은 평범했어요.", createdAt: iso(60 * 24 * 3) },
    { ...base, id: "sample-r2", authorId: "sample-u2", authorName: "다낭러버", from: "ICN", to: "DAD", carrier: "VJ", flightNumber: "881", flightDate: dayFromNow(-12), aircraft: "A321neo", seat: "12A", ratings: { seat: 3, meal: 2, service: 4, punctuality: 5 }, overall: 3.5, body: "저가항공치고 정시 출발. 담요는 유료예요.", createdAt: iso(60 * 24 * 2) },
    { ...base, id: "sample-r3", authorId: "sample-u3", authorName: "창가석수집가", from: "GMP", to: "HND", carrier: "OZ", flightNumber: "1085", flightDate: dayFromNow(-5), aircraft: "A350-900", seat: "18A", ratings: { seat: 5, meal: 4, service: 5, punctuality: 5 }, overall: 5, body: "창가에서 후지산이 보였어요. 왼쪽 좌석 추천!", createdAt: iso(60 * 20) },
  ];
}

export function seedPosts(): Post[] {
  const base = { photos: [], likedByMe: false };
  return [
    { ...base, id: "sample-p1", authorId: "sample-u1", authorName: "구름여행자", board: "city", tag: "BKK", title: "방콕 짜뚜짝 주말시장 팁", body: "토요일 오전 9시 전에 가면 덜 덥고 덜 붐벼요. 현금 꼭 챙기세요.", likes: 12, comments: 0, createdAt: iso(60 * 5) },
    { ...base, id: "sample-p2", authorId: "sample-u3", authorName: "창가석수집가", board: "airline", tag: "OZ", title: "A350 창가 명당 좌석", body: "날개 앞쪽 18열 이전이 창밖 풍경이 제일 좋았어요.", likes: 8, comments: 0, createdAt: iso(60 * 26) },
    { ...base, id: "sample-p3", authorId: "sample-u2", authorName: "다낭러버", board: "free", tag: "", title: "보딩패스 사진 어떻게 보관하세요?", body: "저는 앱에 인증하고 원본은 지워요. 다들 어떻게 하시나요?", likes: 3, comments: 0, createdAt: iso(60 * 50) },
  ];
}

export function seedCompanions(): CompanionPost[] {
  return [
    { id: "sample-c1", hostId: "sample-u1", hostName: "구름여행자", hostTrust: 57, iata: "BKK", city: "방콕", date: dayFromNow(3), timeSlot: "저녁", activity: "짜뚜짝 야시장 같이 가요", capacity: 3, members: 1, status: "open", createdAt: iso(90) },
    { id: "sample-c2", hostId: "sample-u2", hostName: "다낭러버", hostTrust: 34, iata: "DAD", city: "다낭", date: dayFromNow(8), timeSlot: "오전", activity: "바나힐 택시 같이 타실 분", capacity: 2, members: 0, status: "open", createdAt: iso(200) },
    { id: "sample-c3", hostId: "sample-u3", hostName: "창가석수집가", hostTrust: 72, iata: "HND", city: "도쿄", date: dayFromNow(11), timeSlot: "점심", activity: "츠키지 스시 오마카세 2인", capacity: 1, members: 0, status: "open", createdAt: iso(400) },
  ];
}

/** Generated fresh on every read so the sample stories never expire. */
export function seedStories(): Story[] {
  const story = (id: string, iata: string, city: string, author: string, authorId: string, minutesAgo: number, caption: string): Story => ({
    id,
    iata,
    city,
    authorId,
    authorName: author,
    mediaUrl: "",
    mediaType: "image",
    caption,
    createdAt: iso(minutesAgo),
    expiresAt: new Date(Date.parse(iso(minutesAgo)) + 864e5).toISOString(),
  });
  return [
    story("sample-s1", "BKK", "방콕", "구름여행자", "sample-u1", 12, "왓아룬 노을 지금 미쳤어요"),
    story("sample-s2", "DAD", "다낭", "다낭러버", "sample-u2", 47, "미케비치 파도 좋아요"),
    story("sample-s3", "HND", "도쿄", "창가석수집가", "sample-u3", 95, "시부야 스크램블 교차로"),
    story("sample-s4", "CEB", "세부", "바다수영", "sample-u4", 180, "고래상어 만났어요"),
  ];
}

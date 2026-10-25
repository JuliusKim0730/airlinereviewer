// Example content for development mode so every screen has something to browse.
// Authors use ids starting with "sample-" so they can never collide with real users.

import { EMPTY_DETAILS, type CompanionPost, type Post, type Review, type Story } from "./types";

const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60e3).toISOString();
const dayFromNow = (days: number) => new Date(Date.now() + days * 864e5 + 9 * 3600e3).toISOString().slice(0, 10);

export function seedReviews(): Review[] {
  const base = { tripId: null, photos: [], aircraft: null, isPast: false, verified: true };
  return [
    {
      ...base,
      id: "sample-r1",
      authorId: "sample-u1",
      authorName: "구름여행자",
      from: "ICN",
      to: "BKK",
      carrier: "KE",
      flightNumber: "651",
      flightDate: dayFromNow(-20),
      aircraft: "A330-300",
      seat: "32K",
      value: 4,
      summary: "기내식과 서비스는 확실히 값을 해요. 다리 공간은 평범.",
      details: {
        ...EMPTY_DETAILS,
        seatSpace: "ok",
        seatTemp: "cold",
        recline: "fine",
        seatNote: "32열 창가는 에어컨 바람이 바로 내려와서 추웠어요. 겉옷 필수.",
        pros: "비빔밥 기내식, 친절한 승무원, 수하물 23kg 포함",
        cons: "이코노미 좌석 간격은 저가항공과 큰 차이 없음",
        tips: "인천 T2 D~E 카운터. 모바일 체크인하면 백드롭 줄이 훨씬 짧아요.",
        meal: "비빔밥 / 치킨 중 선택. 비빔밥 추천, 고추장 튜브 줘요.",
        lavatory: "clean",
        lavatoryNote: "뒤쪽 화장실이 덜 붐벼요.",
      },
      createdAt: iso(60 * 24 * 3),
    },
    {
      ...base,
      id: "sample-r2",
      authorId: "sample-u2",
      authorName: "다낭러버",
      from: "ICN",
      to: "DAD",
      carrier: "VJ",
      flightNumber: "881",
      flightDate: dayFromNow(-12),
      aircraft: "A321neo",
      seat: "12A",
      value: 4,
      summary: "가격 생각하면 만족. 대신 모든 게 유료라는 걸 알고 타야 해요.",
      details: {
        ...EMPTY_DETAILS,
        seatSpace: "tight",
        seatTemp: "hot",
        recline: "limited",
        seatNote: "12열 비상구 앞줄이라 등받이가 거의 안 젖혀져요. 비상구 좌석이라고 다 편한 게 아님!",
        pros: "정시 출발, 왕복 20만원대",
        cons: "물 한 잔도 유료, 담요 유료",
        tips: "인천 T1 L 카운터. 위탁 수하물은 미리 앱에서 사면 공항보다 훨씬 싸요.",
        meal: "사전 주문 안 하면 컵라면 정도만 있어요.",
        lavatory: "bad",
        lavatoryNote: "화장실이 2개뿐이라 착륙 1시간 전부터 줄 서요. 좁음.",
      },
      createdAt: iso(60 * 24 * 2),
    },
    {
      ...base,
      id: "sample-r3",
      authorId: "sample-u3",
      authorName: "창가석수집가",
      verified: false,
      isPast: true,
      from: "GMP",
      to: "HND",
      carrier: "OZ",
      flightNumber: "1085",
      flightDate: "2025-11-02",
      aircraft: "A350-900",
      seat: "18A",
      value: 5,
      summary: "왼쪽 창가에서 후지산이 보였어요. 김포-하네다는 시간 대비 최고.",
      details: {
        ...EMPTY_DETAILS,
        seatSpace: "roomy",
        seatTemp: "ok",
        recline: "fine",
        pros: "도심 공항끼리라 이동 시간이 확 줄어요",
        tips: "도쿄행은 A열(왼쪽) 창가를 잡으세요. 맑은 날 후지산이 보여요.",
      },
      createdAt: iso(60 * 20),
    },
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

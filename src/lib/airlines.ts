// Names for carriers Korean travellers fly most. Unknown codes fall back to the code itself.
const AIRLINES: Record<string, string> = {
  KE: "대한항공",
  OZ: "아시아나항공",
  "7C": "제주항공",
  LJ: "진에어",
  TW: "티웨이항공",
  BX: "에어부산",
  RS: "에어서울",
  ZE: "이스타항공",
  YP: "에어프레미아",
  RF: "에어로케이",
  JL: "일본항공",
  NH: "전일본공수",
  MM: "피치항공",
  TG: "타이항공",
  VJ: "비엣젯항공",
  VN: "베트남항공",
  PR: "필리핀항공",
  "5J": "세부퍼시픽",
  CX: "캐세이퍼시픽",
  CI: "중화항공",
  BR: "에바항공",
  SQ: "싱가포르항공",
  AF: "에어프랑스",
  BA: "영국항공",
  LH: "루프트한자",
  AC: "에어캐나다",
  DL: "델타항공",
  UA: "유나이티드항공",
  AA: "아메리칸항공",
};

export function airlineName(code: string): string {
  return AIRLINES[code.toUpperCase()] ?? code;
}

export function knownAirlines(): { code: string; name: string }[] {
  return Object.entries(AIRLINES).map(([code, name]) => ({ code, name }));
}

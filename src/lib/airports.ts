// Seed airport data for development. Coordinates are approximate.
// Replace with the full OpenFlights (or OurAirports) dataset in the database.

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

const AIRPORTS: Airport[] = [
  { iata: "ICN", name: "인천국제공항", city: "서울", country: "KR", lat: 37.4602, lon: 126.4407 },
  { iata: "GMP", name: "김포국제공항", city: "서울", country: "KR", lat: 37.5583, lon: 126.7906 },
  { iata: "PUS", name: "김해국제공항", city: "부산", country: "KR", lat: 35.1795, lon: 128.9382 },
  { iata: "CJU", name: "제주국제공항", city: "제주", country: "KR", lat: 33.5113, lon: 126.4930 },
  { iata: "NRT", name: "나리타국제공항", city: "도쿄", country: "JP", lat: 35.7720, lon: 140.3929 },
  { iata: "HND", name: "하네다공항", city: "도쿄", country: "JP", lat: 35.5494, lon: 139.7798 },
  { iata: "KIX", name: "간사이국제공항", city: "오사카", country: "JP", lat: 34.4347, lon: 135.2440 },
  { iata: "FUK", name: "후쿠오카공항", city: "후쿠오카", country: "JP", lat: 33.5859, lon: 130.4510 },
  { iata: "TPE", name: "타오위안국제공항", city: "타이베이", country: "TW", lat: 25.0797, lon: 121.2342 },
  { iata: "HKG", name: "홍콩국제공항", city: "홍콩", country: "HK", lat: 22.3080, lon: 113.9185 },
  { iata: "BKK", name: "수완나품공항", city: "방콕", country: "TH", lat: 13.6900, lon: 100.7501 },
  { iata: "DAD", name: "다낭국제공항", city: "다낭", country: "VN", lat: 16.0439, lon: 108.1993 },
  { iata: "SGN", name: "떤선녓국제공항", city: "호치민", country: "VN", lat: 10.8188, lon: 106.6519 },
  { iata: "HAN", name: "노이바이국제공항", city: "하노이", country: "VN", lat: 21.2212, lon: 105.8072 },
  { iata: "CEB", name: "막탄세부국제공항", city: "세부", country: "PH", lat: 10.3075, lon: 123.9794 },
  { iata: "SIN", name: "창이공항", city: "싱가포르", country: "SG", lat: 1.3644, lon: 103.9915 },
  { iata: "CDG", name: "샤를드골공항", city: "파리", country: "FR", lat: 49.0097, lon: 2.5479 },
  { iata: "LHR", name: "히드로공항", city: "런던", country: "GB", lat: 51.4700, lon: -0.4543 },
  { iata: "FRA", name: "프랑크푸르트공항", city: "프랑크푸르트", country: "DE", lat: 50.0379, lon: 8.5622 },
  { iata: "YUL", name: "몬트리올 트뤼도공항", city: "몬트리올", country: "CA", lat: 45.4706, lon: -73.7408 },
  { iata: "LAX", name: "로스앤젤레스국제공항", city: "로스앤젤레스", country: "US", lat: 33.9416, lon: -118.4085 },
  { iata: "JFK", name: "존 F. 케네디국제공항", city: "뉴욕", country: "US", lat: 40.6413, lon: -73.7781 },
];

const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

export function findAirport(iata: string): Airport | undefined {
  return BY_IATA.get(iata.toUpperCase());
}

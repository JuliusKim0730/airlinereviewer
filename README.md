# 내가 탄 비행기 (airlinereviewer)

보딩패스를 인증한 사람만 후기를 쓰고, 여행지 상품을 보고, 현지 동행을 구할 수 있는 여행 앱입니다.

## 진입·권한 흐름

- 첫 화면: 파란 하늘에 비행기가 구름을 가로지르고, 구름이 로고로 바뀌며 진입 (세션당 한 번, 탭하면 건너뜀).
- 누구나 전부 둘러볼 수 있음. 좋아요·인증 등 행동은 로그인 유도 (게스트 가능).
- 보딩패스 인증은 게스트도 가능. 후기·게시글·스토리·부분동행은 인증 후에만.
- 구글 로그인 시 게스트 기록을 같은 계정으로 이어받아 영구 보관 (Supabase identity linking).
- 규칙은 `src/lib/access.ts` 한 곳에 있음.

## 지금 들어 있는 것 (1단계 뼈대)

- `src/lib/bcbp.ts`: IATA 보딩패스 바코드(BCBP) 파서. 이름, 예약번호, 구간, 항공사, 편명, 날짜, 좌석을 읽습니다.
- `src/lib/airports.ts`: 개발용 공항 시드 데이터 (나중에 OpenFlights 전체 데이터로 교체).
- `src/lib/geo.ts`: 대권거리 계산, 지구 몇 바퀴 계산.
- `src/components/TicketVerifier.tsx`: 바코드 문자열을 붙여 넣으면 항공편 카드를 보여주는 데모 화면.

## Supabase 연결

환경변수가 없으면 개발 모드로 동작합니다 (로그인·기록이 브라우저에만 저장, 구글 로그인은 흉내만 냄). 실제 연결은:

1. Supabase 프로젝트 생성 후 `supabase/migrations/0001_trips.sql` 실행
2. Authentication에서 Anonymous sign-ins, Google provider, Manual linking 켜기
3. `.env.example`을 `.env.local`로 복사해 URL과 anon key 입력

## 실행

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # 파서 테스트
```

## 다음 단계

카메라 바코드 스캔, Supabase 연동(로그인·trips 저장), 항공편 API로 실제 기종 조회, 후기 작성, 내 여행 지도.

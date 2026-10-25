# 티뷰 (airlinereviewer)

내가 탄 비행기 티켓 리뷰.

보딩패스를 인증한 사람만 후기를 쓰고, 여행지 상품을 보고, 현지 동행을 구할 수 있는 여행 앱입니다.

## 진입·권한 흐름

- 첫 화면: 파란 하늘에 비행기가 구름을 가로지르고, 구름이 로고로 바뀌며 진입 (세션당 한 번, 탭하면 건너뜀).
- 누구나 전부 둘러볼 수 있음. 좋아요·인증 등 행동은 로그인 유도 (게스트 가능).
- 보딩패스 인증은 게스트도 가능. 후기·게시글·스토리·부분동행은 인증 후에만.
- 구글 로그인 시 게스트 기록을 같은 계정으로 이어받아 영구 보관 (Supabase identity linking).
- 규칙은 `src/lib/access.ts` 한 곳에 있음.

## 기능

하단 네비게이션: 홈 · 후기 · 인증(가운데 큰 원) · 동행 · 내기록.

| 기능 | 위치 |
| --- | --- |
| 1. 보딩패스 인증 (카메라 바코드 스캔, 붙여넣기, 예시) | `/verify`, `TicketVerifier`, `BarcodeScanner`, `lib/bcbp.ts` |
| 2. 경로·항공사·기종 정보 | `FlightCard`, `/api/flight` (AeroDataBox 키가 있으면 실제 기종) |
| 3. 탑승 후기 (인증한 구간에만) | `/reviews` 후기 탭, `ReviewsTab` |
| 4. 여행지 상품 3개 + 파트너 바로가기 | `ProductCards`, `/api/products`, `src/data/products.json` |
| 5. 부분동행 (모집·신청·수락·채팅·평가) | `/companions` |
| 6. 신뢰도 (점수·레벨·올리는 법, 노쇼·신고 감점) | `lib/trust.ts`, `/me` |
| 7. 내 여행 기록·통계 (거리, 쓴 돈, 여행 스타일, 리캡, 지금 가면) | `/me`, `lib/stats.ts`, `/api/rates` |
| 8. 커뮤니티 게시판 + 사진 | `/reviews` 커뮤니티 탭, `CommunityTab` |
| 9. 지금 이 순간 (24시간 뒤 사라지는 사진·영상) | 홈 상단, `Stories` |

홈은 지도입니다. 인천(ICN)은 항상 기준점으로 찍혀 있고, 여행자들이 있는 도시와 내가 인증한 비행 경로가 함께 보입니다.

데이터는 `src/lib/data/repo.ts` 인터페이스 하나로 다루며, Supabase 설정이 없으면 `localRepo`(브라우저 저장 + 시드 데이터), 있으면 `supabaseRepo`를 씁니다.

## 실행

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # 파서·통계·신뢰도 테스트
```

## 다음 단계

실제 Supabase 프로젝트 연결, 제휴 계정 발급 후 상품 링크 교체, 공항 데이터 전체 교체(OpenFlights), 스토리 미디어 파일 정리용 Edge Function.

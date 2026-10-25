# 내가 탄 비행기 (airlinereviewer)

보딩패스를 인증한 사람만 후기를 쓰고, 여행지 상품을 보고, 현지 동행을 구할 수 있는 여행 앱입니다.

## 지금 들어 있는 것 (1단계 뼈대)

- `src/lib/bcbp.ts`: IATA 보딩패스 바코드(BCBP) 파서. 이름, 예약번호, 구간, 항공사, 편명, 날짜, 좌석을 읽습니다.
- `src/lib/airports.ts`: 개발용 공항 시드 데이터 (나중에 OpenFlights 전체 데이터로 교체).
- `src/lib/geo.ts`: 대권거리 계산, 지구 몇 바퀴 계산.
- `src/components/TicketVerifier.tsx`: 바코드 문자열을 붙여 넣으면 항공편 카드를 보여주는 데모 화면.

## 실행

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # 파서 테스트
```

## 다음 단계

카메라 바코드 스캔, Supabase 연동(로그인·trips 저장), 항공편 API로 실제 기종 조회, 후기 작성, 내 여행 지도.

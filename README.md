# 🏆 Video World Cup

YouTube 영상 16개를 토너먼트 방식으로 대결시키는 영상 월드컵.

## 로컬 실행

```bash
npm install
npm run dev
```

## Vercel 배포

1. GitHub에 이 저장소를 push
2. [vercel.com](https://vercel.com)에서 Import Project
3. Framework Preset: **Vite** 자동 감지
4. Deploy 클릭 — 끝

별도 환경변수 설정 불필요.

## 기능

- 월드컵 제목 자유 설정 (최고의 기타 솔로, 앨범아트 등)
- 16강 → 8강 → 4강 → 결승 토너먼트
- YouTube 썸네일 자동 로드
- 페이지 내 영상 재생 / 유튜브 이동 선택
- 투표 인원 설정 (1~20명)
- 동점 시 재투표
- 라운드 전환 시 대진표 확인
- 우승 결과 + 전체 대진 브라켓
- 새로고침해도 진행 상태 유지 (localStorage)

## 기술 스택

Vite + React 18

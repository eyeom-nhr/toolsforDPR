# Video World Cup - Vercel/Vite 버전

Claude Artifact의 CSP 때문에 막히던 YouTube 썸네일을 Vercel/Vite 정적 앱에서 직접 `<img>`로 불러오도록 바꾼 버전입니다.

## 주요 변경점

- `fetch -> blob URL` 썸네일 로딩 제거
- `https://i.ytimg.com/vi/{id}/hqdefault.jpg`를 `<img>`로 직접 로딩
- 실패 시 `mqdefault`, `img.youtube.com`, `0.jpg` 순서로 자동 대체
- 모든 썸네일 실패 시 CSS 포스터 fallback 표시
- Claude 전용 `window.storage`가 없으면 `localStorage`를 사용
- Vercel/localStorage 모드에서 여러 명 투표는 같은 브라우저에서 투표자 번호를 바꿔가며 진행

## 로컬 실행

```bash
npm install
npm run dev
```

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 새 프로젝트로 import합니다.
3. Framework preset은 Vite로 자동 감지됩니다.
4. 기본 설정 그대로 배포합니다.

## 참고

이 버전은 서버/DB 없는 정적 앱입니다. 여러 사람이 각자 다른 기기에서 동시에 투표하는 실시간 공동 투표까지 필요하면 Supabase/Firebase/Vercel KV 같은 공유 저장소를 추가해야 합니다.

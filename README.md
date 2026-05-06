# 🏆 Video World Cup

YouTube 영상 16개를 토너먼트로 대결시키는 영상 월드컵.
여러 사람이 각자 기기에서 실시간 투표 가능.

---

## Firebase 설정 (필수 — 5분 소요)

이 앱은 여러 사람이 실시간으로 투표하기 위해 Firebase를 사용합니다.
아래 순서대로 따라하세요.

### 1단계: Firebase 프로젝트 만들기

1. https://console.firebase.google.com 접속
2. Google 계정으로 로그인
3. **"프로젝트 추가"** 클릭
4. 프로젝트 이름 입력 (예: `video-worldcup`)
5. Google Analytics는 **사용 안함** 선택 → **프로젝트 만들기** 클릭

### 2단계: 데이터베이스 만들기

1. 왼쪽 메뉴에서 **"빌드"** → **"Realtime Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. 위치는 **미국(us-central1)** 선택 → **다음**
4. **"테스트 모드에서 시작"** 선택 → **사용 설정**

### 3단계: 웹 앱 등록하기

1. 프로젝트 메인 페이지로 돌아가기 (왼쪽 상단 홈 아이콘)
2. 화면 중앙에 **"</>"** (웹) 아이콘 클릭
3. 앱 이름 입력 (예: `worldcup`) → **"앱 등록"** 클릭
4. 화면에 `firebaseConfig` 코드가 표시됨 — 이 값들을 복사

### 4단계: firebaseConfig.js 수정

GitHub에서 `firebaseConfig.js` 파일을 열고 ✏️ 편집 버튼을 눌러서,
3단계에서 복사한 값으로 교체하세요:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← 본인 값
  authDomain: "xxx.firebaseapp.com",
  databaseURL: "https://xxx-default-rtdb.firebaseio.com",
  projectId: "xxx",
  storageBucket: "xxx.firebasestorage.app",
  messagingSenderId: "123456",
  appId: "1:123456:web:abcdef"
}
```

**Commit changes** 클릭하면 Vercel이 자동으로 재배포합니다.

---

## Vercel 배포

1. GitHub에 이 파일들을 모두 업로드
2. https://vercel.com 에서 **Import Project**
3. Framework Preset: **Vite** (자동 감지)
4. **Deploy** 클릭

---

## 기능

- 월드컵 제목 자유 설정
- 16강 → 8강 → 4강 → 결승 토너먼트
- **실시간 멀티 디바이스 투표** (Firebase)
- 링크 공유 → 각자 기기에서 투표
- YouTube 썸네일 + 페이지 내 재생
- 동점 시 재투표
- 전체 대진 브라켓

## 기술 스택

Vite + React 18 + Firebase Realtime Database

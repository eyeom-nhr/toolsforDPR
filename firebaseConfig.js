// ╔══════════════════════════════════════════════════════╗
// ║  Firebase 설정 — 아래 값을 본인 프로젝트 값으로 교체  ║
// ╚══════════════════════════════════════════════════════╝
// 설정 방법은 README.md를 참고하세요.

import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "여기에-본인-API키-입력",
  authDomain: "여기에-프로젝트명.firebaseapp.com",
  databaseURL: "https://여기에-프로젝트명-default-rtdb.firebaseio.com",
  projectId: "여기에-프로젝트명",
  storageBucket: "여기에-프로젝트명.firebasestorage.app",
  messagingSenderId: "여기에-숫자",
  appId: "여기에-앱ID"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

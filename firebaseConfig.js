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

let db = null
let firebaseError = null

// placeholder 값인지 체크
if (firebaseConfig.apiKey.includes('여기에')) {
  firebaseError = 'Firebase 설정이 필요합니다. firebaseConfig.js 파일에 본인 Firebase 프로젝트 값을 입력해주세요.'
} else {
  try {
    const app = initializeApp(firebaseConfig)
    db = getDatabase(app)
  } catch (e) {
    firebaseError = 'Firebase 초기화에 실패했습니다: ' + e.message
  }
}

export { db, firebaseError }

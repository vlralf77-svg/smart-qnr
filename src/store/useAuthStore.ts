// 관리 프로그램 로그인 게이트 (간단한 실행 잠금)
// 주의: 자격증명이 클라이언트 코드에 포함되므로 강력한 인증이 아닙니다.
// 내부 관리용 데스크톱 앱의 단순 접근 제한 용도입니다.
import { create } from 'zustand';

// 고정 자격증명 (요청 사양)
const FIXED_ID = 'admin';
const FIXED_PW = 'lit123qwe!';

// 세션 저장소 사용 → 프로그램(세션) 재시작 시 다시 로그인 필요
const SESSION_KEY = 'smartqnr.authed';

function readAuthed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

interface AuthState {
  authed: boolean;
  error: string;
  login: (id: string, pw: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authed: readAuthed(),
  error: '',
  login: (id, pw) => {
    if (id === FIXED_ID && pw === FIXED_PW) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* 무시 */
      }
      set({ authed: true, error: '' });
      return true;
    }
    set({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    return false;
  },
  logout: () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* 무시 */
    }
    set({ authed: false, error: '' });
  },
}));

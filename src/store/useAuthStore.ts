// 관리 프로그램 로그인 게이트
// - 백엔드 연동 시: 서버 /api/auth/login 으로 인증(JWT 발급).
// - 오프라인(데스크톱): 고정 자격증명으로 간단 잠금.
import { create } from 'zustand';
import { api, isBackendEnabled } from '@/api/client';

// 오프라인 모드용 고정 자격증명 (요청 사양)
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
  busy: boolean;
  login: (id: string, pw: string) => Promise<boolean>;
  logout: () => void;
}

function markAuthed() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* 무시 */
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  authed: readAuthed(),
  error: '',
  busy: false,
  login: async (id, pw) => {
    set({ busy: true, error: '' });
    if (isBackendEnabled) {
      try {
        await api.login(id, pw); // 성공 시 토큰 저장
        markAuthed();
        set({ authed: true, error: '', busy: false });
        return true;
      } catch (e) {
        set({ error: (e as Error).message || '로그인에 실패했습니다.', busy: false });
        return false;
      }
    }
    // 오프라인 모드: 고정 자격증명
    if (id === FIXED_ID && pw === FIXED_PW) {
      markAuthed();
      set({ authed: true, error: '', busy: false });
      return true;
    }
    set({ error: '아이디 또는 비밀번호가 올바르지 않습니다.', busy: false });
    return false;
  },
  logout: () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* 무시 */
    }
    if (isBackendEnabled) api.logout();
    set({ authed: false, error: '' });
  },
}));

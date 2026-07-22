// 관리 프로그램 로그인 게이트 + 계정 권한
// - 백엔드 연동 시: 서버 /api/auth/login 으로 인증(JWT 발급) — 전체 권한(admin).
// - 오프라인(데스크톱): 내장 admin(고정) 또는 하위 계정(권한별) 인증.
import { create } from 'zustand';
import { api, isBackendEnabled } from '@/api/client';
import { useAccountsStore, Permissions, ALL_PERMISSIONS } from '@/store/useAccountsStore';
import { hashPassword } from '@/utils/hash';

// 내장 관리자 고정 자격증명
const FIXED_ID = 'admin';
const FIXED_PW = 'lit123qwe!';

const SESSION_KEY = 'smartqnr.session';

interface Session {
  user: string;
  permissions: Permissions;
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* 무시 */
  }
}

interface AuthState {
  authed: boolean;
  currentUser: string | null;
  permissions: Permissions | null;
  error: string;
  busy: boolean;
  login: (id: string, pw: string) => Promise<boolean>;
  logout: () => void;
}

const initial = readSession();

export const useAuthStore = create<AuthState>((set) => ({
  authed: !!initial,
  currentUser: initial?.user ?? null,
  permissions: initial?.permissions ?? null,
  error: '',
  busy: false,
  login: async (id, pw) => {
    set({ busy: true, error: '' });

    // 백엔드 모드: 서버 인증(현재 서버는 admin 단일) → 전체 권한
    if (isBackendEnabled) {
      try {
        await api.login(id, pw);
        const s = { user: id, permissions: ALL_PERMISSIONS };
        writeSession(s);
        set({ authed: true, currentUser: s.user, permissions: s.permissions, busy: false });
        return true;
      } catch (e) {
        set({ error: (e as Error).message || '로그인에 실패했습니다.', busy: false });
        return false;
      }
    }

    // 오프라인: 내장 admin
    if (id.trim().toLowerCase() === FIXED_ID && pw === FIXED_PW) {
      const s = { user: FIXED_ID, permissions: ALL_PERMISSIONS };
      writeSession(s);
      set({ authed: true, currentUser: s.user, permissions: s.permissions, busy: false });
      return true;
    }

    // 오프라인: 하위 계정
    const acc = useAccountsStore.getState().findByUsername(id);
    if (acc) {
      const hash = await hashPassword(pw);
      if (hash === acc.passwordHash) {
        const s = { user: acc.username, permissions: acc.permissions };
        writeSession(s);
        set({ authed: true, currentUser: s.user, permissions: s.permissions, busy: false });
        return true;
      }
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
    set({ authed: false, currentUser: null, permissions: null, error: '' });
  },
}));

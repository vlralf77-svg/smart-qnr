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
  /** 표시용 사용자 이름(없으면 아이디로 대체) */
  name?: string;
  department?: string;
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
  /** 표시용 사용자 이름(없으면 아이디) */
  displayName: string | null;
  department: string | null;
  permissions: Permissions | null;
  error: string;
  busy: boolean;
  login: (id: string, pw: string) => Promise<boolean>;
  /** 아이디만으로 로그인(Ctrl+Q 단축키용, 오프라인 전용). 비밀번호 생략. */
  loginByIdOnly: (id: string) => Promise<boolean>;
  logout: () => void;
}

const initial = readSession();

// 세션을 저장하고 스토어 상태에 반영(로그인 성공 공통 처리)
function applySession(set: (partial: Partial<AuthState>) => void, s: Session) {
  writeSession(s);
  set({
    authed: true,
    currentUser: s.user,
    displayName: s.name || s.user,
    department: s.department ?? null,
    permissions: s.permissions,
    error: '',
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  authed: !!initial,
  currentUser: initial?.user ?? null,
  displayName: initial?.name ?? initial?.user ?? null,
  department: initial?.department ?? null,
  permissions: initial?.permissions ?? null,
  error: '',
  busy: false,
  login: async (id, pw) => {
    set({ busy: true, error: '' });

    // 백엔드 모드: 서버 인증(현재 서버는 admin 단일) → 전체 권한
    if (isBackendEnabled) {
      try {
        await api.login(id, pw);
        const s: Session = { user: id, name: id, permissions: ALL_PERMISSIONS };
        applySession(set, s);
        set({ busy: false });
        return true;
      } catch (e) {
        set({ error: (e as Error).message || '로그인에 실패했습니다.', busy: false });
        return false;
      }
    }

    // 오프라인: 내장 admin
    if (id.trim().toLowerCase() === FIXED_ID && pw === FIXED_PW) {
      const s: Session = { user: FIXED_ID, name: '관리자', permissions: ALL_PERMISSIONS };
      applySession(set, s);
      set({ busy: false });
      return true;
    }

    // 오프라인: 하위 계정
    const acc = useAccountsStore.getState().findByUsername(id);
    if (acc) {
      const hash = await hashPassword(pw);
      if (hash === acc.passwordHash) {
        const s: Session = {
          user: acc.username,
          name: acc.displayName || acc.username,
          department: acc.department,
          permissions: acc.permissions,
        };
        applySession(set, s);
        set({ busy: false });
        return true;
      }
    }

    set({ error: '아이디 또는 비밀번호가 올바르지 않습니다.', busy: false });
    return false;
  },
  loginByIdOnly: async (id) => {
    const name = id.trim();
    if (!name) {
      set({ error: '아이디를 입력하세요.' });
      return false;
    }
    // 백엔드 모드는 서버가 비밀번호를 요구하므로 아이디만으로는 불가
    if (isBackendEnabled) {
      set({ error: '백엔드 모드에서는 아이디만으로 로그인할 수 없습니다.' });
      return false;
    }
    // 내장 admin
    if (name.toLowerCase() === FIXED_ID) {
      applySession(set, { user: FIXED_ID, name: '관리자', permissions: ALL_PERMISSIONS });
      return true;
    }
    // 하위 계정(아이디 일치 시 권한대로)
    const acc = useAccountsStore.getState().findByUsername(name);
    if (acc) {
      applySession(set, {
        user: acc.username,
        name: acc.displayName || acc.username,
        department: acc.department,
        permissions: acc.permissions,
      });
      return true;
    }
    set({ error: '등록되지 않은 아이디입니다.' });
    return false;
  },
  logout: () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* 무시 */
    }
    if (isBackendEnabled) api.logout();
    set({
      authed: false,
      currentUser: null,
      displayName: null,
      department: null,
      permissions: null,
      error: '',
    });
  },
}));

// 관리자 하위 계정 관리 (오프라인/데스크톱) — 계정 생성 + 계정별 권한.
//  내장 admin(고정 자격증명)은 별도 처리하며 이 목록에는 포함되지 않는다(항상 전체 권한).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Permissions {
  /** 조회(목록·응답 보기) */
  view: boolean;
  /** 수정(문진 생성·편집·발행) */
  edit: boolean;
  /** 삭제(문진 삭제) */
  delete: boolean;
  /** 계정 관리 접근 */
  manageAccounts: boolean;
}

export const ALL_PERMISSIONS: Permissions = {
  view: true,
  edit: true,
  delete: true,
  manageAccounts: true,
};

export interface Account {
  id: string;
  username: string;
  passwordHash: string;
  permissions: Permissions;
}

interface AccountsState {
  accounts: Account[];
  addAccount: (username: string, passwordHash: string, permissions: Permissions) => string | null;
  updatePermissions: (id: string, permissions: Permissions) => void;
  setPassword: (id: string, passwordHash: string) => void;
  removeAccount: (id: string) => void;
  findByUsername: (username: string) => Account | undefined;
}

const uid = () => `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      addAccount: (username, passwordHash, permissions) => {
        const name = username.trim();
        if (!name) return null;
        // admin(내장) 및 중복 방지
        if (name.toLowerCase() === 'admin') return null;
        if (get().accounts.some((a) => a.username.toLowerCase() === name.toLowerCase())) return null;
        const id = uid();
        set((s) => ({ accounts: [...s.accounts, { id, username: name, passwordHash, permissions }] }));
        return id;
      },
      updatePermissions: (id, permissions) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, permissions } : a)),
        })),
      setPassword: (id, passwordHash) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, passwordHash } : a)),
        })),
      removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),
      findByUsername: (username) =>
        get().accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase()),
    }),
    { name: 'smartqnr-accounts' },
  ),
);

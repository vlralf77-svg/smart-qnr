// 더보기 메뉴 항목별 사용여부 — 관리자가 켜고 끄면 일반 사용자 메뉴에 반영. 브라우저에 기억.
//  enabled[key] 가 false 면 숨김. 값이 없으면 기본 사용(표시).
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MenuConfigState {
  enabled: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
  setEnabled: (key: string, value: boolean) => void;
  toggle: (key: string) => void;
}

export const useMenuConfig = create<MenuConfigState>()(
  devtools(
    persist(
      (set, get) => ({
        enabled: {},
        isEnabled: (key) => get().enabled[key] !== false,
        setEnabled: (key, value) => set((st) => ({ enabled: { ...st.enabled, [key]: value } })),
        toggle: (key) =>
          set((st) => ({ enabled: { ...st.enabled, [key]: st.enabled[key] === false } })),
      }),
      { name: 'smartqnr-menu-config' },
    ),
    { name: 'menuConfig' },
  ),
);

// 화면 UI 환경설정 — 목록 상단 '기본(앞) 버튼'으로 고정할 액션 등. 브라우저에 기억.
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UiPrefsState {
  /** 목록 상단 앞에 고정할 액션 키(기본: 'new' = 새 문진) */
  primaryAction: string;
  setPrimaryAction: (key: string) => void;
}

export const useUiPrefs = create<UiPrefsState>()(
  devtools(
    persist(
      (set) => ({
        primaryAction: 'new',
        setPrimaryAction: (key) => set({ primaryAction: key }),
      }),
      { name: 'smartqnr-ui-prefs' },
    ),
    { name: 'uiPrefs' },
  ),
);

// 환자 문진 화면 표시 모드 — 자동(화면폭)/PC/모바일 중 선택. 브라우저에 기억.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayMode = 'auto' | 'pc' | 'mobile';

interface DisplayModeState {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
}

export const useDisplayMode = create<DisplayModeState>()(
  persist(
    (set) => ({
      mode: 'auto',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'smartqnr-display' },
  ),
);

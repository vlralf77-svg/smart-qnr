// 환자 문진 화면 표시 모드 — 자동(화면폭)/PC/모바일 중 선택. 브라우저에 기억.
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type DisplayMode = 'auto' | 'pc' | 'mobile';

interface DisplayModeState {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
}

// Electron 창 최소 크기를 표시 모드에 맞춰 조절(모바일이면 좁게 축소 허용)
function syncWindow(mode: DisplayMode) {
  try {
    window.smartqnr?.setDisplayWindow?.(mode);
  } catch {
    /* 웹/브리지 없음 — 무시 */
  }
}

export const useDisplayMode = create<DisplayModeState>()(
  devtools(
    persist(
      (set) => ({
        mode: 'auto',
        setMode: (mode) => {
          set({ mode });
          syncWindow(mode);
        },
      }),
      {
        name: 'smartqnr-display',
        // 저장된 모드로 복원되면 창 크기도 맞춤
        onRehydrateStorage: () => (state) => {
          if (state) syncWindow(state.mode);
        },
      },
    ),
    { name: 'displayMode' },
  ),
);

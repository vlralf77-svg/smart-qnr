// 환자 문진 작성 화면 글자 크기 — 작게/중간/크게 중 선택(기본 중간). 브라우저에 기억.
//  Chromium(Electron) 기준 CSS zoom 으로 문항 영역 전체를 비율 확대/축소.
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type FontScale = 'sm' | 'md' | 'lg';

// 각 단계의 확대 배율(중간=1)
export const FONT_ZOOM: Record<FontScale, number> = { sm: 0.9, md: 1, lg: 1.2 };

interface FontScaleState {
  scale: FontScale;
  setScale: (scale: FontScale) => void;
}

export const useFontScale = create<FontScaleState>()(
  devtools(
    persist(
      (set) => ({
        scale: 'md',
        setScale: (scale) => set({ scale }),
      }),
      { name: 'smartqnr-fontscale' },
    ),
    { name: 'fontScale' },
  ),
);

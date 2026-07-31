// 테마 설정 — 강조(브랜드) 색상 + 라이트/다크 모드. 브라우저에 기억.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BrandKey, ThemeMode } from '@/theme';

interface ThemeSettingsState {
  brand: BrandKey;
  mode: ThemeMode;
  setBrand: (brand: BrandKey) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeSettings = create<ThemeSettingsState>()(
  persist(
    (set) => ({
      brand: 'green',
      mode: 'light',
      setBrand: (brand) => set({ brand }),
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'smartqnr-theme' },
  ),
);

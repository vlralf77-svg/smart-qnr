// 테마 설정 — 강조(브랜드) 색상 + 라이트/다크 모드. 브라우저에 기억.
//  brand='custom' 이면 customColor(직접 고른 색)로 테마를 구성한다.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BrandKey, ThemeMode } from '@/theme';

interface ThemeSettingsState {
  brand: BrandKey | 'custom';
  customColor: string;
  mode: ThemeMode;
  setBrand: (brand: BrandKey | 'custom') => void;
  setCustomColor: (color: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeSettings = create<ThemeSettingsState>()(
  persist(
    (set) => ({
      brand: 'green',
      customColor: '#22a06b',
      mode: 'light',
      setBrand: (brand) => set({ brand }),
      // 커스텀 색을 고르면 자동으로 커스텀 모드로 전환
      setCustomColor: (customColor) => set({ customColor, brand: 'custom' }),
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'smartqnr-theme' },
  ),
);

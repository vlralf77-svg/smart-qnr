import { createTheme } from '@mui/material/styles';
import { koKR } from '@mui/material/locale';

export type ThemeMode = 'light' | 'dark';
export type BrandKey =
  | 'green'
  | 'blue'
  | 'teal'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'slate';

export interface BrandPreset {
  key: BrandKey | 'custom';
  label: string;
  main: string;
  light: string;
  dark: string;
  secondary: string;
}

// 강조(브랜드) 색상 프리셋 — 기본은 앱 아이콘 그린
export const BRAND_PRESETS: BrandPreset[] = [
  { key: 'green', label: '그린', main: '#22a06b', light: '#4cbf8c', dark: '#167c50', secondary: '#0d7d52' },
  { key: 'blue', label: '블루', main: '#2f6fed', light: '#5b8ef5', dark: '#1e4fb8', secondary: '#1856c9' },
  { key: 'teal', label: '틸', main: '#0d9488', light: '#2dd4bf', dark: '#0f766e', secondary: '#0f766e' },
  { key: 'indigo', label: '인디고', main: '#4f46e5', light: '#7c74f0', dark: '#3730a3', secondary: '#4338ca' },
  { key: 'violet', label: '퍼플', main: '#7c3aed', light: '#9d68f5', dark: '#5b21b6', secondary: '#6d28d9' },
  { key: 'rose', label: '로즈', main: '#e11d48', light: '#f43f6e', dark: '#a5133a', secondary: '#be123c' },
  { key: 'amber', label: '앰버', main: '#d97706', light: '#f59e0b', dark: '#b45309', secondary: '#b45309' },
  { key: 'slate', label: '슬레이트', main: '#475569', light: '#64748b', dark: '#334155', secondary: '#334155' },
];

// ───────── 색상 유틸(HSL ↔ HEX) — 커스텀 색상 파생에 사용 ─────────
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const h0 = hex.replace('#', '');
  const r = parseInt(h0.slice(0, 2), 16) / 255;
  const g = parseInt(h0.slice(2, 4), 16) / 255;
  const b = parseInt(h0.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// 라이트값을 delta 만큼 조정(클램프)
function shiftLightness(hex: string, delta: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + delta)));
}

// 커스텀 메인 색상 하나로 라이트/다크/보조색을 파생
export function derivePreset(main: string): BrandPreset {
  return {
    key: 'custom',
    label: '커스텀',
    main,
    light: shiftLightness(main, 12),
    dark: shiftLightness(main, -14),
    secondary: shiftLightness(main, -7),
  };
}

// 브랜드 키(또는 커스텀 색)로 실제 색상 프리셋을 해석
export function resolveBrandPreset(brand: BrandKey | 'custom', customColor?: string): BrandPreset {
  if (brand === 'custom') return derivePreset(customColor || '#22a06b');
  return BRAND_PRESETS.find((p) => p.key === brand) ?? BRAND_PRESETS[0];
}

const FONT_FAMILY = [
  '"Noto Sans KR"',
  'sans-serif',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  '"Apple SD Gothic Neo"',
  '"Malgun Gothic"',
  '"맑은 고딕"',
].join(',');

// 브랜드 색상(프리셋 또는 커스텀) + 라이트/다크 모드로 테마 생성
export function buildTheme(brandKey: BrandKey | 'custom', mode: ThemeMode, customColor?: string) {
  const b = resolveBrandPreset(brandKey, customColor);
  const isDark = mode === 'dark';
  return createTheme(
    {
      palette: {
        mode,
        primary: { main: b.main, light: b.light, dark: b.dark, contrastText: '#ffffff' },
        secondary: { main: b.secondary, light: b.light, dark: b.dark, contrastText: '#ffffff' },
        background: isDark
          ? { default: '#0f1512', paper: '#1a211d' } // 살짝 초록빛이 도는 다크 뉴트럴
          : { default: '#f2f6f4', paper: '#ffffff' }, // 살짝 초록빛이 도는 라이트 뉴트럴
      },
      shape: {
        borderRadius: 10,
      },
      typography: {
        fontFamily: FONT_FAMILY,
        h6: { fontWeight: 700 },
        subtitle1: { fontWeight: 600, fontFamily: '"Noto Sans KR", sans-serif' },
      },
      components: {
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
        },
        MuiPaper: {
          styleOverrides: { root: { backgroundImage: 'none' } },
        },
      },
    },
    koKR,
  );
}

// 기본 테마(라이트·그린) — 하위 호환용
export const theme = buildTheme('green', 'light');

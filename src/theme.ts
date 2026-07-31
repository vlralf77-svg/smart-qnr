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
  key: BrandKey;
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

// 브랜드 색상 + 라이트/다크 모드로 테마 생성
export function buildTheme(brandKey: BrandKey, mode: ThemeMode) {
  const b = BRAND_PRESETS.find((p) => p.key === brandKey) ?? BRAND_PRESETS[0];
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

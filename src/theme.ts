import { createTheme } from '@mui/material/styles';
import { koKR } from '@mui/material/locale';

// SmartQnR 브랜드 그린 — 앱 아이콘(초록) 기준으로 전체 테마 통일
const BRAND_GREEN = '#22a06b';

export const theme = createTheme(
  {
    palette: {
      primary: {
        main: BRAND_GREEN,
        light: '#4cbf8c',
        dark: '#167c50',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#0d7d52', // 딥 그린 — 환자 화면 등 보조 강조
        light: '#2f9d70',
        dark: '#095c3c',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f2f6f4', // 살짝 초록빛이 도는 뉴트럴 배경
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      // 웹에서 일반적으로 쓰이는 시스템 폰트 스택
      //  (Windows: Latin=Segoe UI, 한글=맑은 고딕 / macOS: SF·Apple SD Gothic Neo)
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        '"Apple SD Gothic Neo"',
        '"Noto Sans KR"',
        '"Malgun Gothic"',
        '"맑은 고딕"',
        'sans-serif',
      ].join(','),
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
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

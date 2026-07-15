import { createTheme } from '@mui/material/styles';
import { koKR } from '@mui/material/locale';

// LHospital 브랜드 네이비 (작업지시서 §8 Phase3)
const BRAND_NAVY = '#1E3A5F';

export const theme = createTheme(
  {
    palette: {
      primary: {
        main: BRAND_NAVY,
        light: '#3d5a80',
        dark: '#12233b',
      },
      secondary: {
        main: '#4A90D9',
      },
      background: {
        default: '#f4f6f8',
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: [
        'Pretendard',
        '-apple-system',
        'BlinkMacSystemFont',
        'Malgun Gothic',
        '맑은 고딕',
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

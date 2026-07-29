// 로그인 화면 — 프로그램 실행 시 최초 진입 (시안 B: 중앙 카드·클리닉형)
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AppIcon from '@/components/AppIcon';
import { IS_DEMO } from '@/config';
import { useAuthStore } from '@/store/useAuthStore';
import { APP_VERSION } from '@/version';

interface LocationState {
  from?: string;
}

// 두 로그인 화면(문진관리/문진입력) 카드 규격을 동일하게 — 내용이 달라도 같은 박스
//  · 상단 강조바를 위해 카드 자체는 여백 없이(overflow hidden), 내부 본문에서 여백을 준다.
export const LOGIN_CARD_SX = {
  p: 0,
  minHeight: 468,
  borderRadius: 3,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 2px rgba(15,23,42,.05), 0 22px 44px -26px rgba(15,23,42,.28)',
} as const;

// 카드 내부 본문 여백(강조바 아래)
export const LOGIN_BODY_SX = {
  p: 4,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
} as const;

// 카드 상단 강조바 — 앱 브랜드(네이비) 그라데이션
export function LoginAccentBar() {
  return (
    <Box
      sx={{
        height: 5,
        flexShrink: 0,
        background: (t) =>
          `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.primary.light})`,
      }}
    />
  );
}

// 로그인 화면 상단 토글 — 선택된 쪽을 진한 채움색으로, 높이는 고정(두 화면 동일)
export const TOGGLE_SX = {
  mb: 3,
  '& .MuiToggleButton-root': {
    flex: 1,
    fontWeight: 700,
    height: 42, // 고정 높이 — 화면 전환 시에도 토글 크기가 변하지 않도록
    py: 0,
    lineHeight: 1.2,
    fontSize: 14,
    color: 'text.secondary',
    borderColor: 'divider',
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      '&:hover': { bgcolor: 'primary.dark' },
    },
  },
} as const;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginByIdOnly, error } = useAuthStore();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const from = (location.state as LocationState | null)?.from ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(id.trim(), pw)) navigate(from, { replace: true });
  };

  // Ctrl+Q: 아이디만 맞으면 비밀번호 없이 로그인 — 데모(시연) 모드에서만 활성.
  useEffect(() => {
    if (!IS_DEMO) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        void loginByIdOnly(id).then((ok) => {
          if (ok) navigate(from, { replace: true });
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, from, loginByIdOnly, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper variant="outlined" sx={LOGIN_CARD_SX}>
          <LoginAccentBar />
          <Box sx={LOGIN_BODY_SX}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              color="primary"
              value="admin"
              onChange={(_e, v) => {
                if (v === 'patient') navigate('/patient/login');
              }}
              sx={TOGGLE_SX}
            >
              <ToggleButton value="admin">문진관리</ToggleButton>
              <ToggleButton value="patient">문진입력</ToggleButton>
            </ToggleButtonGroup>

            <Stack alignItems="center" spacing={1} mb={3}>
              <AppIcon size={56} />
              <Typography variant="h6" fontWeight={800}>
                SmartQnR 문진관리
              </Typography>
              <Typography variant="body2" color="text.secondary">
                로그인이 필요합니다
              </Typography>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="아이디"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  fullWidth
                  autoFocus
                  size="small"
                  autoComplete="username"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="비밀번호"
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  fullWidth
                  size="small"
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPw((v) => !v)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          {showPw ? (
                            <VisibilityOff fontSize="small" />
                          ) : (
                            <Visibility fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" size="large" fullWidth>
                  로그인
                </Button>
              </Stack>
            </form>

            <Box sx={{ flex: 1 }} />
            <Stack alignItems="center" spacing={0.25} sx={{ mt: 2 }}>
              {IS_DEMO && (
                <Typography variant="caption" color="text.disabled" textAlign="center">
                  단축키: 아이디 입력 후 Ctrl+Q
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled">
                버전 v{APP_VERSION}
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

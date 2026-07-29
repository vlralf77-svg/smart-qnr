// 로그인 화면 — 프로그램 실행 시 최초 진입 (시안 C: 몰입형·트렌디 / 글래스 카드)
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

// 몰입형 배경 — 앱 브랜드 그린 그라데이션 메시 위 딥그린 베이스 (두 로그인 화면 공용)
export const LOGIN_SCREEN_SX = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: 2,
  background: `
    radial-gradient(120% 90% at 12% 8%, rgba(34,160,107,0.45), transparent 60%),
    radial-gradient(110% 100% at 92% 100%, rgba(13,125,82,0.55), transparent 55%),
    #0b1811`,
} as const;

// 반투명 글래스 카드 — 두 로그인 화면(문진관리/문진입력) 규격 동일
export const LOGIN_CARD_SX = {
  width: '100%',
  p: 3.25,
  borderRadius: '22px',
  minHeight: 430,
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 30px 70px -30px rgba(0,0,0,0.6)',
} as const;

// 입력창 — 살짝 둥근 모서리 + 반투명 배경으로 글래스 카드와 어울리게
export const LOGIN_FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: 'rgba(255,255,255,0.65)',
  },
} as const;

// 상단 알약형 토글(문진관리/문진입력) — 선택된 쪽은 브랜드색 채움, 높이 고정(두 화면 동일)
export const TOGGLE_SX = {
  mb: 2.5,
  p: '4px',
  bgcolor: 'rgba(15,23,42,0.06)',
  borderRadius: '999px',
  '& .MuiToggleButtonGroup-grouped': {
    m: 0,
    flex: 1,
    border: 0,
    borderRadius: '999px !important',
    fontWeight: 700,
    height: 36,
    py: 0,
    lineHeight: 1.2,
    fontSize: 13.5,
    color: 'text.secondary',
    '&:not(:first-of-type)': { ml: '4px' },
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: '#fff',
      boxShadow: '0 6px 14px -6px rgba(34,160,107,0.7)',
      '&:hover': { bgcolor: 'primary.dark' },
    },
  },
} as const;

// 알약형 기본 버튼(제출)
export const LOGIN_BTN_SX = {
  borderRadius: '999px',
  py: 1.15,
  fontWeight: 800,
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
    <Box sx={LOGIN_SCREEN_SX}>
      <Container maxWidth="xs">
        <Paper elevation={0} sx={LOGIN_CARD_SX}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
            <AppIcon size={44} />
            <Box>
              <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
                SmartQnR
              </Typography>
              <Typography variant="caption" color="text.secondary">
                문진관리 시스템
              </Typography>
            </Box>
          </Stack>

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

          <form onSubmit={handleSubmit}>
            <Stack spacing={1.75}>
              <TextField
                label="아이디"
                value={id}
                onChange={(e) => setId(e.target.value)}
                fullWidth
                autoFocus
                size="small"
                autoComplete="username"
                sx={LOGIN_FIELD_SX}
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
                sx={LOGIN_FIELD_SX}
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
              <Button type="submit" variant="contained" size="large" fullWidth sx={LOGIN_BTN_SX}>
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
        </Paper>
      </Container>
    </Box>
  );
}

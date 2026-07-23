// 로그인 화면 — 프로그램 실행 시 최초 진입
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
import AppIcon from '@/components/AppIcon';
import { useAuthStore } from '@/store/useAuthStore';
import { APP_VERSION } from '@/version';

interface LocationState {
  from?: string;
}

// 로그인 화면 상단 토글 — 선택된 쪽을 진한 채움색으로 명확히 구분
export const TOGGLE_SX = {
  mb: 3,
  '& .MuiToggleButton-root': {
    flex: 1,
    fontWeight: 700,
    py: 1,
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

  // Ctrl+Q: 아이디만 맞으면 비밀번호 없이 로그인(오프라인 전용 단축)
  useEffect(() => {
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
      }}
    >
      <Container maxWidth="xs">
        <Paper variant="outlined" sx={{ p: 4 }}>
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
            <AppIcon size={64} />
            <Typography variant="h6" fontWeight={700}>
              SmartQnR 문진관리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              로그인이 필요합니다
            </Typography>
            <Typography variant="caption" color="text.disabled">
              버전 v{APP_VERSION}
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
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw((v) => !v)}
                        edge="end"
                        size="small"
                        tabIndex={-1}
                      >
                        {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" fullWidth>
                로그인
              </Button>
              <Typography variant="caption" color="text.disabled" textAlign="center">
                단축키: 아이디 입력 후 Ctrl+Q
              </Typography>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

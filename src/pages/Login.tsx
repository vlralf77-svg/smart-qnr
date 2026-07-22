// 로그인 화면 — 프로그램 실행 시 최초 진입
import { useState } from 'react';
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
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AppIcon from '@/components/AppIcon';
import { useAuthStore } from '@/store/useAuthStore';
import { APP_VERSION } from '@/version';

interface LocationState {
  from?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error } = useAuthStore();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const from = (location.state as LocationState | null)?.from ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(id.trim(), pw)) navigate(from, { replace: true });
  };

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
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

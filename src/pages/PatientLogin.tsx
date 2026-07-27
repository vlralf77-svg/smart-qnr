// 환자 로그인 — 환자번호만 입력
//  링크로 토큰(?t=...)을 전달하면 환자번호를 노출하지 않고 자동 로그인 후 목록으로 이동.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decodePatientToken } from '@/utils/patientToken';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import { usePatientStore, TEST_PATIENT_NO, PatientIdType } from '@/store/usePatientStore';
import { APP_VERSION } from '@/version';
import { IS_DEMO } from '@/config';
import { TOGGLE_SX, LOGIN_CARD_SX } from './Login';

export default function PatientLogin() {
  const navigate = useNavigate();
  const { login, loginByNumber, error } = usePatientStore();
  const [params] = useSearchParams();
  // 링크에 담긴 토큰(?t=... / ?token=...)을 환자번호로 복원(번호는 URL에 노출 안 됨)
  const token = params.get('t') ?? params.get('token') ?? '';
  const linkedNo = token ? decodePatientToken(token) : null;
  const [name, setName] = useState('');
  const [idType, setIdType] = useState<PatientIdType>('regno');
  const [idValue, setIdValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login({ name, idType, idValue })) navigate('/patient/forms', { replace: true });
  };

  // 링크로 토큰이 전달되면 자동 로그인 → 문진 목록으로 바로 이동
  useEffect(() => {
    if (linkedNo && loginByNumber(linkedNo)) {
      navigate('/patient/forms', { replace: true });
    }
    // 최초 1회만 시도(입력값 변경 시 재시도 안 함)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            value="patient"
            onChange={(_e, v) => {
              if (v === 'admin') navigate('/login');
            }}
            sx={TOGGLE_SX}
          >
            <ToggleButton value="admin">문진관리</ToggleButton>
            <ToggleButton value="patient">문진입력</ToggleButton>
          </ToggleButtonGroup>

          <Stack alignItems="center" spacing={1} mb={3}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'secondary.main',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EditNoteRoundedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              문진 작성
            </Typography>
            <Typography variant="body2" color="text.secondary">
              환자 이름과 번호를 입력해 주세요
            </Typography>
            <Typography variant="caption" color="text.disabled">
              버전 v{APP_VERSION}
            </Typography>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="환자 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                autoFocus
                placeholder="예: 홍길동"
              />

              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                color="secondary"
                value={idType}
                onChange={(_e, v: PatientIdType | null) => {
                  if (v) {
                    setIdType(v);
                    setIdValue('');
                  }
                }}
              >
                <ToggleButton value="regno">환자번호</ToggleButton>
                <ToggleButton value="rrn">주민등록번호</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                label={idType === 'rrn' ? '주민등록번호' : '환자번호'}
                value={idValue}
                onChange={(e) => setIdValue(e.target.value)}
                fullWidth
                inputMode="numeric"
                inputProps={idType === 'rrn' ? { maxLength: 14 } : undefined}
                placeholder={
                  idType === 'rrn'
                    ? '앞 6자리-뒤 7자리'
                    : IS_DEMO
                      ? TEST_PATIENT_NO
                      : '환자번호'
                }
              />

              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" fullWidth>
                시작하기
              </Button>
              {IS_DEMO && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  테스트: 이름 아무거나 · 번호 {TEST_PATIENT_NO}
                </Typography>
              )}
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

// 환자 로그인 — 환자번호만 입력
//  링크로 환자번호를 미리 전달하면(?no=환자번호) 자동 로그인 후 문진 목록으로 바로 이동.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { usePatientStore, TEST_PATIENT_NO } from '@/store/usePatientStore';
import { APP_VERSION } from '@/version';

export default function PatientLogin() {
  const navigate = useNavigate();
  const { login, error } = usePatientStore();
  const [params] = useSearchParams();
  // 링크에 담긴 환자번호(?no=... / ?patientNo=...)로 자동 채움
  const linkedNo = params.get('no') ?? params.get('patientNo') ?? '';
  const [no, setNo] = useState(linkedNo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(no)) navigate('/patient/forms', { replace: true });
  };

  // 링크로 환자번호가 전달되면 자동 로그인 → 문진 목록으로 바로 이동
  useEffect(() => {
    if (linkedNo && login(linkedNo)) {
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
        <Paper variant="outlined" sx={{ p: 4 }}>
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
              <AssignmentIndIcon />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              문진 작성
            </Typography>
            <Typography variant="body2" color="text.secondary">
              환자번호를 입력해 주세요
            </Typography>
            <Typography variant="caption" color="text.disabled">
              버전 v{APP_VERSION}
            </Typography>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="환자번호"
                value={no}
                onChange={(e) => setNo(e.target.value)}
                fullWidth
                autoFocus
                inputMode="numeric"
                placeholder={TEST_PATIENT_NO}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" fullWidth>
                시작하기
              </Button>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                테스트 환자번호: {TEST_PATIENT_NO}
              </Typography>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

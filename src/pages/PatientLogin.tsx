// 환자 로그인 — 환자번호만 입력
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function PatientLogin() {
  const navigate = useNavigate();
  const { login, error } = usePatientStore();
  const [no, setNo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(no)) navigate('/patient/forms', { replace: true });
  };

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

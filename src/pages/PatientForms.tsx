// 환자용 문진 목록 — 테스트 대상(testFlag) 문진만 표시
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { FormSchema } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';

export default function PatientForms() {
  const navigate = useNavigate();
  const { patientNo, logout } = usePatientStore();
  const localForms = useFormsStore((s) => s.forms);
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isBackendEnabled) {
        try {
          const list = await api.publicListForms();
          if (!cancelled) setForms(list);
        } catch {
          if (!cancelled) setForms([]);
        }
      } else {
        // 오프라인: 테스트 대상 문진만
        setForms(localForms.filter((f) => f.testFlag));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="secondary" elevation={0}>
        <Toolbar>
          <AssignmentIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            문진 작성
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9, mr: 1 }}>
            환자 {patientNo}
          </Typography>
          <Button
            color="inherit"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={() => {
              logout();
              navigate('/patient/login', { replace: true });
            }}
          >
            나가기
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          아래 문진을 선택해 작성해 주세요.
        </Typography>

        {loading ? (
          <Typography color="text.secondary">불러오는 중…</Typography>
        ) : forms.length === 0 ? (
          <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">작성할 문진이 없습니다.</Typography>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {forms.map((f) => (
              <Card key={f.id} variant="outlined">
                <CardActionArea
                  onClick={() => navigate(`/patient/respond/${f.id}`)}
                  sx={{ p: 2 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AssignmentIcon color="secondary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {f.title}
                      </Typography>
                      {f.description && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {f.description}
                        </Typography>
                      )}
                    </Box>
                    <Chip size="small" label="작성" color="secondary" variant="outlined" />
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

// 환자용 문진 목록 — 테스트 대상(testFlag) 문진만. 작성 완료 표시·일시 노출.
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { FormResponse, FormSchema } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';

function fmt(ts?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('ko-KR');
  } catch {
    return ts;
  }
}

export default function PatientForms() {
  const navigate = useNavigate();
  const { patientNo, logout } = usePatientStore();
  const localForms = useFormsStore((s) => s.forms);
  const localResponses = useFormsStore((s) => s.responses);
  const [forms, setForms] = useState<FormSchema[]>([]);
  // formId -> 가장 최근 응답
  const [responses, setResponses] = useState<Record<string, FormResponse>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let fList: FormSchema[] = [];
      let rList: FormResponse[] = [];
      if (isBackendEnabled) {
        try {
          fList = await api.publicListForms();
        } catch {
          fList = [];
        }
        try {
          rList = patientNo ? await api.publicMyResponses(patientNo) : [];
        } catch {
          rList = [];
        }
      } else {
        fList = localForms.filter((f) => f.testFlag);
        rList = localResponses.filter((r) => r.patientId === patientNo);
      }
      if (cancelled) return;
      // 최근 응답만 남김(formId 기준)
      const map: Record<string, FormResponse> = {};
      for (const r of rList) {
        const cur = map[r.formId];
        if (!cur || (r.submittedAt ?? '') > (cur.submittedAt ?? '')) map[r.formId] = r;
      }
      setForms(fList);
      setResponses(map);
      setLoading(false);
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
          아래 문진을 선택해 작성해 주세요. 작성한 문진은 눌러서 내용을 확인할 수 있습니다.
        </Typography>

        {loading ? (
          <Typography color="text.secondary">불러오는 중…</Typography>
        ) : forms.length === 0 ? (
          <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">작성할 문진이 없습니다.</Typography>
          </Card>
        ) : (
          <Stack spacing={1.5}>
            {forms.map((f) => {
              const done = responses[f.id];
              return (
                <Card key={f.id} variant="outlined">
                  <CardActionArea
                    onClick={() =>
                      navigate(done ? `/patient/view/${f.id}` : `/patient/respond/${f.id}`)
                    }
                    sx={{ p: 2 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {done ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <AssignmentIcon color="secondary" />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {f.title}
                        </Typography>
                        {done ? (
                          <Typography variant="caption" color="success.main">
                            작성완료 · {fmt(done.submittedAt)}
                          </Typography>
                        ) : (
                          f.description && (
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {f.description}
                            </Typography>
                          )
                        )}
                      </Box>
                      {done ? (
                        <Chip size="small" label="작성완료" color="success" />
                      ) : (
                        <Chip size="small" label="작성" color="secondary" variant="outlined" />
                      )}
                    </Stack>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

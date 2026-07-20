// 환자용 — 작성한 문진 응답 조회(읽기 전용)
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { AnswerValue, FormSchema, FormResponse, Question } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';

function fmtDate(ts?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('ko-KR');
  } catch {
    return ts;
  }
}

/** 문항 유형에 맞춰 응답 값을 사람이 읽을 수 있는 문자열로 */
function formatAnswer(q: Question, v: AnswerValue): string {
  if (v === null || v === undefined || v === '') return '(미응답)';
  if (q.type === 'boolean') return v === true || v === 'true' ? '예' : '아니오';
  if (q.type === 'radio' || q.type === 'select') {
    const opt = q.options?.find((o) => o.value === v);
    return opt?.label ?? String(v);
  }
  if (q.type === 'checkbox') {
    const arr = Array.isArray(v) ? v : [v];
    return arr
      .map((x) => q.options?.find((o) => o.value === x)?.label ?? String(x))
      .join(', ');
  }
  return String(v);
}

export default function PatientView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const patientNo = usePatientStore((s) => s.patientNo);
  const localForms = useFormsStore((s) => s.forms);
  const localResponses = useFormsStore((s) => s.responses);
  const [form, setForm] = useState<FormSchema | undefined>();
  const [response, setResponse] = useState<FormResponse | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!formId) return;
      let f: FormSchema | undefined;
      let r: FormResponse | undefined;
      if (isBackendEnabled) {
        try {
          f = await api.publicGetForm(formId);
        } catch {
          f = undefined;
        }
        try {
          const list = patientNo ? await api.publicMyResponses(patientNo) : [];
          r = list
            .filter((x) => x.formId === formId)
            .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
        } catch {
          r = undefined;
        }
      } else {
        f = localForms.find((x) => x.id === formId);
        r = localResponses
          .filter((x) => x.formId === formId && x.patientId === patientNo)
          .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
      }
      if (cancelled) return;
      setForm(f);
      setResponse(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const questions = form ? form.sections.flatMap((s) => s.questions) : [];
  const answers = response?.answers ?? {};

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="secondary" elevation={0}>
        <Toolbar variant="dense">
          <Button
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/patient/forms')}
          >
            목록
          </Button>
          <Box sx={{ flex: 1 }} />
          {response && (
            <Button
              color="inherit"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/patient/respond/${formId}`)}
            >
              수정
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Typography color="text.secondary">불러오는 중…</Typography>
        ) : !form ? (
          <Alert severity="error">문진을 찾을 수 없습니다.</Alert>
        ) : !response ? (
          <Alert severity="warning">아직 작성한 내용이 없습니다.</Alert>
        ) : (
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" fontWeight={700}>
              {form.title}
            </Typography>
            <Typography variant="caption" color="success.main">
              작성완료 · {fmtDate(response.submittedAt)} · 환자 {response.patientId}
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              {questions
                .filter((q) => q.type !== 'info')
                .map((q) => (
                  <Box key={q.id}>
                    <Typography variant="body2" fontWeight={700} color="text.secondary">
                      {q.label}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.3, whiteSpace: 'pre-wrap' }}>
                      {formatAnswer(q, answers[q.id] ?? null)}
                    </Typography>
                  </Box>
                ))}
            </Stack>
          </Paper>
        )}
      </Container>
    </Box>
  );
}

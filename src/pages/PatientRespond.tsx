// 환자용 문진 작성/제출
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AnswerValue, FormSchema } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';
import { uid } from '@/utils/id';
import FormRenderer from '@/components/renderer/FormRenderer';
import DisplayModeToggle from '@/components/DisplayModeToggle';
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout';

export default function PatientRespond() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const patientNo = usePatientStore((s) => s.patientNo);
  const localForms = useFormsStore((s) => s.forms);
  const localResponses = useFormsStore((s) => s.responses);
  const [form, setForm] = useState<FormSchema | undefined>();
  // 기존 응답(있으면 수정 모드)
  const [prev, setPrev] = useState<{ responseId: string; answers: Record<string, AnswerValue> } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const isMobileLayout = useIsMobileLayout();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!formId) return;
      if (isBackendEnabled) {
        try {
          const f = await api.publicGetForm(formId);
          if (!cancelled) setForm(f);
        } catch {
          if (!cancelled) setForm(undefined);
        }
        try {
          const list = patientNo ? await api.publicMyResponses(patientNo) : [];
          const r = list
            .filter((x) => x.formId === formId)
            .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
          if (!cancelled && r) setPrev({ responseId: r.responseId, answers: r.answers ?? {} });
        } catch {
          /* 무시 */
        }
      } else {
        setForm(localForms.find((f) => f.id === formId && f.testFlag));
        const r = localResponses
          .filter((x) => x.formId === formId && x.patientId === patientNo)
          .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
        if (r) setPrev({ responseId: r.responseId, answers: r.answers ?? {} });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const handleSubmit = async (answers: Record<string, AnswerValue>) => {
    if (!form) return;
    const response = {
      // 수정이면 기존 응답 id 로 갱신, 아니면 새로 발급
      responseId: prev?.responseId ?? uid('resp'),
      formId: form.id,
      formVersion: form.version,
      patientId: patientNo ?? undefined,
      submittedAt: new Date().toISOString(),
      answers,
    };
    try {
      if (isBackendEnabled) await api.publicSubmitResponse(response);
      else useFormsStore.getState().addResponse(response);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      /* 유지 */
    }
  };

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
          <DisplayModeToggle />
        </Toolbar>
      </AppBar>

      <Container maxWidth={isMobileLayout ? 'sm' : 'md'} sx={{ py: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Typography color="text.secondary">불러오는 중…</Typography>
        ) : !form ? (
          <Alert severity="error">문진을 찾을 수 없습니다.</Alert>
        ) : submitted ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              제출이 완료되었습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              응답해 주셔서 감사합니다.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="outlined" onClick={() => navigate('/patient/forms')}>
                목록으로
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <FormRenderer
              schema={form}
              onSubmit={handleSubmit}
              defaultValues={prev?.answers}
              submitLabel={prev ? '수정 완료' : '제출하기'}
              allowSubmitAnywhere={!!prev}
            />
          </Paper>
        )}
      </Container>
    </Box>
  );
}

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
import FontScaleToggle from '@/components/FontScaleToggle';
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout';
import { useFontScale, FONT_ZOOM } from '@/store/useFontScale';
import { formAtVersion } from '@/utils/formVersion';

export default function PatientRespond() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const patientNo = usePatientStore((s) => s.patientNo);
  const localForms = useFormsStore((s) => s.forms);
  const localResponses = useFormsStore((s) => s.responses);
  // 현재 확정본. 실제로 화면에 쓰는 문진은 아래 versioned.form(수정 시 작성 당시 버전)
  const [latest, setLatest] = useState<FormSchema | undefined>();
  // 기존 응답(있으면 수정 모드)
  const [prev, setPrev] = useState<{
    responseId: string;
    answers: Record<string, AnswerValue>;
    formVersion?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const isMobileLayout = useIsMobileLayout();
  const fontScale = useFontScale((s) => s.scale);
  const zoom = FONT_ZOOM[fontScale];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!formId) return;
      if (isBackendEnabled) {
        try {
          const f = await api.publicGetForm(formId);
          if (!cancelled) setLatest(f);
        } catch {
          if (!cancelled) setLatest(undefined);
        }
        try {
          const list = patientNo ? await api.publicMyResponses(patientNo) : [];
          const r = list
            .filter((x) => x.formId === formId)
            .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
          if (!cancelled && r)
            setPrev({
              responseId: r.responseId,
              answers: r.answers ?? {},
              formVersion: r.formVersion,
            });
        } catch {
          /* 무시 */
        }
      } else {
        setLatest(localForms.find((f) => f.id === formId && f.testFlag));
        const r = localResponses
          .filter((x) => x.formId === formId && x.patientId === patientNo)
          .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
        if (r)
          setPrev({
            responseId: r.responseId,
            answers: r.answers ?? {},
            formVersion: r.formVersion,
          });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  // 수정 모드면 작성 당시 버전(v3 등)으로 보여 준다 — 환자가 답한 그 문진 그대로.
  //  새로 작성할 때는 당연히 현재 확정본을 쓴다.
  const versioned = formAtVersion(latest, prev?.formVersion);
  const form = versioned.form;

  const handleSubmit = async (answers: Record<string, AnswerValue>) => {
    if (!form) return;
    const response = {
      // 수정이면 기존 응답 id 로 갱신, 아니면 새로 발급
      responseId: prev?.responseId ?? uid('resp'),
      formId: form.id,
      // 수정이면 작성 당시 버전을 그대로 유지한다(화면도 그 버전으로 보여 줬으므로)
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
      <AppBar position="sticky" color="secondary" elevation={0}>
        <Toolbar variant="dense">
          <Button
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/patient/forms')}
          >
            목록
          </Button>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <FontScaleToggle />
          </Stack>
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
          <>
            {versioned.isOld && (
              <Alert severity="info" sx={{ mb: 2 }}>
                작성 당시 버전(<b>v{prev?.formVersion}</b>) 문진으로 수정합니다. 현재 문진은 v
                {versioned.currentVersion} 입니다.
              </Alert>
            )}
            {versioned.missing && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                작성 당시 버전(v{prev?.formVersion})의 문진 내용이 보관되어 있지 않아 현재 버전(v
                {versioned.currentVersion})으로 표시합니다.
              </Alert>
            )}
            <Paper sx={{ p: { xs: 2, sm: 3 } }} style={{ zoom }}>
              <FormRenderer
                schema={form}
                onSubmit={handleSubmit}
                defaultValues={prev?.answers}
                submitLabel={prev ? '수정 완료' : '제출하기'}
                allowSubmitAnywhere={!!prev}
              />
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
}

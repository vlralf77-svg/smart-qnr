// QNR004 응답 화면 (환자용, 웹/모바일 공용)
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AnswerValue } from '@/types/schema';
import { useFormsStore } from '@/store/useFormsStore';
import { uid } from '@/utils/id';
import FormRenderer from '@/components/renderer/FormRenderer';

export default function ResponseForm() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { getForm, addResponse } = useFormsStore();
  const [submitted, setSubmitted] = useState(false);

  const form = useMemo(() => (formId ? getForm(formId) : undefined), [formId, getForm]);

  if (!form) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">문진을 찾을 수 없습니다.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
          목록으로
        </Button>
      </Container>
    );
  }

  if (form.status !== 'published') {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning">아직 발행되지 않은 문진입니다. 에디터에서 발행 후 응답할 수 있습니다.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/')}>
          목록으로
        </Button>
      </Container>
    );
  }

  const handleSubmit = (answers: Record<string, AnswerValue>) => {
    addResponse({
      responseId: uid('resp'),
      formId: form.id,
      formVersion: form.version,
      submittedAt: new Date().toISOString(),
      answers,
    });
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="sm">
        {submitted ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              제출이 완료되었습니다
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              응답해 주셔서 감사합니다.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="outlined" onClick={() => navigate('/')}>
                목록으로
              </Button>
              <Button variant="text" onClick={() => setSubmitted(false)}>
                다시 응답
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <FormRenderer schema={form} onSubmit={handleSubmit} />
          </Paper>
        )}
      </Container>
    </Box>
  );
}

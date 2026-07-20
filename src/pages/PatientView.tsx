// 환자용 — 작성한 문진 응답 조회(읽기 전용)
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { AnswerValue, FormSchema, FormResponse, Question } from '@/types/schema';
import { orderedQuestions } from '@/utils/questionOrder';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';

// 섹션별 파스텔 색상(편집기 섹션 색상 순서와 동일한 색조: 파랑→초록→주황…)
//  header=연한 배경, text=진한 같은 계열 글자, accent=중간 톤(번호 배지·답변 강조바)
const SECTION_PALETTE = [
  { header: '#e3f2fd', text: '#1565c0', accent: '#64b5f6' }, // 파랑
  { header: '#e8f5e9', text: '#2e7d32', accent: '#81c784' }, // 초록
  { header: '#fff3e0', text: '#e65100', accent: '#ffb74d' }, // 주황
  { header: '#f3e5f5', text: '#6a1b9a', accent: '#ba68c8' }, // 보라
  { header: '#e0f7fa', text: '#00838f', accent: '#4dd0e1' }, // 청록
  { header: '#fce4ec', text: '#ad1457', accent: '#f06292' }, // 분홍
  { header: '#efebe9', text: '#4e342e', accent: '#a1887f' }, // 갈색
  { header: '#eceff1', text: '#37474f', accent: '#90a4ae' }, // 청회색
];

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

  const answers = response?.answers ?? {};
  // 순서 = 섹션 순서 → 섹션 내 읽기순서. 그 순서대로 전체 질문 번호 매김(안내문 제외)
  const qNo: Record<string, number> = {};
  if (form) {
    let n = 0;
    form.sections.forEach((s) =>
      orderedQuestions(s).forEach((q) => {
        if (q.type !== 'info') qNo[q.id] = ++n;
      }),
    );
  }

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

      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
        {loading ? (
          <Typography color="text.secondary">불러오는 중…</Typography>
        ) : !form ? (
          <Alert severity="error">문진을 찾을 수 없습니다.</Alert>
        ) : !response ? (
          <Alert severity="warning">아직 작성한 내용이 없습니다.</Alert>
        ) : (
          <>
            {/* 헤더(hero) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.2 }}>
                {form.title}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 1.2 }}
              >
                <Chip
                  size="small"
                  color="success"
                  icon={<CheckCircleOutlineIcon />}
                  label="작성완료"
                  sx={{ fontWeight: 700 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {fmtDate(response.submittedAt)}
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  ·
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  환자 {response.patientId}
                </Typography>
              </Stack>
            </Box>

            {/* 섹션 카드 — PC 2단(masonry), 모바일 1단 */}
            <Box sx={{ columnCount: { xs: 1, md: 2 }, columnGap: 2.5 }}>
              {form.sections.map((section, si) => {
                const qs = orderedQuestions(section).filter((q) => q.type !== 'info');
                if (qs.length === 0) return null;
                const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
                return (
                  <Paper
                    key={section.id}
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      breakInside: 'avoid',
                      mb: 2.5,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* 섹션 헤더 */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1.4,
                        bgcolor: pal.header,
                      }}
                    >
                      <Box
                        sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: pal.text, flexShrink: 0 }}
                      />
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        sx={{ color: pal.text, letterSpacing: 0.2 }}
                      >
                        {section.title}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="caption" sx={{ color: pal.text, opacity: 0.75 }}>
                        {qs.length}문항
                      </Typography>
                    </Box>

                    {/* 질문·답변 목록 */}
                    <Box>
                      {qs.map((q, idx) => {
                        const ans = formatAnswer(q, answers[q.id] ?? null);
                        const unanswered = ans === '(미응답)';
                        return (
                          <Box
                            key={q.id}
                            sx={{
                              display: 'flex',
                              gap: 1.5,
                              px: 2,
                              py: 1.5,
                              borderTop: idx === 0 ? 'none' : '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            {/* 번호 */}
                            <Typography
                              component="span"
                              sx={{
                                fontSize: 12.5,
                                fontWeight: 800,
                                color: pal.text,
                                minWidth: 16,
                                textAlign: 'right',
                                mt: '2px',
                                flexShrink: 0,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {qNo[q.id]}
                            </Typography>
                            {/* 라벨(질문) + 값(답변) */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  color: 'text.secondary',
                                  fontWeight: 600,
                                  letterSpacing: 0.2,
                                }}
                              >
                                {q.label}
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{
                                  mt: 0.4,
                                  pl: 1.25,
                                  borderLeft: '2px solid',
                                  borderColor: unanswered ? 'transparent' : pal.accent,
                                  fontWeight: unanswered ? 400 : 600,
                                  color: unanswered ? 'text.disabled' : 'text.primary',
                                  fontStyle: unanswered ? 'italic' : 'normal',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {ans}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}

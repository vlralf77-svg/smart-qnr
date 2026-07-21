// 환자용 — 작성한 문진 응답 조회(읽기 전용)
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
  Table,
  TableBody,
  TableCell,
  TableRow,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { AnswerValue, FormSchema, FormResponse, Question } from '@/types/schema';
import { orderedQuestions } from '@/utils/questionOrder';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';

// 섹션별 색상 — 채도를 낮춘 고급스러운 톤(편집기 섹션 색상 순서와 동일 색조)
//  tint=아주 옅은 배경, bar=중간 톤 강조, text=읽기 좋은 진한 같은 계열
const SECTION_PALETTE = [
  { tint: '#f3f6ff', bar: '#5b7cfa', text: '#3a4db3' }, // 블루
  { tint: '#f0faf5', bar: '#3f9d7c', text: '#2f7a5f' }, // 그린
  { tint: '#fdf6ec', bar: '#d59a4e', text: '#9c6a1c' }, // 앰버
  { tint: '#f7f4ff', bar: '#8b6fd0', text: '#6a4fb0' }, // 바이올렛
  { tint: '#edf9fa', bar: '#3fa3ad', text: '#2b7d86' }, // 틸
  { tint: '#fdf2f6', bar: '#d6738f', text: '#ad546e' }, // 로즈
  { tint: '#f3f5f8', bar: '#6b7a90', text: '#48546a' }, // 슬레이트
  { tint: '#f8f4f1', bar: '#a17c68', text: '#7a5a48' }, // 브라운
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
  // 모바일=카드 리스트 / PC=리포트 테이블 로 완전히 분리
  const isMobile = useMediaQuery('(max-width:899px)');
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
  const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
  type Pal = (typeof SECTION_PALETTE)[number];
  const sectionHeader = (title: string, pal: Pal, count: number) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 2.75,
        py: 1.9,
        bgcolor: pal.tint,
        borderBottom: '1px solid rgba(15,23,42,0.05)',
      }}
    >
      <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: pal.bar, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.2, color: pal.text }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: pal.text, opacity: 0.55 }}>
        {count}문항
      </Typography>
    </Box>
  );
  const cardSx = {
    borderRadius: 4,
    overflow: 'hidden',
    border: '1px solid rgba(15,23,42,0.06)',
    bgcolor: '#fff',
    boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 16px 32px -18px rgba(15,23,42,0.16)',
  } as const;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8' }}>
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
            <Box sx={{ mb: { xs: 3, sm: 4 } }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: 'text.disabled',
                  textTransform: 'uppercase',
                }}
              >
                문진 응답
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 24, sm: 30 },
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  lineHeight: 1.2,
                  mt: 0.5,
                  color: '#12213a',
                }}
              >
                {form.title}
              </Typography>
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 1.75 }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.25,
                    py: 0.4,
                    borderRadius: 999,
                    bgcolor: '#eaf7f0',
                    border: '1px solid #cfece0',
                  }}
                >
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e9d6e' }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#227954' }}>
                    작성 완료
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {fmtDate(response.submittedAt)}
                </Typography>
                <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  환자 {response.patientId}
                </Typography>
              </Stack>
            </Box>

            {isMobile ? (
              /* ───────── 모바일: 카드 리스트(라벨 위 / 값 아래) ───────── */
              <Stack spacing={2.5}>
                {form.sections.map((section, si) => {
                  const qs = orderedQuestions(section).filter((q) => q.type !== 'info');
                  if (qs.length === 0) return null;
                  const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
                  return (
                    <Paper key={section.id} elevation={0} sx={cardSx}>
                      {sectionHeader(section.title, pal, qs.length)}
                      <Box>
                        {qs.map((q, idx) => {
                          const ans = formatAnswer(q, answers[q.id] ?? null);
                          const unanswered = ans === '(미응답)';
                          return (
                            <Box
                              key={q.id}
                              sx={{
                                display: 'flex',
                                gap: 1.75,
                                px: 2.5,
                                py: 1.9,
                                borderTop: idx === 0 ? 'none' : '1px solid rgba(15,23,42,0.05)',
                              }}
                            >
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: pal.bar,
                                  mt: '3px',
                                  minWidth: 16,
                                  flexShrink: 0,
                                  letterSpacing: 0.5,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {pad2(qNo[q.id])}
                              </Typography>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    letterSpacing: 0.4,
                                    color: 'text.secondary',
                                  }}
                                >
                                  {q.label}
                                </Typography>
                                <Typography
                                  sx={{
                                    mt: 0.6,
                                    fontSize: 16,
                                    lineHeight: 1.45,
                                    fontWeight: unanswered ? 400 : 600,
                                    color: unanswered ? 'text.disabled' : '#1a2438',
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
              </Stack>
            ) : (
              /* ───────── PC: 리포트 테이블(항목 | 응답), 2단 배치 ───────── */
              <Box sx={{ columnCount: 2, columnGap: 3 }}>
                {form.sections.map((section, si) => {
                  const qs = orderedQuestions(section).filter((q) => q.type !== 'info');
                  if (qs.length === 0) return null;
                  const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
                  return (
                    <Paper
                      key={section.id}
                      elevation={0}
                      sx={{ ...cardSx, breakInside: 'avoid', mb: 3 }}
                    >
                      {sectionHeader(section.title, pal, qs.length)}
                      <Table size="small">
                        <TableBody>
                          {qs.map((q) => {
                            const ans = formatAnswer(q, answers[q.id] ?? null);
                            const unanswered = ans === '(미응답)';
                            return (
                              <TableRow
                                key={q.id}
                                sx={{ '&:last-child td': { borderBottom: 'none' } }}
                              >
                                {/* 항목(질문) */}
                                <TableCell
                                  sx={{
                                    width: '44%',
                                    verticalAlign: 'top',
                                    bgcolor: pal.tint,
                                    borderRight: '1px solid rgba(15,23,42,0.05)',
                                    borderBottom: '1px solid rgba(15,23,42,0.05)',
                                    py: 1.5,
                                  }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <Typography
                                      component="span"
                                      sx={{
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        color: pal.bar,
                                        mt: '2px',
                                        fontVariantNumeric: 'tabular-nums',
                                      }}
                                    >
                                      {pad2(qNo[q.id])}
                                    </Typography>
                                    <Typography
                                      sx={{ fontSize: 13, fontWeight: 700, color: pal.text, lineHeight: 1.4 }}
                                    >
                                      {q.label}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                {/* 응답(답변) */}
                                <TableCell
                                  sx={{
                                    verticalAlign: 'top',
                                    borderBottom: '1px solid rgba(15,23,42,0.05)',
                                    py: 1.5,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 15,
                                      lineHeight: 1.45,
                                      fontWeight: unanswered ? 400 : 600,
                                      color: unanswered ? 'text.disabled' : '#1a2438',
                                      fontStyle: unanswered ? 'italic' : 'normal',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {ans}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

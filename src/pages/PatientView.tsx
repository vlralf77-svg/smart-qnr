// 환자용 — 작성한 문진 응답 조회(읽기 전용)
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Toolbar,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  buildResponseImageDataUrl,
  downloadDataUrl,
  sanitizeFilename,
} from '@/utils/responseExport';
import { AnswerValue, FormSchema, FormResponse, Question, NON_INPUT_TYPES } from '@/types/schema';
import { orderedQuestions } from '@/utils/questionOrder';
import { computeScore, isScoringEnabled, scoringLabel } from '@/utils/scoring';
import { SECTION_PALETTE } from '@/theme/sectionPalette';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout';
import DisplayModeToggle from '@/components/DisplayModeToggle';

function fmtDate(ts?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('ko-KR');
  } catch {
    return ts;
  }
}

/** 응답 값을 (라벨, 강조색) 조각으로 분해 — 다중 선택은 선택지마다 개별 색 적용 */
interface AnsPart {
  label: string;
  color?: string;
}
function answerParts(q: Question, v: AnswerValue): AnsPart[] {
  if (v === null || v === undefined || v === '') return [{ label: '(미응답)' }];
  if (q.type === 'boolean') return [{ label: v === true || v === 'true' ? '예' : '아니오' }];
  if (q.type === 'radio' || q.type === 'select') {
    const opt = q.options?.find((o) => o.value === v);
    return [{ label: opt?.label ?? String(v), color: opt?.color }];
  }
  if (q.type === 'checkbox') {
    const arr = Array.isArray(v) ? v : [v];
    return arr.map((x) => {
      const o = q.options?.find((oo) => oo.value === x);
      return { label: o?.label ?? String(x), color: o?.color };
    });
  }
  return [{ label: String(v) }];
}

/** 응답 값 표시 — 강조색이 지정된 선택지만 색으로 강조(다중 선택 시 해당 항목만). */
function AnswerContent({
  q,
  v,
  fontSize,
  plainColor = '#1a2438',
}: {
  q: Question;
  v: AnswerValue;
  fontSize: number;
  plainColor?: string;
}) {
  const parts = answerParts(q, v);
  if (parts.length === 1 && parts[0].label === '(미응답)') {
    return (
      <Typography
        component="span"
        sx={{
          fontSize,
          lineHeight: 1.45,
          fontWeight: 400,
          fontStyle: 'italic',
          color: 'text.disabled',
        }}
      >
        (미응답)
      </Typography>
    );
  }
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.6 }}
    >
      {parts.map((p, i) =>
        p.color ? (
          <Box
            key={i}
            component="span"
            sx={{
              fontSize,
              lineHeight: 1.45,
              fontWeight: 800,
              color: p.color,
              px: 1,
              py: 0.3,
              borderRadius: 1.5,
              bgcolor: alpha(p.color, 0.12),
              border: `1px solid ${alpha(p.color, 0.35)}`,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {p.label}
          </Box>
        ) : (
          <Box
            key={i}
            component="span"
            sx={{
              fontSize,
              lineHeight: 1.45,
              fontWeight: 600,
              color: plainColor,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {p.label}
          </Box>
        ),
      )}
    </Box>
  );
}

export default function PatientView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const patientNo = usePatientStore((s) => s.patientNo);
  const patientName = usePatientStore((s) => s.name);
  const patientIdType = usePatientStore((s) => s.idType);
  const localForms = useFormsStore((s) => s.forms);
  const localResponses = useFormsStore((s) => s.responses);
  const [form, setForm] = useState<FormSchema | undefined>();
  const [response, setResponse] = useState<FormResponse | undefined>();
  const [loading, setLoading] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

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
  // 채점 총점(문진에 채점 문항/설정이 있을 때만)
  const score = form && isScoringEnabled(form) ? computeScore(form, answers) : null;

  // 요약용 데이터 — 색상 강조(선택지 color)가 걸린 답변을 모아 한눈에 확인
  const highlights: { q: Question; parts: AnsPart[] }[] = [];
  const summaryAll: { q: Question; section: string }[] = [];
  if (form) {
    form.sections.forEach((s) => {
      orderedQuestions(s)
        .filter((q) => !NON_INPUT_TYPES.includes(q.type))
        .forEach((q) => {
          summaryAll.push({ q, section: s.title || '' });
          const colored = answerParts(q, answers[q.id] ?? null).filter((p) => p.color);
          if (colored.length) highlights.push({ q, parts: colored });
        });
    });
  }
  // 모바일=카드 리스트 / PC=리포트 테이블 로 완전히 분리 — 표시 모드 반영
  const isMobile = useIsMobileLayout();

  // 작성 내용을 이미지(PNG)로 다운로드 — 원래는 병원 서버 전송용(서버 확정 후 교체)
  const handleDownload = () => {
    if (!form) return;
    const url = buildResponseImageDataUrl(form, answers, {
      patientName: patientName ?? undefined,
      // 주민등록번호 로그인 시 식별번호는 파일에 넣지 않음(이름만)
      patientNo: patientIdType === 'rrn' ? undefined : (patientNo ?? undefined),
      submittedAt: response?.submittedAt,
    });
    if (!url) return;
    const base = sanitizeFilename(
      `${form.title || '문진'}_${patientName || patientNo || ''}_${(response?.submittedAt || '').slice(0, 10)}`,
    );
    downloadDataUrl(url, `${base}.png`);
  };
  // 순서 = 섹션 순서 → 섹션 내 읽기순서. 그 순서대로 전체 질문 번호 매김(안내문 제외)
  const qNo: Record<string, number> = {};
  if (form) {
    let n = 0;
    form.sections.forEach((s) =>
      orderedQuestions(s).forEach((q) => {
        if (!NON_INPUT_TYPES.includes(q.type)) qNo[q.id] = ++n;
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
          <Box sx={{ mr: response ? 1 : 0 }}>
            <DisplayModeToggle />
          </Box>
          {response && form && (
            <Button
              color="inherit"
              startIcon={<SummarizeOutlinedIcon />}
              onClick={() => setSummaryOpen(true)}
            >
              요약
            </Button>
          )}
          {response && form && (
            <Button
              color="inherit"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleDownload}
            >
              저장
            </Button>
          )}
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
                  {/* 주민등록번호는 표시하지 않고 이름으로 표시 */}
                  환자 {patientIdType === 'rrn' ? (patientName ?? '') : response.patientId}
                </Typography>
              </Stack>
            </Box>

            {/* ───────── 채점 총점 요약 ───────── */}
            {score && (
              <Paper
                elevation={0}
                sx={{
                  mb: 2.5,
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                }}
              >
                <Stack
                  direction="row"
                  alignItems="baseline"
                  spacing={1.5}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.secondary' }}>
                    {scoringLabel(form!)}
                  </Typography>
                  <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                    {score.total}
                    {score.max > 0 && (
                      <Typography
                        component="span"
                        sx={{ fontSize: 15, fontWeight: 600, color: 'text.disabled', ml: 0.5 }}
                      >
                        / {score.max}
                      </Typography>
                    )}
                  </Typography>
                  {score.band && (
                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.4,
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        bgcolor: score.band.color ?? 'primary.main',
                      }}
                    >
                      {score.band.label}
                    </Box>
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  채점 문항 {score.scoredCount}개 합산 결과
                </Typography>
              </Paper>
            )}

            {isMobile ? (
              /* ───────── 모바일: 카드 리스트(라벨 위 / 값 아래) ───────── */
              <Stack spacing={2.5}>
                {form.sections.map((section, si) => {
                  const qs = orderedQuestions(section).filter(
                    (q) => !NON_INPUT_TYPES.includes(q.type),
                  );
                  if (qs.length === 0) return null;
                  const pal = SECTION_PALETTE[si % SECTION_PALETTE.length];
                  return (
                    <Paper key={section.id} elevation={0} sx={cardSx}>
                      {sectionHeader(section.title, pal, qs.length)}
                      <Box>
                        {qs.map((q, idx) => {
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
                                <Box sx={{ mt: 0.6 }}>
                                  <AnswerContent q={q} v={answers[q.id] ?? null} fontSize={16} />
                                </Box>
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
                  const qs = orderedQuestions(section).filter(
                    (q) => !NON_INPUT_TYPES.includes(q.type),
                  );
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
                                      sx={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: pal.text,
                                        lineHeight: 1.4,
                                      }}
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
                                  <AnswerContent q={q} v={answers[q.id] ?? null} fontSize={15} />
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

      {/* 요약 — 전반 내용 한눈에 + 색상 강조(중요) 항목 모아보기 */}
      <Dialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pr: 6 }}>
          <SummarizeOutlinedIcon color="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }} noWrap>
              문진 요약
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }} noWrap>
              {form?.title}
            </Typography>
          </Box>
          <IconButton
            onClick={() => setSummaryOpen(false)}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* 환자·제출 */}
          {(patientName || response?.submittedAt) && (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5 }}>
              {[patientName, response?.submittedAt ? fmtDate(response.submittedAt) : '']
                .filter(Boolean)
                .join('  ·  ')}
            </Typography>
          )}

          {/* 총점 */}
          {score && form && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{scoringLabel(form)}</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'primary.dark' }}>
                {score.total}
                <Box
                  component="span"
                  sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}
                >
                  {' '}
                  / {score.max}점
                </Box>
              </Typography>
              {score.band && (
                <Box
                  sx={{
                    ml: 'auto',
                    px: 1,
                    py: 0.3,
                    borderRadius: 1.5,
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#fff',
                    bgcolor: score.band.color ?? 'primary.main',
                  }}
                >
                  {score.band.label}
                </Box>
              )}
            </Box>
          )}

          {/* 강조(색상 표시) 항목 — 요청: 색표시 강조 내용이 꼭 포함되도록 */}
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: 'text.secondary',
              mb: 0.75,
            }}
          >
            강조 항목
          </Typography>
          {highlights.length ? (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {highlights.map(({ q, parts }) => (
                <Box key={q.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'text.disabled',
                      mt: '4px',
                      minWidth: 18,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {pad2(qNo[q.id])}
                  </Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                      {q.label}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', flexWrap: 'wrap', gap: 0.5, mt: 0.4 }}>
                      {parts.map((p, i) => (
                        <Box
                          key={i}
                          component="span"
                          sx={{
                            fontSize: 13.5,
                            fontWeight: 800,
                            color: p.color,
                            px: 1,
                            py: 0.3,
                            borderRadius: 1.5,
                            bgcolor: alpha(p.color as string, 0.12),
                            border: `1px solid ${alpha(p.color as string, 0.35)}`,
                          }}
                        >
                          {p.label}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 13, color: 'text.disabled', mb: 2 }}>
              색상으로 강조된 항목이 없습니다.
            </Typography>
          )}

          <Divider sx={{ my: 1.5 }} />

          {/* 전체 응답 요약 */}
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: 'text.secondary',
              mb: 0.75,
            }}
          >
            전체 응답
          </Typography>
          <Stack divider={<Divider flexItem />} spacing={1}>
            {summaryAll.map(({ q }) => (
              <Box key={q.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'text.disabled',
                    mt: '3px',
                    minWidth: 18,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pad2(qNo[q.id])}
                </Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.2 }}>
                    {q.label}
                  </Typography>
                  <AnswerContent q={q} v={answers[q.id] ?? null} fontSize={14} />
                </Box>
              </Box>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

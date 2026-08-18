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
import {
  answerParts,
  cleanLabel,
  collectFindings,
  findingsSentence,
  isSurveyForm,
  joinKo,
} from '@/utils/findings';
import { computeScore, isScoringEnabled, scoringLabel } from '@/utils/scoring';
import { formAtVersion } from '@/utils/formVersion';
import { SECTION_PALETTE } from '@/theme/sectionPalette';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout';

function fmtDate(ts?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('ko-KR');
  } catch {
    return ts;
  }
}

// 서술 문장용 날짜(시간 제외) — '2026년 8월 13일'
function fmtDateWords(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 받침 유무 판별 → 조사(이/가, 은/는) 자동 선택 — 서술 문장을 자연스럽게 잇기 위함
function hasJong(word: string): boolean {
  const ch = (word || '').trim().slice(-1);
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}
const iGa = (w: string) => (hasJong(w) ? '이' : '가');
const eunNeun = (w: string) => (hasJong(w) ? '은' : '는');

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
  // 현재 확정본(latest)과, 응답이 작성된 시점의 버전(form)을 구분해서 쓴다
  const [latest, setLatest] = useState<FormSchema | undefined>();
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
      setLatest(f);
      setResponse(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  // 응답은 작성 당시 버전(v3 등) 기준으로 보여야 한다 — 그 사이 문항이 바뀌었어도
  //  환자가 실제로 본 문진 그대로 표시·요약·저장되도록 그 시점 스냅샷을 쓴다.
  const versioned = formAtVersion(latest, response?.formVersion);
  const form = versioned.form;
  const answers = response?.answers ?? {};
  // 채점 총점(문진에 채점 문항/설정이 있을 때만)
  const score = form && isScoringEnabled(form) ? computeScore(form, answers) : null;

  // 기록지 주요 소견 — 색상 강조된 답변을 '소견 용어' 목록으로 정리.
  //  답이 예/아니오처럼 그 자체로 의미가 없으면 문항명을 소견 용어로 사용해
  //  질문+답 나열이 아닌 하나의 의학적 서술 문장으로 잇는다.
  const findings = form ? collectFindings(form, answers) : [];
  // 그 외 응답 — 문장이 부드럽게 이어지도록 있음/없음 항목은 묶어서,
  //  나머지는 '…이고 / …이며'를 번갈아 연결한다.
  const posLabels: string[] = [];
  const negLabels: string[] = [];
  const plains: { label: string; text: string }[] = [];
  if (form) {
    form.sections.forEach((s) => {
      orderedQuestions(s)
        .filter((q) => !NON_INPUT_TYPES.includes(q.type))
        .forEach((q) => {
          const parts = answerParts(q, answers[q.id] ?? null);
          const colored = parts.filter((p) => p.color);
          const qLabel = cleanLabel(q.label);
          // 색 강조 문항은 주요 소견에서 서술하므로 중복 제외
          if (colored.length) return;
          const v = answers[q.id];
          const empty =
            v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
          if (empty) return;
          const t = parts
            .map((p) => p.label)
            .join(', ')
            .trim();
          if (/^(아니오|없음|무)$/.test(t)) negLabels.push(qLabel);
          else if (/^(예|있음|유|해당|해당됨)$/.test(t)) posLabels.push(qLabel);
          else plains.push({ label: qLabel, text: t });
        });
    });
  }
  // 절 구성: 있음 묶음 → 없음 묶음 → 개별 서술 순
  const etcClauses: { base: string; kind: 'exist' | 'plain' }[] = [];
  if (posLabels.length)
    etcClauses.push({
      base: `${joinKo(posLabels)}${iGa(posLabels[posLabels.length - 1])} 있`,
      kind: 'exist',
    });
  if (negLabels.length)
    etcClauses.push({
      base: `${joinKo(negLabels)}${iGa(negLabels[negLabels.length - 1])} 없`,
      kind: 'exist',
    });
  plains.forEach((p) =>
    etcClauses.push({ base: `${p.label}${eunNeun(p.label)} ${p.text}`, kind: 'plain' }),
  );
  // '…이고, …이며' 를 번갈아 이어 마지막은 '…인 것으로 확인됨.'
  const etcSentence = etcClauses
    .map((c, i) => {
      const last = i === etcClauses.length - 1;
      if (last) return c.base + (c.kind === 'exist' ? '는 것으로 확인됨.' : '인 것으로 확인됨.');
      const smooth = i % 2 === 0;
      if (c.kind === 'exist') return c.base + (smooth ? '고, ' : '으며, ');
      return c.base + (smooth ? '이고, ' : '이며, ');
    })
    .join('');
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
          {/* 설문조사는 진료 소견 개념이 없어 요약을 제공하지 않음 */}
          {response && form && !isSurveyForm(form) && (
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
            {/* 작성 당시 버전으로 표시 중임을 알림 — 그 사이 문진이 바뀐 경우 */}
            {versioned.isOld && (
              <Alert severity="info" sx={{ mb: 2 }}>
                이 응답은 작성 당시 버전(<b>v{response.formVersion}</b>) 기준으로 표시됩니다. 현재
                문진은 v{versioned.currentVersion} 입니다.
              </Alert>
            )}
            {versioned.missing && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                작성 당시 버전(v{response.formVersion})의 문진 내용이 보관되어 있지 않아 현재 버전(v
                {versioned.currentVersion})으로 표시합니다. 문항이 바뀌었다면 일부 답변이 보이지
                않을 수 있습니다.
              </Alert>
            )}

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
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pr: 6 }}>
          <SummarizeOutlinedIcon color="primary" />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }} noWrap>
              문진 기록지
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
        <DialogContent dividers sx={{ bgcolor: '#eef1f5', p: { xs: 1.5, sm: 2.5 } }}>
          {/* 기록지(서식) 문서 — 서술형 기록 */}
          <Box
            sx={{
              bgcolor: '#fff',
              color: '#1f2937',
              border: '1px solid #c9d2dd',
              borderRadius: 1,
              p: { xs: 2, sm: 3.25 },
              maxWidth: 760,
              mx: 'auto',
              boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
            }}
          >
            {/* 제목 */}
            <Box sx={{ textAlign: 'center', mb: 2.25 }}>
              <Typography sx={{ fontSize: 19, fontWeight: 800, letterSpacing: '0.14em' }}>
                문 진 기 록 지
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#64748b', mt: 0.25 }}>
                {form?.title}
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  height: 2.5,
                  width: 54,
                  mx: 'auto',
                  bgcolor: '#334155',
                  borderRadius: 2,
                }}
              />
            </Box>

            {/* 개요 — 공식 서식(의무기록) 문체 */}
            <Typography
              component="div"
              sx={{
                fontSize: 14,
                lineHeight: 1.95,
                color: '#1f2937',
                mb: 1.5,
                textAlign: 'justify',
              }}
            >
              상기 내원환자{patientName ? `(${patientName})` : ''}는
              {response?.submittedAt ? ` ${fmtDateWords(response.submittedAt)}` : ''} 「
              {form?.title ?? '문진'}」 문진을 시행하였으며, 그 결과는 하기와 같음.
              {score && form
                ? ` 문진 평가 결과 총점 ${score.max}점 만점에 ${score.total}점으로 평가되었으며${
                    score.band ? `, ‘${score.band.label}’ 구간에 해당함.` : '.'
                  }`
                : ''}
            </Typography>

            {/* 주요 소견 서술(색상 강조가 꼭 포함되도록) */}
            <Box
              sx={{
                mb: 1.75,
                p: 1.5,
                borderLeft: '4px solid #d64545',
                bgcolor: '#fdf3f3',
                borderRadius: '0 6px 6px 0',
              }}
            >
              {/* 제목은 한 줄 차지하고, 소견 문장은 그 아래 줄부터 시작 */}
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: '#9b2c2c',
                  letterSpacing: '0.02em',
                  mb: 0.4,
                }}
              >
                주요 소견
              </Typography>
              <Typography
                component="div"
                sx={{ fontSize: 14, lineHeight: 2.05, color: '#1f2937', textAlign: 'justify' }}
              >
                {/* 이미지(PNG) 저장과 같은 문장을 사용 — findingsSentence 공용 */}
                {findingsSentence(findings).map((r, i) =>
                  r.color ? (
                    <Box
                      component="span"
                      key={i}
                      sx={{
                        fontWeight: 800,
                        color: r.color,
                        bgcolor: alpha(r.color, 0.13),
                        px: 0.4,
                        borderRadius: 0.5,
                      }}
                    >
                      {r.text}
                    </Box>
                  ) : (
                    <Box component="span" key={i}>
                      {r.text}
                    </Box>
                  ),
                )}
              </Typography>
            </Box>

            {/* 그 외 문진 내용 — 주요 소견과 동일한 서술 문체 */}
            {etcSentence && (
              <Typography
                component="div"
                sx={{ fontSize: 14, lineHeight: 1.95, color: '#1f2937', textAlign: 'justify' }}
              >
                아울러 상기 환자는 문진상 {etcSentence}
              </Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// 환자용 문진 목록 — 테스트 대상(testFlag) 문진만. 작성 완료 표시·일시 노출.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FormResponse, FormSchema } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';
import { useFormsStore } from '@/store/useFormsStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useApiConfigStore } from '@/store/useApiConfigStore';
import { callEndpoint, extractRows } from '@/utils/emrFetch';
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout';
import DisplayModeToggle from '@/components/DisplayModeToggle';

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
  const {
    patientNo,
    name: patientName,
    idType,
    visitDate,
    department,
    doctor,
    logout,
  } = usePatientStore();
  const localForms = useFormsStore((s) => s.forms);
  const localResponses = useFormsStore((s) => s.responses);
  const [forms, setForms] = useState<FormSchema[]>([]);
  // formId -> 가장 최근 응답
  const [responses, setResponses] = useState<Record<string, FormResponse>>({});
  const [loading, setLoading] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [emrNote, setEmrNote] = useState<{
    severity: 'info' | 'warning' | 'error';
    text: string;
  } | null>(null);
  // 사용 설정된 '환자 문진 대상 목록' 연동(있으면 EMR에서 대상 목록을 가져온다)
  const emrEndpoint = useApiConfigStore((s) =>
    s.endpoints.find((e) => e.enabled && e.purpose === 'patientForms' && e.url.trim()),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 문진 스키마(문항) 출처 — 내부 문진. EMR은 "어떤 문진을 작성할지" 목록만 알려준다.
      let baseForms: FormSchema[] = [];
      let rList: FormResponse[] = [];
      if (isBackendEnabled) {
        try {
          baseForms = await api.publicListForms();
        } catch {
          baseForms = [];
        }
        try {
          rList = patientNo ? await api.publicMyResponses(patientNo) : [];
        } catch {
          rList = [];
        }
      } else {
        baseForms = localForms.filter((f) => f.testFlag);
        rList = localResponses.filter((r) => r.patientId === patientNo);
      }

      let fList = baseForms;
      let note: typeof emrNote = null;

      // EMR 연동이 켜져 있으면 대상 목록을 API로 가져와 그 문진만, 그 순서로 표시
      if (emrEndpoint && patientNo) {
        // EMR에 넘길 변수: 환자번호/이름/등록번호/주민번호(선택 유형에 따라)
        const vars: Record<string, string> = { patientNo };
        if (patientName) vars.patientName = patientName;
        if (idType === 'rrn') vars.rrn = patientNo;
        else vars.regno = patientNo;
        const res = await callEndpoint(emrEndpoint, vars);
        if (res.ok) {
          const rows = extractRows(res.data, emrEndpoint.rootPath, emrEndpoint.mappings);
          const byId = new Map(baseForms.map((f) => [f.id, f]));
          const matched: FormSchema[] = [];
          let missing = 0;
          for (const r of rows) {
            const fid = String(r.formId ?? '').trim();
            if (!fid) continue;
            const base = byId.get(fid);
            if (base) {
              matched.push({
                ...base,
                title: r.title != null && String(r.title) ? String(r.title) : base.title,
                category:
                  r.category != null && String(r.category) ? String(r.category) : base.category,
              });
            } else {
              missing += 1;
            }
          }
          fList = matched;
          if (rows.length === 0)
            note = { severity: 'info', text: 'EMR에서 받은 문진 대상이 없습니다.' };
          else if (missing > 0)
            note = {
              severity: 'warning',
              text: `EMR 대상 ${rows.length}건 중 ${missing}건은 아직 앱에 등록되지 않은 문진입니다.`,
            };
        } else {
          fList = [];
          note = {
            severity: 'error',
            text: `EMR 연동 호출 실패 (상태 ${res.status || '-'}) ${res.error ?? ''}`,
          };
        }
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
      setEmrNote(note);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneCount = forms.filter((f) => responses[f.id]).length;
  // 모바일과 PC 는 완전히 다른 레이아웃(모바일=카드 리스트, PC=테이블) — 표시 모드 반영
  const isMobile = useIsMobileLayout();
  const goto = (f: FormSchema) =>
    navigate(responses[f.id] ? `/patient/view/${f.id}` : `/patient/respond/${f.id}`);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8' }}>
      <AppBar position="sticky" color="secondary" elevation={0}>
        <Toolbar>
          <AssignmentIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            문진 작성
          </Typography>
          <Box sx={{ mr: 1.5 }}>
            <DisplayModeToggle />
          </Box>
          <Typography
            variant="caption"
            sx={{ opacity: 0.9, mr: 1, display: { xs: 'none', sm: 'block' } }}
          >
            {/* 주민등록번호는 표시하지 않음(이름만). 환자번호는 함께 표시 */}
            {idType === 'rrn'
              ? (patientName ?? '환자')
              : `${patientName ? `${patientName} · ` : ''}${patientNo ?? ''}`}
          </Typography>
          <Button
            color="inherit"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={() => setLogoutOpen(true)}
          >
            나가기
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
        {/* 환자·진료 정보 — 한 줄로(작게) 표시, 좁으면 가로 스크롤 */}
        <Paper
          elevation={0}
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1,
            mb: { xs: 2, sm: 2.5 },
            borderRadius: 2.5,
            border: '1px solid rgba(15,23,42,0.06)',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 12px 24px -18px rgba(15,23,42,0.14)',
            bgcolor: '#fff',
            overflowX: 'auto',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              whiteSpace: 'nowrap',
              width: 'max-content',
              minWidth: '100%',
            }}
          >
            {[
              { label: '환자명', value: patientName },
              // 주민등록번호로 로그인한 경우 식별번호는 표시하지 않음
              ...(idType !== 'rrn' ? [{ label: '환자번호', value: patientNo }] : []),
              { label: '진료일자', value: visitDate },
              { label: '진료과', value: department },
              { label: '진료의사', value: doctor },
            ].map((f, i, arr) => (
              <Box key={f.label} sx={{ display: 'flex', alignItems: 'stretch', gap: 1.25 }}>
                {/* 위=라벨, 아래=값 (2줄) */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
                    {f.label}
                  </Typography>
                  <Typography
                    sx={{ fontWeight: 700, color: '#12213a', fontSize: 13, lineHeight: 1.2 }}
                  >
                    {f.value || '-'}
                  </Typography>
                </Box>
                {i < arr.length - 1 && (
                  <Box
                    sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'rgba(15,23,42,0.12)' }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Paper>

        {/* 헤더 */}
        <Box sx={{ mb: { xs: 2.5, sm: 3.5 } }}>
          <Typography
            sx={{
              fontSize: { xs: 22, sm: 27 },
              fontWeight: 800,
              letterSpacing: -0.4,
              color: '#12213a',
            }}
          >
            문진 목록
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            작성할 문진을 선택하세요. 완료한 문진은 눌러서 내용을 확인할 수 있습니다.
            {forms.length > 0 && ` · 전체 ${forms.length}개 중 ${doneCount}개 완료`}
          </Typography>
        </Box>

        {emrNote && (
          <Alert severity={emrNote.severity} sx={{ mb: 2 }} onClose={() => setEmrNote(null)}>
            {emrNote.text}
          </Alert>
        )}

        {loading ? (
          <Typography color="text.secondary">불러오는 중…</Typography>
        ) : forms.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed rgba(15,23,42,0.15)',
              bgcolor: '#fff',
            }}
          >
            <AssignmentIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">작성할 문진이 없습니다.</Typography>
          </Paper>
        ) : isMobile ? (
          /* ───────── 모바일: 카드 리스트(터치 친화) ───────── */
          <Stack spacing={1.75}>
            {forms.map((f) => {
              const done = responses[f.id];
              const accent = done ? '#2e9d6e' : '#5b7cfa';
              const tint = done ? '#eaf7f0' : '#eef4ff';
              const tintStrong = done ? '#d7efe2' : '#dfe8ff';
              const ring = done ? 'rgba(46,157,110,0.22)' : 'rgba(91,124,250,0.22)';
              return (
                <Card
                  key={f.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3.5,
                    border: '1px solid rgba(15,23,42,0.06)',
                    boxShadow:
                      '0 1px 2px rgba(15,23,42,0.04), 0 12px 24px -18px rgba(15,23,42,0.16)',
                    transition: 'background-color .12s, border-color .12s, box-shadow .12s',
                    '&:hover': { borderColor: accent, bgcolor: tint },
                    '&:focus-within': {
                      borderColor: accent,
                      bgcolor: tint,
                      boxShadow: `0 0 0 3px ${ring}`,
                    },
                    '& .MuiCardActionArea-root:active': { bgcolor: tintStrong },
                  }}
                >
                  <CardActionArea onClick={() => goto(f)} sx={{ p: 2.25 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1.5}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: done ? '#eaf7f0' : '#eef2ff',
                          color: done ? '#2e9d6e' : '#5b7cfa',
                        }}
                      >
                        {done ? <CheckCircleIcon /> : <AssignmentIcon />}
                      </Box>
                      {done ? (
                        <Chip
                          size="small"
                          label="작성완료"
                          color="success"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="작성 전"
                          variant="outlined"
                          sx={{ fontWeight: 700, color: '#5b7cfa', borderColor: '#c7d2fe' }}
                        />
                      )}
                    </Stack>

                    <Typography
                      sx={{ fontSize: 16, fontWeight: 700, color: '#12213a', lineHeight: 1.35 }}
                    >
                      {f.title}
                    </Typography>
                    {!done && f.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {f.description}
                      </Typography>
                    )}

                    <Box
                      sx={{
                        mt: 1.75,
                        pt: 1.25,
                        borderTop: '1px solid rgba(15,23,42,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {done ? `완료 · ${fmt(done.submittedAt)}` : '아직 작성 전'}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: done ? '#2e9d6e' : '#5b7cfa' }}
                      >
                        {done ? '내용 보기 →' : '작성하기 →'}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        ) : (
          /* ───────── PC: 테이블(대시보드형) ───────── */
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(15,23,42,0.06)',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 14px 28px -18px rgba(15,23,42,0.14)',
              overflow: 'hidden',
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      bgcolor: '#f7f8fa',
                      fontWeight: 700,
                      fontSize: 12.5,
                      color: 'text.secondary',
                      letterSpacing: 0.3,
                      borderBottom: '1px solid rgba(15,23,42,0.08)',
                    },
                  }}
                >
                  <TableCell>문진명</TableCell>
                  <TableCell align="center" width={120}>
                    상태
                  </TableCell>
                  <TableCell width={190}>제출일시</TableCell>
                  <TableCell align="right" width={140} />
                </TableRow>
              </TableHead>
              <TableBody>
                {forms.map((f) => {
                  const done = responses[f.id];
                  const rowTint = done ? '#eaf7f0' : '#eef4ff';
                  const rowActive = done ? '#d7efe2' : '#dfe8ff';
                  const rowAccent = done ? '#2e9d6e' : '#5b7cfa';
                  return (
                    <TableRow
                      key={f.id}
                      onClick={() => goto(f)}
                      tabIndex={0}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color .12s',
                        '&:hover': { bgcolor: rowTint },
                        '&:active': { bgcolor: rowActive },
                        '&:focus-visible': {
                          bgcolor: rowTint,
                          outline: '2px solid',
                          outlineColor: rowAccent,
                          outlineOffset: '-2px',
                        },
                        '&:last-child td': { borderBottom: 'none' },
                        '& td': { borderBottom: '1px solid rgba(15,23,42,0.05)', py: 1.5 },
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 2,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: done ? '#eaf7f0' : '#eef2ff',
                              color: done ? '#2e9d6e' : '#5b7cfa',
                            }}
                          >
                            {done ? (
                              <CheckCircleIcon fontSize="small" />
                            ) : (
                              <AssignmentIcon fontSize="small" />
                            )}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, color: '#12213a' }} noWrap>
                              {f.title}
                            </Typography>
                            {f.description && (
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {f.description}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        {done ? (
                          <Chip
                            size="small"
                            label="작성완료"
                            color="success"
                            sx={{ fontWeight: 700 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="작성 전"
                            variant="outlined"
                            sx={{ fontWeight: 700, color: '#5b7cfa', borderColor: '#c7d2fe' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={done ? 'text.primary' : 'text.disabled'}>
                          {done ? fmt(done.submittedAt) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant={done ? 'outlined' : 'contained'}
                          color={done ? 'success' : 'secondary'}
                          onClick={(e) => {
                            e.stopPropagation();
                            goto(f);
                          }}
                          sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                          {done ? '내용 보기' : '작성하기'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      <ConfirmDialog
        open={logoutOpen}
        title="로그아웃 하시겠습니까?"
        message="문진 작성 화면에서 나가 로그인 화면으로 돌아갑니다."
        icon={<LogoutRoundedIcon sx={{ fontSize: 32 }} />}
        confirmLabel="나가기"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout();
          navigate('/patient/login', { replace: true });
        }}
      />
    </Box>
  );
}

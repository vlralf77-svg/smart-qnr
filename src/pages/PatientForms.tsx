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
  useMediaQuery,
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

  const doneCount = forms.filter((f) => responses[f.id]).length;
  // 모바일과 PC 는 완전히 다른 레이아웃(모바일=카드 리스트, PC=테이블)
  const isMobile = useMediaQuery('(max-width:899px)');
  const goto = (f: FormSchema) =>
    navigate(responses[f.id] ? `/patient/view/${f.id}` : `/patient/respond/${f.id}`);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8' }}>
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

      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
        {/* 헤더 */}
        <Box sx={{ mb: { xs: 2.5, sm: 3.5 } }}>
          <Typography
            sx={{ fontSize: { xs: 22, sm: 27 }, fontWeight: 800, letterSpacing: -0.4, color: '#12213a' }}
          >
            문진 목록
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            작성할 문진을 선택하세요. 완료한 문진은 눌러서 내용을 확인할 수 있습니다.
            {forms.length > 0 && ` · 전체 ${forms.length}개 중 ${doneCount}개 완료`}
          </Typography>
        </Box>

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
              return (
                <Card
                  key={f.id}
                  elevation={0}
                  sx={{
                    borderRadius: 3.5,
                    border: '1px solid rgba(15,23,42,0.06)',
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 12px 24px -18px rgba(15,23,42,0.16)',
                  }}
                >
                  <CardActionArea onClick={() => goto(f)} sx={{ p: 2.25 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
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
                        <Chip size="small" label="작성완료" color="success" sx={{ fontWeight: 700 }} />
                      ) : (
                        <Chip
                          size="small"
                          label="작성 전"
                          variant="outlined"
                          sx={{ fontWeight: 700, color: '#5b7cfa', borderColor: '#c7d2fe' }}
                        />
                      )}
                    </Stack>

                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#12213a', lineHeight: 1.35 }}>
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
                  return (
                    <TableRow
                      key={f.id}
                      hover
                      onClick={() => goto(f)}
                      sx={{
                        cursor: 'pointer',
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
                          <Chip size="small" label="작성완료" color="success" sx={{ fontWeight: 700 }} />
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
    </Box>
  );
}

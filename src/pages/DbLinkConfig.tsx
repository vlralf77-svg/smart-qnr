// DB(쿼리) 연동 설정 — 병원 DB(Oracle 등)에 직접 쿼리해서 데이터를 받아온다.
//  · 실제 접속·실행은 백엔드에서 수행(프론트는 DB 직접 접속 불가).
//    - 백엔드 연동 모드: /api/db-link/test 로 서버가 실제 DB 에 접속해 SELECT 실행
//    - 오프라인(데스크톱): 내장 샘플로 파이프라인만 시뮬레이션
//  · 접속 정보(TNS/JDBC) · 읽기전용 쿼리 · 바인드 파라미터 · 컬럼→앱필드 매핑.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StorageIcon from '@mui/icons-material/Storage';
import { APP_FIELDS, PURPOSE_LABELS, type ApiPurpose } from '@/store/useApiConfigStore';
import { buildJdbcUrl, useDbLinkStore, type DbConnMode } from '@/store/useDbLinkStore';
import { simulateDbQuery, type SimResult } from '@/utils/dbLinkSim';
import { api, isBackendEnabled } from '@/api/client';

const MODE_LABELS: Record<DbConnMode, string> = {
  ezconnect: 'EZConnect (호스트/포트/서비스)',
  tns: 'TNS 별칭 (tnsnames.ora)',
  jdbc: 'JDBC URL 직접 입력',
};

export default function DbLinkConfig() {
  const navigate = useNavigate();
  const c = useDbLinkStore((s) => s.config);
  const update = useDbLinkStore((s) => s.update);

  const jdbcPreview = useMemo(() => buildJdbcUrl(c), [c]);
  const appFields = APP_FIELDS[c.purpose];

  // 테스트: 값이 비어 있는 파라미터는 실행 시 입력받는다
  const runtimeKeys = useMemo(
    () => c.params.filter((p) => p.key && !(p.value ?? '').trim()).map((p) => p.key),
    [c.params],
  );
  const [runtime, setRuntime] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // 백엔드 연동 모드면 서버가 실제 DB 에 접속해 실행, 오프라인이면 샘플 시뮬레이션
  const runTest = async () => {
    setError('');
    if (!isBackendEnabled) {
      setResult(simulateDbQuery(c, runtime));
      return;
    }
    setBusy(true);
    try {
      const r = await api.dbLinkTest({
        mode: c.mode,
        host: c.host,
        port: c.port,
        serviceName: c.serviceName,
        tnsAlias: c.tnsAlias,
        tnsAdmin: c.tnsAdmin,
        jdbcUrl: c.jdbcUrl,
        user: c.user,
        password: c.password,
        query: c.query,
        params: c.params,
        runtime,
        limit: 50,
      });
      setResult(r);
    } catch (e) {
      setResult(null);
      setError((e as Error).message || '실행에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const setParam = (i: number, patch: Partial<{ key: string; value: string }>) =>
    update({ params: c.params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const setMapping = (i: number, patch: Partial<{ target: string; column: string }>) =>
    update({ mappings: c.mappings.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <StorageIcon sx={{ ml: 1, mr: 1 }} fontSize="small" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            DB 쿼리 연동
          </Typography>
          <Stack direction="row" alignItems="center">
            <Switch checked={c.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
            <Typography variant="caption">사용</Typography>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <Alert severity="warning">
            실제 DB 접속·쿼리 실행은 <b>백엔드(서버)</b>에서 이뤄집니다(브라우저는 DB 직접 접속
            불가). 반드시 <b>읽기 전용 계정</b>·<b>바인드 파라미터</b>만 사용하고, 병원 정보팀/DBA의{' '}
            <b>DB 직접 접속 승인</b>을 먼저 받으세요. 비밀번호는 운영에서 서버 secret 로 주입하는
            것을 권장합니다.
          </Alert>

          {/* 기본 */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="연동 이름"
                size="small"
                value={c.name}
                onChange={(e) => update({ name: e.target.value })}
                sx={{ flex: 1 }}
              />
              <TextField
                select
                label="연동 화면"
                size="small"
                value={c.purpose}
                onChange={(e) => update({ purpose: e.target.value as ApiPurpose })}
                sx={{ width: { xs: '100%', sm: 220 } }}
                helperText="이 데이터를 사용할 화면"
              >
                {(Object.keys(PURPOSE_LABELS) as ApiPurpose[]).map((p) => (
                  <MenuItem key={p} value={p}>
                    {PURPOSE_LABELS[p]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Paper>

          {/* 접속 정보 */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={800} mb={1.5}>
              접속 정보 (Oracle)
            </Typography>
            <TextField
              select
              label="접속 방식"
              size="small"
              value={c.mode}
              onChange={(e) => update({ mode: e.target.value as DbConnMode })}
              sx={{ width: { xs: '100%', sm: 320 }, mb: 1.5 }}
            >
              {(Object.keys(MODE_LABELS) as DbConnMode[]).map((m) => (
                <MenuItem key={m} value={m}>
                  {MODE_LABELS[m]}
                </MenuItem>
              ))}
            </TextField>

            {c.mode === 'ezconnect' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={1.5}>
                <TextField
                  label="호스트"
                  size="small"
                  value={c.host}
                  onChange={(e) => update({ host: e.target.value })}
                  placeholder="db.hospital.local"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="포트"
                  size="small"
                  value={c.port}
                  onChange={(e) => update({ port: e.target.value })}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="서비스명"
                  size="small"
                  value={c.serviceName}
                  onChange={(e) => update({ serviceName: e.target.value })}
                  placeholder="ORCLPDB1"
                  sx={{ flex: 1 }}
                />
              </Stack>
            )}

            {c.mode === 'tns' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={1.5}>
                <TextField
                  label="TNS 별칭"
                  size="small"
                  value={c.tnsAlias}
                  onChange={(e) => update({ tnsAlias: e.target.value })}
                  placeholder="EMRDB"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="TNS_ADMIN (tnsnames.ora 경로)"
                  size="small"
                  value={c.tnsAdmin}
                  onChange={(e) => update({ tnsAdmin: e.target.value })}
                  placeholder="/opt/oracle/network/admin"
                  sx={{ flex: 2 }}
                />
              </Stack>
            )}

            {c.mode === 'jdbc' && (
              <TextField
                label="JDBC URL"
                size="small"
                fullWidth
                value={c.jdbcUrl}
                onChange={(e) => update({ jdbcUrl: e.target.value })}
                placeholder="jdbc:oracle:thin:@//host:1521/service"
                sx={{ mb: 1.5 }}
              />
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={1.5}>
              <TextField
                label="사용자(계정)"
                size="small"
                value={c.user}
                onChange={(e) => update({ user: e.target.value })}
                placeholder="qnr_reader"
                sx={{ flex: 1 }}
              />
              <TextField
                label="비밀번호"
                type="password"
                size="small"
                value={c.password}
                onChange={(e) => update({ password: e.target.value })}
                sx={{ flex: 1 }}
                helperText="운영은 서버 secret 주입 권장"
              />
            </Stack>

            <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
              생성된 JDBC URL
            </Typography>
            <Box
              sx={{
                p: 1.25,
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                fontSize: 12.5,
                wordBreak: 'break-all',
                color: jdbcPreview ? 'text.primary' : 'text.disabled',
              }}
            >
              {jdbcPreview || '(접속 정보를 입력하세요)'}
            </Box>
          </Paper>

          {/* 쿼리 + 파라미터 */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={800} mb={1}>
              조회 쿼리 (읽기 전용)
            </Typography>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={4}
              value={c.query}
              onChange={(e) => update({ query: e.target.value })}
              InputProps={{ sx: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace' } }}
              placeholder={'SELECT ... FROM ... WHERE patient_no = :patientNo'}
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              값이 들어갈 자리는 <code>:변수명</code> 바인드 파라미터로 쓰세요(문자열 이어붙이기
              금지 — SQL 인젝션 방지). 컬럼 별칭을 앱 필드명으로 지정하면 매핑이 편합니다.
            </Typography>

            <Stack direction="row" alignItems="center" mt={2} mb={0.5}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
                바인드 파라미터
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => update({ params: [...c.params, { key: '', value: '' }] })}
              >
                파라미터 추가
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              값을 비우면 <b>실행 시 입력</b>받는 변수로 처리됩니다(예: 환자번호).
            </Typography>
            <Stack spacing={1}>
              {c.params.map((p, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.disabled">
                    :
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="변수명 (예: patientNo)"
                    value={p.key}
                    onChange={(e) => setParam(i, { key: e.target.value })}
                    sx={{ width: 200 }}
                  />
                  <Typography variant="body2" color="text.disabled">
                    =
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="고정값 (비우면 실행 시 입력)"
                    value={p.value}
                    onChange={(e) => setParam(i, { value: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => update({ params: c.params.filter((_, idx) => idx !== i) })}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              {c.params.length === 0 && (
                <Typography variant="caption" color="text.disabled">
                  파라미터 없음
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* 컬럼 매핑 */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" mb={0.5} spacing={1}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
                컬럼 → 앱 필드 매핑
              </Typography>
              {appFields.length > 0 && (
                <Button
                  size="small"
                  onClick={() => {
                    const byCol = new Map(c.mappings.map((m) => [m.target, m.column]));
                    const merged = appFields.map((f) => ({
                      target: f.key,
                      column: byCol.get(f.key) ?? '',
                    }));
                    const extra = c.mappings.filter(
                      (m) => !appFields.some((f) => f.key === m.target),
                    );
                    update({ mappings: [...merged, ...extra] });
                  }}
                >
                  앱 필드 불러오기
                </Button>
              )}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => update({ mappings: [...c.mappings, { target: '', column: '' }] })}
              >
                매핑 추가
              </Button>
            </Stack>
            {appFields.length > 0 && (
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                앱 필드: {appFields.map((f) => `${f.label}(${f.key})`).join(', ')} — 각 필드에 넣을
                DB 컬럼(별칭)을 지정하세요.
              </Typography>
            )}
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <Typography variant="caption" sx={{ width: 200, fontWeight: 700 }}>
                  앱 필드(target)
                </Typography>
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 700 }}>
                  DB 컬럼/별칭(column)
                </Typography>
                <Box sx={{ width: 32 }} />
              </Stack>
              {c.mappings.map((m, i) => (
                <Stack key={i} direction="row" spacing={1}>
                  {appFields.length > 0 ? (
                    <TextField
                      select
                      size="small"
                      value={m.target}
                      onChange={(e) => setMapping(i, { target: e.target.value })}
                      sx={{ width: 200 }}
                    >
                      <MenuItem value="">
                        <em>선택</em>
                      </MenuItem>
                      {appFields.map((f) => (
                        <MenuItem key={f.key} value={f.key}>
                          {f.label} ({f.key})
                        </MenuItem>
                      ))}
                      {m.target && !appFields.some((f) => f.key === m.target) && (
                        <MenuItem value={m.target}>{m.target}</MenuItem>
                      )}
                    </TextField>
                  ) : (
                    <TextField
                      size="small"
                      value={m.target}
                      placeholder="formId"
                      onChange={(e) => setMapping(i, { target: e.target.value })}
                      sx={{ width: 200 }}
                    />
                  )}
                  <TextField
                    size="small"
                    value={m.column}
                    placeholder="FORM_ID 또는 formId(별칭)"
                    onChange={(e) => setMapping(i, { column: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => update({ mappings: c.mappings.filter((_, idx) => idx !== i) })}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {/* 테스트 — 백엔드 연동 시 실제 실행, 오프라인은 시뮬레이션 */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography variant="subtitle2" fontWeight={800}>
                테스트
              </Typography>
              {isBackendEnabled ? (
                <Chip size="small" label="실제 DB 실행" color="success" variant="outlined" />
              ) : (
                <Chip size="small" label="시뮬레이션" color="warning" variant="outlined" />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              {isBackendEnabled ? (
                <>
                  서버가 위 접속 정보로 <b>실제 DB 에 접속</b>해 쿼리를 실행합니다. 조회(SELECT)
                  전용이며 읽기전용 커넥션·타임아웃·최대 50행 제한이 적용됩니다. Oracle 대상은
                  서버를 <code>-P oracle</code> 프로파일로 빌드해야 드라이버가 포함됩니다.
                </>
              ) : (
                <>
                  내장 샘플 데이터에 <b>파라미터(WHERE)</b>와 <b>컬럼 매핑</b>을 적용해 결과를 미리
                  봅니다. (실제 접속은 백엔드 연동 모드에서 실행)
                  {c.purpose === 'patientForms' && ' 예: patientNo = 10001'}
                </>
              )}
            </Typography>

            {runtimeKeys.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
                {runtimeKeys.map((k) => (
                  <TextField
                    key={k}
                    size="small"
                    label={`:${k}`}
                    value={runtime[k] ?? ''}
                    onChange={(e) => setRuntime((v) => ({ ...v, [k]: e.target.value }))}
                    sx={{ width: 200 }}
                  />
                ))}
              </Stack>
            )}

            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => void runTest()}
              disabled={busy}
            >
              {busy ? '실행 중…' : '테스트 실행'}
            </Button>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {result && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  {result.matched}건 조회됨
                  {Object.keys(result.effective).length > 0 &&
                    ` · 조건 ${Object.entries(result.effective)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(', ')}`}
                </Alert>
                {result.rows.length > 0 ? (
                  <Box
                    sx={{
                      overflowX: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {result.columns.map((col) => (
                            <TableCell key={col} sx={{ fontWeight: 700 }}>
                              {col}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.rows.map((r, i) => (
                          <TableRow key={i}>
                            {result.columns.map((col) => (
                              <TableCell key={col}>{String(r[col] ?? '')}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    조건에 맞는 행이 없습니다. 파라미터 값 또는 매핑을 확인하세요.
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  {result.note}
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}

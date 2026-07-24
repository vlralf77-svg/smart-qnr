// EMR/외부 API 연동 관리 — API 등록(URL·헤더) + 응답 컬럼 매핑 + 테스트 호출.
//  예) 환자 문진 대상 목록 API를 등록하고, 응답 필드를 formId/title/category 로 매핑한다.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Menu,
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
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ApiIcon from '@mui/icons-material/Api';
import {
  ApiEndpoint,
  ApiPurpose,
  APP_FIELDS,
  PURPOSE_LABELS,
  useApiConfigStore,
} from '@/store/useApiConfigStore';
import {
  callEndpoint,
  extractRows,
  extractVars,
  buildUrl,
  pairsToVars,
  EmrFetchResult,
} from '@/utils/emrFetch';

export default function IntegrationConfig() {
  const navigate = useNavigate();
  const { endpoints, addEndpoint, updateEndpoint, removeEndpoint } = useApiConfigStore();
  const [selectedId, setSelectedId] = useState<string | null>(endpoints[0]?.id ?? null);
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const ep = endpoints.find((e) => e.id === selectedId) ?? null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f6f8' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <ApiIcon sx={{ ml: 1, mr: 1 }} fontSize="small" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            EMR / API 연동 관리
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
          {/* 좌: 연동 목록 */}
          <Paper variant="outlined" sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
                연동 API
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={(e) => setAddAnchor(e.currentTarget)}
              >
                추가
              </Button>
              <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 2, py: 0.5, display: 'block' }}
                >
                  연동할 화면 선택
                </Typography>
                {(Object.keys(PURPOSE_LABELS) as ApiPurpose[]).map((p) => (
                  <MenuItem
                    key={p}
                    onClick={() => {
                      setSelectedId(addEndpoint(p));
                      setAddAnchor(null);
                    }}
                  >
                    {PURPOSE_LABELS[p]}
                  </MenuItem>
                ))}
              </Menu>
            </Stack>
            <Divider />
            {endpoints.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
                등록된 연동이 없습니다. ‘추가’로 API를 등록하세요.
              </Typography>
            ) : (
              endpoints.map((e) => (
                <Box
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  sx={{
                    px: 2,
                    py: 1.25,
                    cursor: 'pointer',
                    borderLeft: '3px solid',
                    borderColor: e.id === selectedId ? 'primary.main' : 'transparent',
                    bgcolor: e.id === selectedId ? 'action.hover' : 'transparent',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                      {e.name || '(이름 없음)'}
                    </Typography>
                    {!e.enabled && <Chip size="small" label="꺼짐" variant="outlined" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {e.method} {e.url || '(URL 미설정)'}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>

          {/* 우: 편집 + 테스트 */}
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            {ep ? (
              <EndpointEditor
                key={ep.id}
                ep={ep}
                onChange={(patch) => updateEndpoint(ep.id, patch)}
                onDelete={() => {
                  removeEndpoint(ep.id);
                  setSelectedId(endpoints.find((x) => x.id !== ep.id)?.id ?? null);
                }}
              />
            ) : (
              <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="text.secondary">왼쪽에서 연동을 선택하거나 추가하세요.</Typography>
              </Paper>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────

function EndpointEditor({
  ep,
  onChange,
  onDelete,
}: {
  ep: ApiEndpoint;
  onChange: (patch: Partial<ApiEndpoint>) => void;
  onDelete: () => void;
}) {
  const [vars, setVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EmrFetchResult | null>(null);
  const [busy, setBusy] = useState(false);

  const tokens = useMemo(() => extractVars(ep.url, ep.body), [ep.url, ep.body]);
  const varMap = useMemo(() => pairsToVars(ep.variables ?? []), [ep.variables]);
  // 실행 시 입력받아야 하는 변수(고정 변수로 채워지지 않은 것 — 예: patientNo)
  const runtimeTokens = useMemo(() => tokens.filter((t) => !(t in varMap)), [tokens, varMap]);
  const urlPreview = useMemo(() => buildUrl(ep.url, varMap), [ep.url, varMap]);
  const rows = useMemo(
    () => (result?.ok ? extractRows(result.data, ep.rootPath, ep.mappings) : []),
    [result, ep.rootPath, ep.mappings],
  );
  const cols = ep.mappings.map((m) => m.target).filter(Boolean);
  const appFields = APP_FIELDS[ep.purpose];

  const runTest = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult(await callEndpoint(ep, vars));
    } finally {
      setBusy(false);
    }
  };

  const setHeader = (i: number, patch: Partial<{ key: string; value: string }>) => {
    const headers = ep.headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h));
    onChange({ headers });
  };
  const setMapping = (i: number, patch: Partial<{ target: string; source: string }>) => {
    const mappings = ep.mappings.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
    onChange({ mappings });
  };
  const setVariable = (i: number, patch: Partial<{ key: string; value: string }>) => {
    const variables = (ep.variables ?? []).map((v, idx) => (idx === i ? { ...v, ...patch } : v));
    onChange({ variables });
  };

  return (
    <Stack spacing={2}>
      {/* 기본 설정 */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <TextField
            label="연동 이름"
            size="small"
            value={ep.name}
            onChange={(e) => onChange({ name: e.target.value })}
            sx={{ flex: 1 }}
          />
          <Stack direction="row" alignItems="center">
            <Switch checked={ep.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
            <Typography variant="caption">사용</Typography>
          </Stack>
          <Tooltip title="연동 삭제">
            <IconButton color="error" onClick={onDelete}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1.5} mb={1.5}>
          <TextField
            select
            label="연동 화면"
            size="small"
            value={ep.purpose}
            onChange={(e) => {
              const purpose = e.target.value as ApiPurpose;
              // 화면을 고르면 그 화면이 받는 기본 응답 컬럼(앱 필드)을 매핑에 채워 넣음
              const fields = APP_FIELDS[purpose];
              if (fields.length) {
                const bySource = new Map(ep.mappings.map((m) => [m.target, m.source]));
                const merged = fields.map((f) => ({ target: f.key, source: bySource.get(f.key) ?? '' }));
                const extra = ep.mappings.filter((m) => !fields.some((f) => f.key === m.target));
                onChange({ purpose, mappings: [...merged, ...extra] });
              } else {
                onChange({ purpose });
              }
            }}
            sx={{ width: 220 }}
            helperText="선택하면 그 화면의 기본 응답 컬럼이 매핑에 채워집니다"
          >
            {(Object.keys(PURPOSE_LABELS) as ApiPurpose[]).map((p) => (
              <MenuItem key={p} value={p}>
                {PURPOSE_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="메서드"
            size="small"
            value={ep.method}
            onChange={(e) => onChange({ method: e.target.value as 'GET' | 'POST' })}
            sx={{ width: 110 }}
          >
            <MenuItem value="GET">GET</MenuItem>
            <MenuItem value="POST">POST</MenuItem>
          </TextField>
        </Stack>

        <TextField
          label="API URL"
          size="small"
          fullWidth
          value={ep.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://emr.hospital/api/forms?patientNo={patientNo}"
          helperText="{변수} 로 실행 시 값을 넣을 자리를 표시할 수 있습니다. 예: {patientNo}"
        />

        {ep.method === 'POST' && (
          <TextField
            label="요청 본문(JSON, {변수} 가능)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={ep.body}
            onChange={(e) => onChange({ body: e.target.value })}
            sx={{ mt: 1.5 }}
          />
        )}

        {/* 변수 → URL 생성 */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" mb={0.5}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
              변수
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => onChange({ variables: [...(ep.variables ?? []), { key: '', value: '' }] })}
            >
              변수 추가
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            URL에 <code>{'{변수명}'}</code>이 있으면 그 값으로 치환되고, 없으면 <b>쿼리 파라미터
            (변수명=값)로 자동으로 붙습니다.</b> 예: URL이 <code>…/.live?</code> 이고 변수 3개면 →
            <code>…/.live?submit_id=…&business_id=…&instcd=…</code>
          </Typography>
          <Stack spacing={1}>
            {(ep.variables ?? []).map((v, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="변수명 (예: hospital)"
                  value={v.key}
                  onChange={(e) => setVariable(i, { key: e.target.value })}
                  sx={{ width: 200 }}
                />
                <Typography variant="body2" color="text.disabled">
                  =
                </Typography>
                <TextField
                  size="small"
                  placeholder="값 (예: H001)"
                  value={v.value}
                  onChange={(e) => setVariable(i, { value: e.target.value })}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={() =>
                    onChange({ variables: (ep.variables ?? []).filter((_, idx) => idx !== i) })
                  }
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          {/* 생성된 URL 미리보기 */}
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
              생성된 URL
            </Typography>
            <Box
              sx={{
                p: 1.25,
                bgcolor: 'action.hover',
                borderRadius: 1,
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                fontSize: 12.5,
                wordBreak: 'break-all',
                color: ep.url ? 'text.primary' : 'text.disabled',
              }}
            >
              {urlPreview || '(URL을 입력하세요)'}
            </Box>
            {runtimeTokens.length > 0 && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                실행 시 입력받을 변수: {runtimeTokens.map((t) => `{${t}}`).join(', ')}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* 헤더 */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" mb={1}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
            헤더 (인증 토큰 등)
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => onChange({ headers: [...ep.headers, { key: '', value: '' }] })}
          >
            헤더 추가
          </Button>
        </Stack>
        <Stack spacing={1}>
          {ep.headers.map((h, i) => (
            <Stack key={i} direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Authorization"
                value={h.key}
                onChange={(e) => setHeader(i, { key: e.target.value })}
                sx={{ width: 200 }}
              />
              <TextField
                size="small"
                placeholder="Bearer ..."
                value={h.value}
                onChange={(e) => setHeader(i, { value: e.target.value })}
                sx={{ flex: 1 }}
              />
              <IconButton
                size="small"
                onClick={() => onChange({ headers: ep.headers.filter((_, idx) => idx !== i) })}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          {ep.headers.length === 0 && (
            <Typography variant="caption" color="text.disabled">
              헤더 없음
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* 컬럼 매핑 */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" mb={0.5} spacing={1}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
            응답 컬럼 매핑
          </Typography>
          {appFields.length > 0 && (
            <Button
              size="small"
              onClick={() => {
                // 앱 기본 필드(formId/이름/분류/상태)를 매핑 목록에 채워 넣음(기존 source 유지)
                const bySource = new Map(ep.mappings.map((m) => [m.target, m.source]));
                const merged = appFields.map((f) => ({
                  target: f.key,
                  source: bySource.get(f.key) ?? '',
                }));
                // 프리셋에 없는 기존 매핑도 뒤에 유지
                const extra = ep.mappings.filter((m) => !appFields.some((f) => f.key === m.target));
                onChange({ mappings: [...merged, ...extra] });
              }}
            >
              앱 필드 불러오기
            </Button>
          )}
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => onChange({ mappings: [...ep.mappings, { target: '', source: '' }] })}
          >
            매핑 추가
          </Button>
        </Stack>
        <TextField
          label="배열 위치(rootPath)"
          size="small"
          value={ep.rootPath}
          onChange={(e) => onChange({ rootPath: e.target.value })}
          placeholder="예: data.list  (응답 최상위가 배열이면 비움)"
          sx={{ my: 1, width: 320 }}
        />
        {appFields.length > 0 && (
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            앱 필드: {appFields.map((f) => `${f.label}(${f.key})`).join(', ')} — 응답의 어떤 필드를
            여기에 넣을지 지정하세요.
          </Typography>
        )}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <Typography variant="caption" sx={{ width: 200, fontWeight: 700 }}>
              앱 필드(target)
            </Typography>
            <Typography variant="caption" sx={{ flex: 1, fontWeight: 700 }}>
              응답 필드 경로(source)
            </Typography>
            <Box sx={{ width: 32 }} />
          </Stack>
          {ep.mappings.map((m, i) => (
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
                  {/* 프리셋에 없는 기존 값도 유지 */}
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
                value={m.source}
                placeholder="FORM_ID 또는 form.id"
                onChange={(e) => setMapping(i, { source: e.target.value })}
                sx={{ flex: 1 }}
              />
              <IconButton
                size="small"
                onClick={() => onChange({ mappings: ep.mappings.filter((_, idx) => idx !== i) })}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* 테스트 호출 */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={800} mb={1}>
          테스트 호출
        </Typography>
        {runtimeTokens.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
            {runtimeTokens.map((t) => (
              <TextField
                key={t}
                size="small"
                label={t}
                value={vars[t] ?? ''}
                onChange={(e) => setVars((v) => ({ ...v, [t]: e.target.value }))}
                sx={{ width: 180 }}
              />
            ))}
          </Stack>
        )}
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={runTest}
          disabled={busy || !ep.url}
        >
          {busy ? '호출 중…' : '호출 테스트'}
        </Button>

        {result && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 1.5 }}>
              상태 {result.status || '-'} {result.ok ? '· 성공' : `· 실패 ${result.error ?? ''}`}
            </Alert>

            {result.ok && (
              <>
                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                  매핑 결과 ({rows.length}건)
                </Typography>
                {rows.length > 0 ? (
                  <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {cols.map((c) => (
                            <TableCell key={c} sx={{ fontWeight: 700 }}>
                              {c}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.slice(0, 20).map((r, i) => (
                          <TableRow key={i}>
                            {cols.map((c) => (
                              <TableCell key={c}>{String(r[c] ?? '')}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    매핑된 행이 없습니다. 배열 위치(rootPath)나 응답 필드 경로를 확인하세요.
                  </Typography>
                )}

                <Typography variant="caption" fontWeight={700} display="block" sx={{ mt: 1.5, mb: 0.5 }}>
                  원본 응답(일부)
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    bgcolor: '#0f172a',
                    color: '#cbd5e1',
                    borderRadius: 1,
                    fontSize: 11.5,
                    maxHeight: 220,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(result.data, null, 2).slice(0, 4000)}
                </Box>
              </>
            )}
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

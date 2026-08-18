// 연동 관리 본문 — API 클라이언트(Postman) 형태의 화면.
//  좌: 연동 항목 목록 / 우: 요청 줄(방식·메서드·URL·실행) + 탭(파라미터·헤더·본문·매핑·설정) + 응답.
//  연동 방식(API 호출 / DB 쿼리)에 따라 요청 줄과 탭 구성이 바뀐다.
//   · API: 파라미터·헤더·본문 → fetch 호출
//   · DB : 접속·쿼리·파라미터 → 조회 시뮬레이션
import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputBase,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import ApiIcon from '@mui/icons-material/Api';
import StorageIcon from '@mui/icons-material/Storage';
import {
  activePairs,
  ApiEndpoint,
  ApiPurpose,
  APP_FIELDS,
  DEFAULT_DB,
  type LinkKind,
  PURPOSE_LABELS,
  useApiConfigStore,
} from '@/store/useApiConfigStore';
import { DbConnTab, DbQueryTab, buildJdbcUrl } from './DbFields';
import { CodeBox, EmptyHint, KeyValueTable, MONO, TabLabel } from './IntegrationBits';
import { simulateDbQuery } from '@/utils/dbLinkSim';
import { callEndpoint, extractRows, extractVars, buildUrl, pairsToVars } from '@/utils/emrFetch';

const PURPOSES = Object.keys(PURPOSE_LABELS) as ApiPurpose[];

/** 목록·요청 줄에 쓰는 방식 배지 색 */
const BADGE_COLOR: Record<string, string> = {
  GET: '#0f7b3f',
  POST: '#c2410c',
  DB: '#6d28d9',
};

const badgeOf = (e: ApiEndpoint) => ((e.kind ?? 'api') === 'db' ? 'DB' : e.method);

/** 목록 행에 보여줄 한 줄 요약 */
function summarize(e: ApiEndpoint): string {
  if ((e.kind ?? 'api') === 'db') {
    return e.db ? buildJdbcUrl(e.db) || '(접속 정보 미설정)' : '(접속 정보 미설정)';
  }
  return e.url || '(URL 미설정)';
}

/** 실행 결과 — API 호출과 DB 시뮬레이션을 같은 모양으로 표시하기 위한 공통 형태 */
interface RunOutcome {
  ok: boolean;
  label: string;
  ms: number;
  error?: string;
  rows: Record<string, unknown>[];
  columns: string[];
  raw?: unknown;
  note?: string;
}

export default function IntegrationPanel() {
  const { endpoints, addEndpoint, updateEndpoint, removeEndpoint } = useApiConfigStore();
  const [selectedId, setSelectedId] = useState<string | null>(endpoints[0]?.id ?? null);
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const ep = endpoints.find((e) => e.id === selectedId) ?? null;

  const add = (p: ApiPurpose, kind: LinkKind) => {
    setSelectedId(addEndpoint(p, kind));
    setAddAnchor(null);
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      {/* 좌: 연동 항목 목록 */}
      <Paper
        variant="outlined"
        sx={{
          width: { xs: '100%', md: 290 },
          flexShrink: 0,
          borderRadius: 3,
          overflow: 'hidden',
          position: { md: 'sticky' },
          top: { md: 80 },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 2,
            py: 1.25,
            bgcolor: (t) => alpha(t.palette.primary.main, 0.045),
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
            연동 항목
            {endpoints.length > 0 && (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 0.75 }}
              >
                {endpoints.length}
              </Typography>
            )}
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={(e) => setAddAnchor(e.currentTarget)}
          >
            추가
          </Button>
          <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={() => setAddAnchor(null)}>
            <ListSubheader sx={{ lineHeight: '30px', fontSize: 11.5, fontWeight: 800 }}>
              API 호출로 추가
            </ListSubheader>
            {PURPOSES.map((p) => (
              <MenuItem key={`api-${p}`} onClick={() => add(p, 'api')} sx={{ fontSize: 13.5 }}>
                <ApiIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                {PURPOSE_LABELS[p]}
              </MenuItem>
            ))}
            <Divider />
            <ListSubheader sx={{ lineHeight: '30px', fontSize: 11.5, fontWeight: 800 }}>
              DB 쿼리로 추가
            </ListSubheader>
            {PURPOSES.map((p) => (
              <MenuItem key={`db-${p}`} onClick={() => add(p, 'db')} sx={{ fontSize: 13.5 }}>
                <StorageIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                {PURPOSE_LABELS[p]}
              </MenuItem>
            ))}
          </Menu>
        </Stack>

        {endpoints.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              등록된 연동이 없습니다.
              <br />
              [추가]에서 연동 대상과 방식을 고르세요.
            </Typography>
          </Box>
        ) : (
          endpoints.map((e) => {
            const on = e.id === selectedId;
            const badge = badgeOf(e);
            return (
              <Box
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                sx={{
                  px: 1.5,
                  py: 1.1,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  borderLeft: '3px solid',
                  borderColor: on ? 'primary.main' : 'transparent',
                  borderBottom: '1px solid',
                  borderBottomColor: 'divider',
                  bgcolor: (t) => (on ? alpha(t.palette.primary.main, 0.07) : 'transparent'),
                  '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, on ? 0.09 : 0.035) },
                  '&:last-of-type': { borderBottom: 'none' },
                  opacity: e.enabled ? 1 : 0.55,
                }}
              >
                <Typography
                  sx={{
                    width: 34,
                    flexShrink: 0,
                    textAlign: 'right',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    color: BADGE_COLOR[badge] ?? 'text.secondary',
                  }}
                >
                  {badge}
                </Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                      {e.name || '(이름 없음)'}
                    </Typography>
                    {!e.enabled && (
                      <Chip
                        size="small"
                        label="꺼짐"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10.5 }}
                      />
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    display="block"
                    sx={{ fontSize: 11, fontFamily: MONO }}
                  >
                    {summarize(e)}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Paper>

      {/* 우: 요청 + 응답 */}
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        {ep ? (
          <EndpointWorkspace
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
            <HubOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography fontWeight={700} gutterBottom>
              설정할 연동을 고르세요
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              왼쪽 목록에서 항목을 선택하거나, 새 연동을 추가하세요.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => setAddAnchor(e.currentTarget)}
            >
              연동 추가
            </Button>
          </Paper>
        )}
      </Box>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────

function EndpointWorkspace({
  ep,
  onChange,
  onDelete,
}: {
  ep: ApiEndpoint;
  onChange: (patch: Partial<ApiEndpoint>) => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState('params');
  const [resTab, setResTab] = useState<'rows' | 'raw'>('rows');
  const [runVars, setRunVars] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  // 저장분 호환: kind 가 없으면 기존 방식(API)
  const kind: LinkKind = ep.kind ?? 'api';
  const isDb = kind === 'db';
  const db = ep.db ?? DEFAULT_DB;

  const varMap = useMemo(() => pairsToVars(ep.variables ?? []), [ep.variables]);
  const urlPreview = useMemo(() => buildUrl(ep.url, varMap), [ep.url, varMap]);
  const jdbcUrl = useMemo(() => buildJdbcUrl(db), [db]);
  const appFields = APP_FIELDS[ep.purpose];
  const mappedCount = ep.mappings.filter((m) => m.target && m.source).length;
  const cols = ep.mappings.map((m) => m.target).filter(Boolean);

  // 실행할 때 값을 입력받아야 하는 이름들
  const runtimeKeys = useMemo(() => {
    if (isDb)
      return activePairs(db.params)
        .filter((p) => !p.value.trim())
        .map((p) => p.key);
    return extractVars(ep.url, ep.body).filter((t) => !(t in varMap));
  }, [isDb, db.params, ep.url, ep.body, varMap]);

  // GET 인데 Content-Type 헤더가 남아 있으면 호출 시 자동 제외됨을 알린다(프리플라이트 회피)
  const droppedContentType =
    ep.method === 'GET' &&
    activePairs(ep.headers).some((h) => h.key.trim().toLowerCase() === 'content-type');

  const canRun = isDb ? !!db.query.trim() : !!ep.url.trim();

  const run = async () => {
    setBusy(true);
    setResult(null);
    setResTab('rows');
    const t0 = Date.now();
    try {
      if (isDb) {
        const sim = simulateDbQuery(
          {
            enabled: ep.enabled,
            name: ep.name,
            purpose: ep.purpose,
            ...db,
            params: activePairs(db.params),
            mappings: ep.mappings.map((m) => ({ target: m.target, column: m.source })),
          },
          runVars,
        );
        const cond = Object.entries(sim.effective)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        setResult({
          ok: true,
          label: '시뮬레이션',
          ms: Date.now() - t0,
          rows: sim.rows,
          columns: sim.columns,
          note: cond ? `${sim.note} · 조건 ${cond}` : sim.note,
        });
      } else {
        const r = await callEndpoint(ep, runVars);
        setResult({
          ok: r.ok,
          label: r.status ? String(r.status) : '실패',
          ms: Date.now() - t0,
          error: r.error,
          rows: r.ok ? extractRows(r.data, ep.rootPath, ep.mappings) : [],
          columns: cols,
          raw: r.data,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const setMapping = (i: number, patch: Partial<{ target: string; source: string }>) =>
    onChange({ mappings: ep.mappings.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });
  /** 연동 대상(화면)이 쓰는 기본 앱 필드를 매핑에 채워 넣는다(기존 값 유지) */
  const fillAppFields = (fields: { key: string; label: string }[]) => {
    const bySource = new Map(ep.mappings.map((m) => [m.target, m.source]));
    const merged = fields.map((f) => ({ target: f.key, source: bySource.get(f.key) ?? '' }));
    const extra = ep.mappings.filter((m) => !fields.some((f) => f.key === m.target));
    return [...merged, ...extra];
  };

  const tabs: { v: string; label: ReactNode }[] = isDb
    ? [
        { v: 'conn', label: <TabLabel text="접속" dot={!!jdbcUrl && !!db.user.trim()} /> },
        { v: 'query', label: <TabLabel text="쿼리" dot={!!db.query.trim()} /> },
        { v: 'params', label: <TabLabel text="파라미터" count={db.params.length} /> },
        { v: 'mapping', label: <TabLabel text="매핑" count={mappedCount} /> },
        { v: 'settings', label: <TabLabel text="설정" /> },
      ]
    : [
        { v: 'params', label: <TabLabel text="파라미터" count={(ep.variables ?? []).length} /> },
        { v: 'headers', label: <TabLabel text="헤더" count={ep.headers.length} /> },
        ...(ep.method === 'POST'
          ? [{ v: 'body', label: <TabLabel text="본문" dot={!!ep.body.trim()} /> }]
          : []),
        { v: 'mapping', label: <TabLabel text="매핑" count={mappedCount} /> },
        { v: 'settings', label: <TabLabel text="설정" /> },
      ];
  // 방식이 바뀌면 없는 탭이 선택돼 있을 수 있다
  const active = tabs.some((t) => t.v === tab) ? tab : tabs[0].v;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* 요청 줄 — 방식 · 메서드 · 주소 · 실행 */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Select
          size="small"
          value={kind}
          onChange={(e) => {
            const next = e.target.value as LinkKind;
            onChange(
              next === 'db' ? { kind: next, db: ep.db ?? { ...DEFAULT_DB } } : { kind: next },
            );
            setResult(null);
          }}
          sx={{ width: 108, flexShrink: 0, fontSize: 13, fontWeight: 700 }}
        >
          <MenuItem value="api" sx={{ fontSize: 13 }}>
            <ApiIcon fontSize="small" sx={{ mr: 0.75, color: 'info.main' }} />
            API
          </MenuItem>
          <MenuItem value="db" sx={{ fontSize: 13 }}>
            <StorageIcon fontSize="small" sx={{ mr: 0.75, color: 'warning.main' }} />
            DB
          </MenuItem>
        </Select>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          {isDb ? (
            <>
              <Typography
                sx={{
                  px: 1.5,
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: BADGE_COLOR.DB,
                  flexShrink: 0,
                }}
              >
                QUERY
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ my: 0.75 }} />
              <Tooltip title="접속 정보는 [접속] 탭에서 입력합니다">
                <InputBase
                  fullWidth
                  readOnly
                  value={jdbcUrl}
                  placeholder="(접속 정보를 입력하세요)"
                  onClick={() => setTab('conn')}
                  sx={{ px: 1.5, py: 0.75, fontSize: 13, fontFamily: MONO, cursor: 'pointer' }}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <Select
                variant="standard"
                disableUnderline
                value={ep.method}
                onChange={(e) => onChange({ method: e.target.value as 'GET' | 'POST' })}
                sx={{
                  px: 1.5,
                  flexShrink: 0,
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: BADGE_COLOR[ep.method],
                  '& .MuiSelect-select': { py: 0.75 },
                }}
              >
                <MenuItem value="GET" sx={{ fontSize: 13, fontWeight: 700 }}>
                  GET
                </MenuItem>
                <MenuItem value="POST" sx={{ fontSize: 13, fontWeight: 700 }}>
                  POST
                </MenuItem>
              </Select>
              <Divider orientation="vertical" flexItem sx={{ my: 0.75 }} />
              <InputBase
                fullWidth
                value={ep.url}
                placeholder="https://emr.hospital/api/forms?patientNo={patientNo}"
                onChange={(e) => onChange({ url: e.target.value })}
                sx={{ px: 1.5, py: 0.75, fontSize: 13, fontFamily: MONO }}
              />
            </>
          )}
        </Box>

        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={run}
          disabled={busy || !canRun}
          sx={{ flexShrink: 0, px: 2.5 }}
        >
          {busy ? '실행 중…' : '실행'}
        </Button>
      </Stack>

      {/* 실행할 때 입력받는 값 */}
      {runtimeKeys.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ px: 1.5, py: 1, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography variant="caption" fontWeight={800} color="text.secondary">
            실행 값
          </Typography>
          {runtimeKeys.map((k) => (
            <TextField
              key={k}
              size="small"
              label={isDb ? `:${k}` : k}
              value={runVars[k] ?? ''}
              onChange={(e) => setRunVars((v) => ({ ...v, [k]: e.target.value }))}
              sx={{ width: 175, bgcolor: 'background.paper' }}
            />
          ))}
        </Stack>
      )}

      {/* 설정 탭 */}
      <Tabs
        value={active}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 1,
          minHeight: 40,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 40, fontSize: 13, fontWeight: 700, textTransform: 'none' },
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.v} value={t.v} label={t.label} />
        ))}
      </Tabs>

      <Box sx={{ p: 2, minHeight: 240 }}>
        {active === 'conn' && <DbConnTab ep={ep} onChange={onChange} />}
        {active === 'query' && <DbQueryTab ep={ep} onChange={onChange} />}

        {active === 'params' &&
          (isDb ? (
            <>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                쿼리의 <code>:변수명</code> 에 넣을 값입니다. 값을 비우면{' '}
                <b>실행할 때 입력받는 변수</b>가 됩니다.
              </Typography>
              <KeyValueTable
                rows={db.params}
                onChange={(params) => onChange({ db: { ...db, params } })}
                keyPrefix=":"
                keyPlaceholder="patientNo"
                valuePlaceholder="고정값 (비우면 실행 시 입력)"
              />
            </>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                URL에 <code>{'{변수명}'}</code>이 있으면 그 값으로 치환되고, 없으면{' '}
                <b>쿼리 파라미터(변수명=값)로 자동으로 붙습니다.</b> 값을 비우면 실행할 때
                입력받습니다.
              </Typography>
              <KeyValueTable
                rows={ep.variables ?? []}
                onChange={(variables) => onChange({ variables })}
                keyPlaceholder="submit_id"
                valuePlaceholder="TRMRN20000"
              />
              <Box sx={{ mt: 2 }}>
                <CodeBox label="생성된 URL" value={urlPreview} placeholder="(URL을 입력하세요)" />
              </Box>
            </>
          ))}

        {active === 'headers' && (
          <>
            {droppedContentType && (
              <Alert
                severity="warning"
                sx={{ mb: 1.5, py: 0.25, '& .MuiAlert-message': { fontSize: 12.5 } }}
                action={
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() =>
                      onChange({
                        headers: ep.headers.filter(
                          (h) => h.key.trim().toLowerCase() !== 'content-type',
                        ),
                      })
                    }
                  >
                    삭제
                  </Button>
                }
              >
                GET 요청에는 <code>Content-Type</code> 이 필요 없어 <b>호출 시 자동으로 제외</b>
                됩니다. 이 헤더가 있으면 브라우저가 사전 확인(OPTIONS) 요청을 먼저 보내 CORS 로
                차단될 수 있습니다.
              </Alert>
            )}
            <KeyValueTable
              rows={ep.headers}
              onChange={(headers) => onChange({ headers })}
              keyPlaceholder="Authorization"
              valuePlaceholder="Bearer ..."
            />
          </>
        )}

        {active === 'body' && (
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={8}
            value={ep.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder={'{ "patientNo": "{patientNo}" }'}
            InputProps={{ sx: { fontFamily: MONO, fontSize: 12.5 } }}
            helperText="POST 본문(JSON). {변수} 를 쓰면 실행 시 값으로 치환됩니다."
          />
        )}

        {active === 'mapping' && (
          <MappingTab
            ep={ep}
            isDb={isDb}
            appFields={appFields}
            onChange={onChange}
            setMapping={setMapping}
            fillAppFields={fillAppFields}
          />
        )}

        {active === 'settings' && (
          <Stack spacing={2} sx={{ maxWidth: 520 }}>
            <TextField
              label="연동 이름"
              size="small"
              value={ep.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <TextField
              select
              label="연동 대상"
              size="small"
              value={ep.purpose}
              onChange={(e) => {
                const purpose = e.target.value as ApiPurpose;
                const fields = APP_FIELDS[purpose];
                onChange(
                  fields.length ? { purpose, mappings: fillAppFields(fields) } : { purpose },
                );
              }}
              helperText="이 연동으로 채울 앱 화면 — 고르면 기본 매핑이 채워집니다"
            >
              {PURPOSES.map((p) => (
                <MenuItem key={p} value={p}>
                  {PURPOSE_LABELS[p]}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={ep.enabled}
                onChange={(e) => onChange({ enabled: e.target.checked })}
              />
              <Typography variant="body2" fontWeight={700}>
                이 연동 사용
              </Typography>
              <Typography variant="caption" color="text.secondary">
                끄면 앱 화면에서 쓰이지 않습니다.
              </Typography>
            </Stack>
            <Divider />
            <Box>
              <Button
                color="error"
                variant="outlined"
                size="small"
                startIcon={<DeleteOutlineIcon />}
                onClick={onDelete}
              >
                연동 삭제
              </Button>
            </Box>
          </Stack>
        )}
      </Box>

      {/* 응답 */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            응답
          </Typography>
          {result && (
            <>
              <Chip
                size="small"
                label={result.ok ? result.label : `실패 ${result.label}`}
                color={result.ok ? 'success' : 'error'}
                sx={{ height: 20, fontSize: 11, fontWeight: 800 }}
              />
              <Typography variant="caption" color="text.secondary">
                {result.ms}ms · {result.rows.length}행
              </Typography>
            </>
          )}
          <Box sx={{ flex: 1 }} />
          {result?.raw !== undefined && (
            <Stack direction="row" spacing={0.5}>
              {(['rows', 'raw'] as const).map((v) => (
                <Button
                  key={v}
                  size="small"
                  variant={resTab === v ? 'contained' : 'text'}
                  onClick={() => setResTab(v)}
                  sx={{ minWidth: 0, px: 1.25, fontSize: 12 }}
                >
                  {v === 'rows' ? '매핑 결과' : '원본'}
                </Button>
              ))}
            </Stack>
          )}
        </Stack>
        <Box sx={{ px: 2, pb: 2, bgcolor: 'background.paper', pt: 1.5 }}>
          {!result ? (
            <EmptyHint icon={<PlayArrowIcon />}>
              [실행]을 누르면 결과가 여기에 표시됩니다.
            </EmptyHint>
          ) : (
            <>
              {!result.ok && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {result.error || '호출에 실패했습니다.'}
                </Alert>
              )}
              {result.note && (
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  {result.note}
                </Typography>
              )}

              {resTab === 'raw' && result.raw !== undefined ? (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    bgcolor: '#0f172a',
                    color: '#cbd5e1',
                    borderRadius: 1.5,
                    fontSize: 11.5,
                    maxHeight: 320,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(result.raw, null, 2).slice(0, 4000)}
                </Box>
              ) : result.rows.length > 0 ? (
                <Box
                  sx={{
                    overflowX: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {result.columns.map((c) => (
                          <TableCell key={c} sx={{ fontWeight: 700 }}>
                            {c}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.rows.slice(0, 20).map((r, i) => (
                        <TableRow key={i}>
                          {result.columns.map((c) => (
                            <TableCell key={c}>{String(r[c] ?? '')}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : (
                result.ok && (
                  <Typography variant="caption" color="text.secondary">
                    매핑된 행이 없습니다. [매핑] 탭의 배열 위치나 필드 경로를 확인하세요.
                  </Typography>
                )
              )}
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// ─────────────────────────────────────────────────────────────

function MappingTab({
  ep,
  isDb,
  appFields,
  onChange,
  setMapping,
  fillAppFields,
}: {
  ep: ApiEndpoint;
  isDb: boolean;
  appFields: { key: string; label: string }[];
  onChange: (patch: Partial<ApiEndpoint>) => void;
  setMapping: (i: number, patch: Partial<{ target: string; source: string }>) => void;
  fillAppFields: (fields: { key: string; label: string }[]) => ApiEndpoint['mappings'];
}) {
  return (
    <Stack spacing={1.5}>
      {!isDb && (
        <TextField
          label="배열 위치(rootPath)"
          size="small"
          value={ep.rootPath}
          onChange={(e) => onChange({ rootPath: e.target.value })}
          placeholder="예: data.list"
          helperText="응답 최상위가 배열이면 비워 두세요"
          sx={{ width: 320 }}
        />
      )}

      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {appFields.length > 0
            ? `이 화면이 쓰는 값: ${appFields.map((f) => f.label).join(' · ')}`
            : '앱에서 쓸 이름과 원본 컬럼을 직접 지정하세요.'}
        </Typography>
        {appFields.length > 0 && (
          <Button size="small" onClick={() => onChange({ mappings: fillAppFields(appFields) })}>
            앱 필드 불러오기
          </Button>
        )}
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onChange({ mappings: [...ep.mappings, { target: '', source: '' }] })}
        >
          추가
        </Button>
      </Stack>

      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ width: 200, fontWeight: 700 }}>
            앱에서 쓸 이름
          </Typography>
          <Box sx={{ width: 20 }} />
          <Typography variant="caption" sx={{ flex: 1, fontWeight: 700 }}>
            {isDb ? 'DB 컬럼(별칭)' : '응답 필드 경로'}
          </Typography>
          <Box sx={{ width: 32 }} />
        </Stack>
        {ep.mappings.map((m, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
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
            <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled', width: 20 }} />
            <TextField
              size="small"
              value={m.source}
              placeholder={isDb ? '컬럼 별칭 (예: formId)' : 'FORM_ID 또는 form.id'}
              onChange={(e) => setMapping(i, { source: e.target.value })}
              InputProps={{ sx: { fontFamily: MONO, fontSize: 12.5 } }}
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
        {ep.mappings.length === 0 && (
          <Typography variant="caption" color="text.disabled">
            매핑 없음
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

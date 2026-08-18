// 연동 관리 본문 — 좌측에서 연동 항목을 고르고, 우측에서 그 항목을 단계별로 설정한다.
//  항목마다 '연동 방식'(API 호출 / DB 쿼리)을 고르며, 선택에 따라 ②~⑤ 단계 내용이 바뀐다.
//   · API: ② 요청 설정(URL·변수·본문) ③ 헤더 ④ 응답 컬럼 매핑 ⑤ 호출 테스트
//   · DB : ② 접속 정보 ③ 조회 쿼리·파라미터 ④ DB 컬럼 매핑 ⑤ 테스트
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListSubheader,
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
  ApiEndpoint,
  ApiPurpose,
  APP_FIELDS,
  DEFAULT_DB,
  type LinkKind,
  PURPOSE_LABELS,
  useApiConfigStore,
} from '@/store/useApiConfigStore';
import DbFields, { DbTestPanel, buildJdbcUrl } from './DbFields';
import { ChoiceCard, CodeBox, SectionCard } from './IntegrationBits';
import {
  callEndpoint,
  extractRows,
  extractVars,
  buildUrl,
  pairsToVars,
  EmrFetchResult,
} from '@/utils/emrFetch';

const PURPOSES = Object.keys(PURPOSE_LABELS) as ApiPurpose[];

/** 목록 행에 보여줄 한 줄 요약 */
function summarize(e: ApiEndpoint): string {
  if ((e.kind ?? 'api') === 'db') {
    return e.db ? buildJdbcUrl(e.db) || '(접속 정보 미설정)' : '(접속 정보 미설정)';
  }
  return `${e.method} ${e.url || '(URL 미설정)'}`;
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

  const addMenu = (
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
  );

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      {/* 좌: 연동 항목 목록 */}
      <Paper
        variant="outlined"
        sx={{
          width: { xs: '100%', md: 300 },
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
          {addMenu}
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
            const isDb = (e.kind ?? 'api') === 'db';
            const on = e.id === selectedId;
            return (
              <Box
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                sx={{
                  px: 1.75,
                  py: 1.25,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 1.25,
                  alignItems: 'center',
                  borderLeft: '3px solid',
                  borderColor: on ? 'primary.main' : 'transparent',
                  borderBottom: '1px solid',
                  borderBottomColor: 'divider',
                  bgcolor: (t) => (on ? alpha(t.palette.primary.main, 0.07) : 'transparent'),
                  '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, on ? 0.09 : 0.035) },
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    borderRadius: 1.5,
                    display: 'grid',
                    placeItems: 'center',
                    color: isDb ? 'warning.dark' : 'info.dark',
                    bgcolor: (t) =>
                      alpha(
                        isDb ? t.palette.warning.main : t.palette.info.main,
                        e.enabled ? 0.16 : 0.07,
                      ),
                    opacity: e.enabled ? 1 : 0.55,
                  }}
                >
                  {isDb ? <StorageIcon fontSize="small" /> : <ApiIcon fontSize="small" />}
                </Box>
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
                    sx={{ fontSize: 11 }}
                  >
                    {summarize(e)}
                  </Typography>
                </Box>
              </Box>
            );
          })
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
  // 저장분 호환: kind 가 없으면 기존 방식(API)
  const kind: LinkKind = ep.kind ?? 'api';
  const isDb = kind === 'db';

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
  const mappedCount = ep.mappings.filter((m) => m.target && m.source).length;
  // GET 인데 Content-Type 헤더가 남아 있으면 호출 시 자동 제외됨을 알린다(프리플라이트 회피)
  const droppedContentType =
    ep.method === 'GET' && ep.headers.some((h) => h.key.trim().toLowerCase() === 'content-type');

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
  /** 연동 대상(화면)이 바뀌면 그 화면이 쓰는 기본 앱 필드를 매핑에 채워 넣는다 */
  const fillAppFields = (fields: { key: string; label: string }[]) => {
    const bySource = new Map(ep.mappings.map((m) => [m.target, m.source]));
    const merged = fields.map((f) => ({ target: f.key, source: bySource.get(f.key) ?? '' }));
    const extra = ep.mappings.filter((m) => !fields.some((f) => f.key === m.target));
    return [...merged, ...extra];
  };

  return (
    <Stack spacing={2}>
      {/* 항목 헤더 — 이름 / 사용 / 삭제 */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color: isDb ? 'warning.dark' : 'info.dark',
              bgcolor: (t) => alpha(isDb ? t.palette.warning.main : t.palette.info.main, 0.16),
            }}
          >
            {isDb ? <StorageIcon /> : <ApiIcon />}
          </Box>
          <TextField
            label="연동 이름"
            size="small"
            value={ep.name}
            onChange={(e) => onChange({ name: e.target.value })}
            sx={{ flex: 1 }}
          />
          <Tooltip
            title={ep.enabled ? '이 연동을 사용 중입니다' : '꺼져 있어 앱에서 쓰이지 않습니다'}
          >
            <Stack direction="row" alignItems="center">
              <Switch
                checked={ep.enabled}
                onChange={(e) => onChange({ enabled: e.target.checked })}
              />
              <Typography variant="caption" fontWeight={700}>
                사용
              </Typography>
            </Stack>
          </Tooltip>
          <Tooltip title="연동 삭제">
            <IconButton color="error" onClick={onDelete}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* ① 연동 방식 · 연동 대상 */}
      <SectionCard
        step={1}
        title="연동 방식 · 연동 대상"
        desc="방식을 고르면 아래 설정 항목이 그에 맞게 바뀝니다."
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} role="radiogroup" mb={2}>
          <ChoiceCard
            selected={!isDb}
            icon={<ApiIcon fontSize="small" sx={{ color: 'info.main' }} />}
            title="API 호출"
            desc="EMR/외부 시스템의 REST API를 호출해 데이터를 받아옵니다."
            onSelect={() => onChange({ kind: 'api' })}
          />
          <ChoiceCard
            selected={isDb}
            icon={<StorageIcon fontSize="small" sx={{ color: 'warning.main' }} />}
            title="DB 쿼리"
            desc="API 없이 병원 DB(Oracle 등)에 조회 쿼리를 실행해 받아옵니다."
            onSelect={() => onChange({ kind: 'db', db: ep.db ?? { ...DEFAULT_DB } })}
          />
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <TextField
            select
            label="연동 대상"
            size="small"
            value={ep.purpose}
            onChange={(e) => {
              const purpose = e.target.value as ApiPurpose;
              const fields = APP_FIELDS[purpose];
              onChange(fields.length ? { purpose, mappings: fillAppFields(fields) } : { purpose });
            }}
            sx={{ width: 240 }}
            helperText="이 연동으로 채울 앱 화면"
          >
            {PURPOSES.map((p) => (
              <MenuItem key={p} value={p}>
                {PURPOSE_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>
          {!isDb && (
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
          )}
        </Stack>
      </SectionCard>

      {/* ②③ 방식별 설정 */}
      {isDb ? (
        <DbFields ep={ep} onChange={onChange} />
      ) : (
        <>
          <SectionCard
            step={2}
            title="요청 설정"
            desc="호출할 주소와 값이 들어갈 자리를 지정하세요."
            done={!!ep.url.trim()}
          >
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

            <Stack direction="row" alignItems="center" mt={2.5} mb={0.5}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>
                변수
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() =>
                  onChange({ variables: [...(ep.variables ?? []), { key: '', value: '' }] })
                }
              >
                변수 추가
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.25}>
              URL에 <code>{'{변수명}'}</code>이 있으면 그 값으로 치환되고, 없으면{' '}
              <b>쿼리 파라미터(변수명=값)로 자동으로 붙습니다.</b> 예: URL이 <code>…/.live?</code>{' '}
              이고 변수 3개면 → <code>…/.live?submit_id=…&business_id=…&instcd=…</code>
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
              {(ep.variables ?? []).length === 0 && (
                <Typography variant="caption" color="text.disabled">
                  변수 없음
                </Typography>
              )}
            </Stack>

            <Box sx={{ mt: 2 }}>
              <CodeBox label="생성된 URL" value={urlPreview} placeholder="(URL을 입력하세요)" />
              {runtimeTokens.length > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  실행 시 입력받을 변수: {runtimeTokens.map((t) => `{${t}}`).join(', ')}
                </Typography>
              )}
            </Box>
          </SectionCard>

          <SectionCard
            step={3}
            title="헤더"
            desc="인증 토큰 등 요청에 함께 보낼 값입니다."
            done={ep.headers.some((h) => h.key.trim())}
            doneLabel={`${ep.headers.filter((h) => h.key.trim()).length}개`}
            todoLabel="없음"
            action={
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onChange({ headers: [...ep.headers, { key: '', value: '' }] })}
              >
                추가
              </Button>
            }
          >
            {droppedContentType && (
              <Alert
                severity="warning"
                sx={{ mb: 2, py: 0.25, '& .MuiAlert-message': { fontSize: 12.5 } }}
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
          </SectionCard>
        </>
      )}

      {/* ④ 컬럼 매핑 */}
      <SectionCard
        step={4}
        title={isDb ? 'DB 컬럼 매핑' : '응답 컬럼 매핑'}
        desc={
          isDb
            ? '조회 결과의 컬럼을 앱에서 쓸 이름에 연결하세요.'
            : '응답의 어떤 필드를 앱에서 쓸지 연결하세요.'
        }
        done={mappedCount > 0}
        doneLabel={`${mappedCount}개 연결됨`}
        action={
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => onChange({ mappings: [...ep.mappings, { target: '', source: '' }] })}
          >
            추가
          </Button>
        }
      >
        {!isDb && (
          <TextField
            label="배열 위치(rootPath)"
            size="small"
            value={ep.rootPath}
            onChange={(e) => onChange({ rootPath: e.target.value })}
            placeholder="예: data.list"
            helperText="응답 최상위가 배열이면 비워 두세요"
            sx={{ mb: 2, width: 320 }}
          />
        )}

        {appFields.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              이 화면이 쓰는 값: {appFields.map((f) => f.label).join(' · ')}
            </Typography>
            <Button size="small" onClick={() => onChange({ mappings: fillAppFields(appFields) })}>
              앱 필드 불러오기
            </Button>
          </Stack>
        )}

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
      </SectionCard>

      {/* ⑤ 테스트 */}
      {isDb ? (
        <DbTestPanel ep={ep} />
      ) : (
        <SectionCard
          step={5}
          title="호출 테스트"
          desc="실제로 호출해 응답과 매핑 결과를 확인합니다."
        >
          {runtimeTokens.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
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
          <Tooltip title={ep.url ? '' : 'API URL을 먼저 입력하세요'}>
            <span>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={runTest}
                disabled={busy || !ep.url}
              >
                {busy ? '호출 중…' : '호출 테스트'}
              </Button>
            </span>
          </Tooltip>

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

                  <Typography
                    variant="caption"
                    fontWeight={700}
                    display="block"
                    sx={{ mt: 1.5, mb: 0.5 }}
                  >
                    원본 응답(일부)
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.5,
                      bgcolor: '#0f172a',
                      color: '#cbd5e1',
                      borderRadius: 1.5,
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
        </SectionCard>
      )}
    </Stack>
  );
}

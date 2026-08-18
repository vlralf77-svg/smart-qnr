// DB 쿼리 연동 설정 항목 — '연동 관리' 상세에서 연동 방식이 DB 일 때 표시되는 섹션.
//  접속 정보(EZConnect/TNS/JDBC) · 읽기 전용 쿼리 · 바인드 파라미터 · 테스트(시뮬레이션).
import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  DEFAULT_DB,
  type ApiEndpoint,
  type DbConnMode,
  type DbSettings,
} from '@/store/useApiConfigStore';
import { simulateDbQuery, type SimResult } from '@/utils/dbLinkSim';

const MODE_LABELS: Record<DbConnMode, string> = {
  ezconnect: 'EZConnect (호스트/포트/서비스)',
  tns: 'TNS 별칭 (tnsnames.ora)',
  jdbc: 'JDBC URL 직접 입력',
};

/** 접속 정보로 JDBC URL 생성(미리보기·백엔드 전달용) */
function buildJdbcUrl(c: DbSettings): string {
  if (c.mode === 'jdbc') return c.jdbcUrl.trim();
  if (c.mode === 'tns') return c.tnsAlias.trim() ? `jdbc:oracle:thin:@${c.tnsAlias.trim()}` : '';
  const host = c.host.trim();
  const port = c.port.trim() || '1521';
  const svc = c.serviceName.trim();
  return host && svc ? `jdbc:oracle:thin:@//${host}:${port}/${svc}` : '';
}

export default function DbFields({
  ep,
  onChange,
}: {
  ep: ApiEndpoint;
  onChange: (patch: Partial<ApiEndpoint>) => void;
}) {
  const c: DbSettings = ep.db ?? DEFAULT_DB;
  const update = (patch: Partial<DbSettings>) => onChange({ db: { ...c, ...patch } });
  const jdbcPreview = useMemo(() => buildJdbcUrl(c), [c]);

  // 값이 비어 있는 파라미터는 테스트 실행 시 입력받는다
  const runtimeKeys = useMemo(
    () => c.params.filter((p) => p.key && !(p.value ?? '').trim()).map((p) => p.key),
    [c.params],
  );
  const [runtime, setRuntime] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SimResult | null>(null);
  // 시뮬레이터는 기존 DbLinkConfig 모양을 받으므로 연동 항목 값으로 구성해 전달
  const runTest = () =>
    setResult(
      simulateDbQuery(
        {
          enabled: ep.enabled,
          name: ep.name,
          purpose: ep.purpose,
          ...c,
          mappings: ep.mappings.map((m) => ({ target: m.target, column: m.source })),
        },
        runtime,
      ),
    );

  const setParam = (i: number, patch: Partial<{ key: string; value: string }>) =>
    update({ params: c.params.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });

  return (
    <>
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
          값이 들어갈 자리는 <code>:변수명</code> 바인드 파라미터로 쓰세요(문자열 이어붙이기 금지 —
          SQL 인젝션 방지). 컬럼 별칭을 앱 필드명으로 지정하면 매핑이 편합니다.
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

      {/* 테스트(시뮬레이션) */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Typography variant="subtitle2" fontWeight={800}>
            테스트
          </Typography>
          <Chip size="small" label="시뮬레이션" color="warning" variant="outlined" />
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          내장 샘플 데이터에 <b>파라미터(WHERE)</b>와 <b>컬럼 매핑</b>을 적용해 결과를 미리 봅니다.
          (실제 접속은 백엔드 배포 후 동일 화면에서 실제 값으로 실행)
          {ep.purpose === 'patientForms' && ' 예: patientNo = 10001'}
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

        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={runTest}>
          테스트 실행
        </Button>

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
    </>
  );
}

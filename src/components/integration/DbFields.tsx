// DB 쿼리 연동 설정 탭 — 연동 방식이 DB 일 때 상세 영역에 표시된다.
//  DbConnTab  : 접속 정보(EZConnect/TNS/JDBC) + 생성된 JDBC URL 미리보기
//  DbQueryTab : 조회 쿼리(읽기 전용 SELECT)
//  바인드 파라미터·매핑·실행은 공용 화면(IntegrationPanel)에서 처리한다.
import { useMemo } from 'react';
import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  DEFAULT_DB,
  type ApiEndpoint,
  type DbConnMode,
  type DbSettings,
} from '@/store/useApiConfigStore';
import { CodeBox, MONO } from './IntegrationBits';

const MODE_LABELS: Record<DbConnMode, string> = {
  ezconnect: 'EZConnect (호스트/포트/서비스)',
  tns: 'TNS 별칭 (tnsnames.ora)',
  jdbc: 'JDBC URL 직접 입력',
};

/** 접속 정보로 JDBC URL 생성(미리보기·백엔드 전달용) */
export function buildJdbcUrl(c: DbSettings): string {
  if (c.mode === 'jdbc') return c.jdbcUrl.trim();
  if (c.mode === 'tns') return c.tnsAlias.trim() ? `jdbc:oracle:thin:@${c.tnsAlias.trim()}` : '';
  const host = c.host.trim();
  const port = c.port.trim() || '1521';
  const svc = c.serviceName.trim();
  return host && svc ? `jdbc:oracle:thin:@//${host}:${port}/${svc}` : '';
}

type TabProps = { ep: ApiEndpoint; onChange: (patch: Partial<ApiEndpoint>) => void };

const useDb = ({ ep, onChange }: TabProps) => {
  const c: DbSettings = ep.db ?? DEFAULT_DB;
  return { c, update: (patch: Partial<DbSettings>) => onChange({ db: { ...c, ...patch } }) };
};

export function DbConnTab(props: TabProps) {
  const { c, update } = useDb(props);
  const jdbcPreview = useMemo(() => buildJdbcUrl(c), [c]);

  return (
    <Stack spacing={2}>
      <TextField
        select
        label="접속 방식"
        size="small"
        value={c.mode}
        onChange={(e) => update({ mode: e.target.value as DbConnMode })}
        sx={{ width: { xs: '100%', sm: 320 } }}
      >
        {(Object.keys(MODE_LABELS) as DbConnMode[]).map((m) => (
          <MenuItem key={m} value={m}>
            {MODE_LABELS[m]}
          </MenuItem>
        ))}
      </TextField>

      {c.mode === 'ezconnect' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
        />
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
          helperText="운영에서는 서버 secret 주입을 권장합니다"
        />
      </Stack>

      <CodeBox label="생성된 JDBC URL" value={jdbcPreview} placeholder="(접속 정보를 입력하세요)" />
    </Stack>
  );
}

export function DbQueryTab(props: TabProps) {
  const { c, update } = useDb(props);
  return (
    <Stack spacing={1.5}>
      <TextField
        size="small"
        fullWidth
        multiline
        minRows={8}
        value={c.query}
        onChange={(e) => update({ query: e.target.value })}
        InputProps={{ sx: { fontFamily: MONO, fontSize: 12.5 } }}
        placeholder={'SELECT ... FROM ... WHERE patient_no = :patientNo'}
      />
      <Alert severity="info" sx={{ py: 0.25, '& .MuiAlert-message': { fontSize: 12.5 } }}>
        조회(SELECT)만 실행됩니다. 값이 들어갈 자리는 <code>:변수명</code> 바인드 파라미터로
        쓰세요(문자열 이어붙이기 금지 — SQL 인젝션 방지). 컬럼에 <code>AS &quot;formId&quot;</code>{' '}
        처럼 앱 필드명으로 별칭을 주면 매핑이 쉬워집니다.
      </Alert>
      <Typography variant="caption" color="text.secondary">
        바인드 파라미터는 [파라미터] 탭에서 지정합니다.
      </Typography>
    </Stack>
  );
}

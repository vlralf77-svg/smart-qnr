// 로그 뷰어 (관리자) — 화면(프론트) 로그 / 백단(서버) 로그를 확인.
//  · 화면 로그: 앱에서 캡처한 콘솔/오류/네트워크 이벤트(useLogStore)
//  · 백단 로그: 백엔드 /api/logs 엔드포인트가 있을 때만(없으면 안내)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LogLevel, useLogStore } from '@/store/useLogStore';
import { api, isBackendEnabled, ServerLogEntry } from '@/api/client';

const LEVELS: { value: LogLevel | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'error', label: '오류' },
  { value: 'warn', label: '경고' },
  { value: 'info', label: '정보' },
  { value: 'api', label: '네트워크' },
  { value: 'debug', label: '디버그' },
];

const LEVEL_COLOR: Record<string, string> = {
  error: '#d32f2f',
  warn: '#b7791f',
  info: '#167c50',
  api: '#3f76d0',
  debug: '#5b6b7d',
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('ko-KR', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function LevelChip({ level }: { level: string }) {
  return (
    <Chip
      label={level.toUpperCase()}
      size="small"
      sx={{
        height: 20,
        fontSize: 11,
        fontWeight: 700,
        color: LEVEL_COLOR[level] ?? '#5b6b7d',
        bgcolor: `${LEVEL_COLOR[level] ?? '#5b6b7d'}1a`,
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

export default function LogViewer() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'client' | 'server'>('client');
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [query, setQuery] = useState('');

  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);

  const clientFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (level === 'all' ? true : e.level === level))
      .filter((e) => (q ? (e.message + ' ' + (e.detail ?? '')).toLowerCase().includes(q) : true))
      .slice()
      .reverse(); // 최신이 위로
  }, [entries, level, query]);

  // 백단 로그
  const [serverLogs, setServerLogs] = useState<ServerLogEntry[]>([]);
  const [serverErr, setServerErr] = useState<string>('');
  const [serverLoading, setServerLoading] = useState(false);

  const loadServer = async () => {
    if (!isBackendEnabled) return;
    setServerLoading(true);
    setServerErr('');
    try {
      const rows = await api.serverLogs(300);
      setServerLogs(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setServerErr((e as Error).message);
      setServerLogs([]);
    } finally {
      setServerLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'server') void loadServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const download = () => {
    const lines =
      tab === 'client'
        ? clientFiltered.map(
            (e) => `[${fmtTime(e.ts)}] ${e.level.toUpperCase()} ${e.message}${e.detail ? '\n    ' + e.detail : ''}`,
          )
        : serverLogs.map((r) => JSON.stringify(r));
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartqnr-${tab}-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar variant="dense">
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            목록
          </Button>
          <Typography variant="subtitle1" sx={{ flex: 1, textAlign: 'center' }}>
            로그 보기
          </Typography>
          <Box sx={{ width: 72 }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="client" label="화면(프론트) 로그" />
          <Tab value="server" label="백단(서버) 로그" />
        </Tabs>

        {/* 도구 모음 */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="메시지 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {tab === 'client' && (
            <TextField
              select
              size="small"
              label="레벨"
              value={level}
              onChange={(e) => setLevel(e.target.value as LogLevel | 'all')}
              sx={{ width: 140 }}
            >
              {LEVELS.map((l) => (
                <MenuItem key={l.value} value={l.value}>
                  {l.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Box sx={{ flex: 1 }} />
          {tab === 'server' && (
            <Tooltip title="새로고침">
              <span>
                <IconButton onClick={loadServer} disabled={!isBackendEnabled || serverLoading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="텍스트로 저장">
            <IconButton onClick={download}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          {tab === 'client' && (
            <Tooltip title="화면 로그 지우기">
              <IconButton onClick={clear} color="error">
                <DeleteSweepIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* 본문 */}
        {tab === 'client' ? (
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            {clientFiltered.length === 0 ? (
              <Typography sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
                표시할 로그가 없습니다.
              </Typography>
            ) : (
              <Box
                sx={{
                  maxHeight: '68vh',
                  overflowY: 'auto',
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 12.5,
                }}
              >
                {clientFiltered.map((e) => (
                  <Box
                    key={e.id}
                    sx={{
                      display: 'flex',
                      gap: 1.25,
                      alignItems: 'flex-start',
                      px: 1.5,
                      py: 0.75,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography component="span" sx={{ color: 'text.disabled', fontSize: 12, whiteSpace: 'nowrap', pt: '2px' }}>
                      {fmtTime(e.ts)}
                    </Typography>
                    <Box sx={{ pt: '1px' }}>
                      <LevelChip level={e.level} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography component="div" sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {e.message}
                      </Typography>
                      {e.detail && (
                        <Typography
                          component="pre"
                          sx={{ m: 0, mt: 0.5, fontSize: 11.5, color: 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {e.detail}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 0 }}>
            {!isBackendEnabled ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>백엔드(서버)에 연결되어 있지 않습니다.</Typography>
                <Typography variant="body2">
                  서버 로그는 백엔드가 <b>/api/logs</b> 엔드포인트를 제공할 때 표시됩니다.
                  <br />
                  현재는 오프라인(데스크톱) 모드라 서버 로그가 없습니다. 화면(프론트) 로그 탭을 이용하세요.
                </Typography>
              </Box>
            ) : serverErr ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>서버 로그를 불러오지 못했습니다.</Typography>
                <Typography variant="body2" color="text.secondary">
                  {serverErr}
                  <br />
                  백엔드에 <b>/api/logs</b> 엔드포인트가 있는지 확인해 주세요.
                </Typography>
              </Box>
            ) : serverLoading ? (
              <Typography sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>불러오는 중…</Typography>
            ) : serverLogs.length === 0 ? (
              <Typography sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>
                서버 로그가 없습니다.
              </Typography>
            ) : (
              <Box
                sx={{
                  maxHeight: '68vh',
                  overflowY: 'auto',
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 12.5,
                }}
              >
                {serverLogs
                  .filter((r) =>
                    query.trim()
                      ? JSON.stringify(r).toLowerCase().includes(query.trim().toLowerCase())
                      : true,
                  )
                  .map((r, i) => {
                    const lvl = String(r.level ?? 'info').toLowerCase();
                    const ts = r.ts != null ? new Date(r.ts).toLocaleString('ko-KR') : '';
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          gap: 1.25,
                          alignItems: 'flex-start',
                          px: 1.5,
                          py: 0.75,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography component="span" sx={{ color: 'text.disabled', fontSize: 12, whiteSpace: 'nowrap', pt: '2px' }}>
                          {ts}
                        </Typography>
                        <Box sx={{ pt: '1px' }}>
                          <LevelChip level={lvl} />
                        </Box>
                        <Typography component="div" sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}>
                          {r.message != null ? String(r.message) : JSON.stringify(r)}
                        </Typography>
                      </Box>
                    );
                  })}
              </Box>
            )}
          </Paper>
        )}

        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
          화면 로그는 이 앱이 켜져 있는 동안 최근 800건까지 메모리에 보관됩니다(종료 시 사라짐).
        </Typography>
      </Container>
    </Box>
  );
}

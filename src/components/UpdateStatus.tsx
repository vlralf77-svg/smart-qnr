// 자동 업데이트 진행 표시 — Electron 메인의 update:status 이벤트를 받아
// 화면 우하단에 "버전 확인 중…", "다운로드 중 45%" 등을 조용히 보여준다.
// (웹/브리지 없음 환경에서는 아무것도 렌더하지 않음)
import { useEffect, useState } from 'react';
import { Box, CircularProgress, LinearProgress, Paper, Slide, Typography } from '@mui/material';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface Status {
  state: 'checking' | 'available' | 'downloading' | 'downloaded' | 'ready' | 'up-to-date' | 'error';
  version?: string;
  percent?: number;
}

export default function UpdateStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const bridge = window.smartqnr;
    if (!bridge?.onUpdateStatus) return;
    const off = bridge.onUpdateStatus((s) => setStatus(s));
    return off;
  }, []);

  // 자동 사라짐: 최신/에러/다운로드완료는 잠시 후 숨김
  useEffect(() => {
    if (!status) return;
    if (status.state === 'up-to-date' || status.state === 'error' || status.state === 'downloaded') {
      const t = setTimeout(() => setStatus(null), status.state === 'downloaded' ? 6000 : 2600);
      return () => clearTimeout(t);
    }
    return;
  }, [status]);

  // 'ready'(업데이트 준비 완료)는 별도 모달(UpdateReady)이 처리 → 토스트는 표시 안 함
  if (!status || status.state === 'ready') return null;

  const view = (() => {
    switch (status.state) {
      case 'checking':
        return { icon: <CircularProgress size={16} thickness={5} />, text: '새 버전 확인 중…', bar: null };
      case 'available':
        return {
          icon: <CloudDownloadOutlinedIcon fontSize="small" color="secondary" />,
          text: '새 버전을 준비하고 있어요…',
          bar: null,
        };
      case 'downloading':
        return {
          icon: <CloudDownloadOutlinedIcon fontSize="small" color="secondary" />,
          text: `새 버전 다운로드 중… ${status.percent ?? 0}%`,
          bar: status.percent ?? 0,
        };
      case 'downloaded':
        return {
          icon: <CheckCircleOutlineIcon fontSize="small" color="success" />,
          text: `업데이트 준비 완료${status.version ? ` (v${status.version})` : ''}`,
          bar: null,
        };
      case 'up-to-date':
        return {
          icon: <CheckCircleOutlineIcon fontSize="small" color="success" />,
          text: '최신 버전입니다',
          bar: null,
        };
      default:
        return { icon: null, text: '업데이트 확인 실패', bar: null };
    }
  })();

  return (
    <Slide direction="up" in mountOnEnter unmountOnExit>
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 2000,
          minWidth: 240,
          maxWidth: 340,
          px: 1.75,
          py: 1.25,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 6px 24px -8px rgba(15,23,42,0.35)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          {view.icon}
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {view.text}
          </Typography>
        </Box>
        {view.bar !== null && (
          <LinearProgress
            variant="determinate"
            value={view.bar}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        )}
      </Paper>
    </Slide>
  );
}

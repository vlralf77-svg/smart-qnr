// 연동 관리 화면 공용 UI 조각.
//  · SectionCard : 번호(단계)·제목·설명·설정여부 배지를 가진 설정 카드
//  · ChoiceCard  : 라디오를 카드 형태로 크게 보여주는 선택지(연동 방식 등)
//  · CodeBox     : 생성된 URL/JDBC 같은 결과 문자열 미리보기 상자(복사 지원)
import { useState, type ReactNode } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Radio,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export function SectionCard({
  step,
  title,
  desc,
  done,
  doneLabel,
  todoLabel,
  action,
  children,
}: {
  step?: number;
  title: string;
  desc?: ReactNode;
  /** 설정 완료 여부 — 지정하면 헤더 오른쪽에 배지가 나온다 */
  done?: boolean;
  doneLabel?: string;
  todoLabel?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.045),
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {step !== undefined && (
          <Box
            sx={{
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 800,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {step}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={800} noWrap>
            {title}
          </Typography>
          {desc && (
            <Typography variant="caption" color="text.secondary" display="block">
              {desc}
            </Typography>
          )}
        </Box>
        {done !== undefined && (
          <Chip
            size="small"
            variant={done ? 'filled' : 'outlined'}
            color={done ? 'success' : 'default'}
            icon={done ? <CheckCircleIcon /> : undefined}
            label={done ? (doneLabel ?? '설정됨') : (todoLabel ?? '미설정')}
            sx={{ height: 22, fontSize: 11, fontWeight: 700, flexShrink: 0 }}
          />
        )}
        {action}
      </Stack>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Paper>
  );
}

export function ChoiceCard({
  selected,
  icon,
  title,
  desc,
  onSelect,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  desc: string;
  onSelect: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        flex: 1,
        p: 1.75,
        borderRadius: 2.5,
        cursor: 'pointer',
        borderWidth: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: (t) => (selected ? alpha(t.palette.primary.main, 0.06) : 'transparent'),
        transition: 'border-color .15s, background-color .15s',
        '&:hover': { borderColor: selected ? 'primary.main' : 'text.disabled' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Radio checked={selected} size="small" sx={{ p: 0, mt: 0.15 }} tabIndex={-1} />
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            {icon}
            <Typography variant="body2" fontWeight={800}>
              {title}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.4 }}>
            {desc}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function CodeBox({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder: string;
}) {
  const [copied, setCopied] = useState(false);
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard;
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
        <Typography variant="caption" fontWeight={700}>
          {label}
        </Typography>
        {canCopy && value && (
          <Tooltip title={copied ? '복사됨' : '복사'}>
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(value).then(
                  () => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                  },
                  () => undefined,
                );
              }}
              sx={{ p: 0.25 }}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Box
        sx={{
          p: 1.25,
          bgcolor: 'action.hover',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1.5,
          fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
          fontSize: 12.5,
          wordBreak: 'break-all',
          color: value ? 'text.primary' : 'text.disabled',
        }}
      >
        {value || placeholder}
      </Box>
    </Box>
  );
}

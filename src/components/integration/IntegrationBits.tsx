// 연동 관리 화면 공용 UI 조각.
//  · KeyValueTable : 키/값/설명 + 사용 체크박스를 가진 표(마지막 빈 줄에 입력하면 행이 늘어남)
//  · TabLabel      : 탭 이름 옆에 개수/변경점을 표시하는 라벨
//  · CodeBox       : 생성된 URL/JDBC 같은 결과 문자열 미리보기 상자(복사 지원)
//  · EmptyHint     : 내용이 없을 때 가운데 안내
import { useState, type ReactNode } from 'react';
import {
  Box,
  Checkbox,
  IconButton,
  InputBase,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { HeaderPair } from '@/store/useApiConfigStore';

export const MONO = 'ui-monospace, Menlo, Consolas, monospace';

const cellSx = {
  px: 1.25,
  py: 0.6,
  fontSize: 12,
  fontFamily: MONO,
  borderRight: '1px solid',
  borderColor: 'divider',
  '& input': { p: 0 },
} as const;

export function KeyValueTable({
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  keyPrefix,
}: {
  rows: HeaderPair[];
  onChange: (rows: HeaderPair[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  /** 키 앞에 붙는 기호(예: DB 바인드 파라미터의 ':') */
  keyPrefix?: string;
}) {
  // 마지막 줄은 항상 빈 줄 — 여기에 입력하면 새 행이 추가된다
  const list: HeaderPair[] = [...rows, { key: '', value: '' }];

  const edit = (i: number, patch: Partial<HeaderPair>) => {
    if (i === rows.length) {
      const added = { key: '', value: '', ...patch };
      if (!added.key && !added.value && !added.desc) return;
      onChange([...rows, added]);
      return;
    }
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const grid = '38px 1fr 1.2fr 1fr 38px';

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        sx={{
          minWidth: 560,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: grid,
            bgcolor: (t) => alpha(t.palette.primary.main, 0.045),
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& > *': {
              px: 1.25,
              py: 0.6,
              fontSize: 11,
              fontWeight: 800,
              color: 'text.secondary',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
            '& > *:last-of-type': { borderRight: 'none' },
          }}
        >
          <Box />
          <Box>Key</Box>
          <Box>Value</Box>
          <Box>설명</Box>
          <Box />
        </Box>

        {list.map((r, i) => {
          const blank = i === rows.length;
          return (
            <Box
              key={i}
              sx={{
                display: 'grid',
                gridTemplateColumns: grid,
                alignItems: 'center',
                borderBottom: i === list.length - 1 ? 'none' : '1px solid',
                borderColor: 'divider',
                opacity: r.on === false ? 0.5 : 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ display: 'grid', placeItems: 'center' }}>
                {!blank && (
                  <Tooltip title={r.on === false ? '사용 안 함' : '사용'}>
                    <Checkbox
                      size="small"
                      checked={r.on !== false}
                      onChange={(e) => edit(i, { on: e.target.checked })}
                      sx={{ p: 0.25 }}
                    />
                  </Tooltip>
                )}
              </Box>
              <Stack direction="row" alignItems="center" sx={cellSx}>
                {keyPrefix && (
                  <Typography component="span" sx={{ fontFamily: MONO, color: 'text.disabled' }}>
                    {keyPrefix}
                  </Typography>
                )}
                <InputBase
                  fullWidth
                  value={r.key}
                  placeholder={blank ? keyPlaceholder : ''}
                  onChange={(e) => edit(i, { key: e.target.value })}
                  sx={{ fontSize: 12, fontFamily: MONO }}
                />
              </Stack>
              <Box sx={cellSx}>
                <InputBase
                  fullWidth
                  value={r.value}
                  placeholder={blank ? valuePlaceholder : ''}
                  onChange={(e) => edit(i, { value: e.target.value })}
                  sx={{ fontSize: 12, fontFamily: MONO }}
                />
              </Box>
              <Box sx={{ ...cellSx, fontFamily: 'inherit' }}>
                <InputBase
                  fullWidth
                  value={r.desc ?? ''}
                  placeholder={blank ? '설명' : ''}
                  onChange={(e) => edit(i, { desc: e.target.value })}
                  sx={{ fontSize: 12 }}
                />
              </Box>
              <Box sx={{ display: 'grid', placeItems: 'center' }}>
                {!blank && (
                  <IconButton
                    size="small"
                    onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                    sx={{ p: 0.25 }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function TabLabel({ text, count, dot }: { text: string; count?: number; dot?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.6}>
      <span>{text}</span>
      {!!count && (
        <Box
          component="span"
          sx={{
            px: 0.6,
            borderRadius: 1,
            fontSize: 10.5,
            fontWeight: 800,
            lineHeight: 1.6,
            color: 'text.secondary',
            bgcolor: 'action.selected',
          }}
        >
          {count}
        </Box>
      )}
      {dot && (
        <Box
          component="span"
          sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }}
        />
      )}
    </Stack>
  );
}

export function CodeBox({
  label,
  value,
  placeholder,
}: {
  label?: string;
  value: string;
  placeholder: string;
}) {
  const [copied, setCopied] = useState(false);
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard;
  return (
    <Box>
      {label && (
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
      )}
      <Box
        sx={{
          p: 1.25,
          bgcolor: 'action.hover',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1.5,
          fontFamily: MONO,
          fontSize: 12,
          wordBreak: 'break-all',
          color: value ? 'text.primary' : 'text.disabled',
        }}
      >
        {value || placeholder}
      </Box>
    </Box>
  );
}

export function EmptyHint({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 5, color: 'text.disabled' }}>
      {icon}
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Stack>
  );
}

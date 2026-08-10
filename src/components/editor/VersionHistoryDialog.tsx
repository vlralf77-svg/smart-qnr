// 문진 버전 기록 — 현재 확정본 + 과거 확정본(이력)을 목록으로 보여주고
//  선택한 버전의 내용을 읽기전용으로 미리보기한다.
import { useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import { FormSchema } from '@/types/schema';
import FormRenderer from '@/components/renderer/FormRenderer';
import PreviewErrorBoundary from '@/components/PreviewErrorBoundary';

interface Props {
  open: boolean;
  onClose: () => void;
  form: FormSchema;
}

function fmt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ko-KR');
}

export default function VersionHistoryDialog({ open, onClose, form }: Props) {
  // 최신(현재) + 과거 이력(최신이 위)
  const entries = [
    { version: form.version, when: form.updatedAt, current: true, snapshot: form },
    ...(form.history ?? []).map((h) => ({
      version: h.version,
      when: h.confirmedAt,
      current: false,
      snapshot: h.form,
    })),
  ];
  const [sel, setSel] = useState(0);
  const selected = entries[Math.min(sel, entries.length - 1)] ?? entries[0];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
        <HistoryIcon fontSize="small" />
        버전 기록
        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
          {form.title || '제목 없는 문진'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, display: 'flex', height: '72vh' }}>
        {/* 버전 목록 */}
        <Box
          sx={{
            width: 250,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowY: 'auto',
          }}
        >
          <List dense disablePadding>
            {entries.map((e, i) => (
              <ListItemButton key={i} selected={i === sel} onClick={() => setSel(i)}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={800}>v{e.version}</Typography>
                      {e.current ? (
                        <Chip label="현재" size="small" color="primary" />
                      ) : (
                        <Chip label="이전" size="small" variant="outlined" />
                      )}
                    </Stack>
                  }
                  secondary={fmt(e.when)}
                />
              </ListItemButton>
            ))}
          </List>
          {entries.length === 1 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', p: 2 }}>
              아직 이전 버전이 없습니다. 확정된 문진을 수정 후 다시 확정하면 이전 버전이 여기에
              쌓입니다.
            </Typography>
          )}
        </Box>
        {/* 선택 버전 미리보기(읽기전용) */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800}>
              v{selected.version} 내용
            </Typography>
            {selected.current && <Chip label="현재 버전" size="small" color="primary" />}
            <Typography variant="caption" color="text.secondary">
              {fmt(selected.when)}
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ maxWidth: 820, mx: 'auto' }}>
            <PreviewErrorBoundary>
              <FormRenderer
                key={`${selected.current ? 'cur' : 'hist'}-${selected.version}`}
                schema={selected.snapshot}
                preview
              />
            </PreviewErrorBoundary>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// 문진 단위 채점 설정 — 채점 사용 토글, 총점 명칭, 총점 해석 구간(밴드)
import {
  Box,
  Button,
  Collapse,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormScoring, ScoreBand } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';

function newBandId(): string {
  return `band_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

interface Props {
  scoring: FormScoring | undefined;
}

export default function ScoringEditor({ scoring }: Props) {
  const updateMeta = useEditorStore((s) => s.updateMeta);
  const enabled = !!scoring?.enabled;
  const bands = scoring?.bands ?? [];

  const patchScoring = (patch: Partial<FormScoring>) =>
    updateMeta({ scoring: { enabled, label: scoring?.label, bands, ...patch } });

  const updateBand = (id: string, patch: Partial<ScoreBand>) =>
    patchScoring({ bands: bands.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  const num = (raw: string): number => {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <Box sx={{ mt: 1 }}>
      <FormControlLabel
        control={
          <Switch checked={enabled} onChange={(e) => patchScoring({ enabled: e.target.checked })} />
        }
        label="점수 채점 사용 (문항별 점수 → 총점 계산)"
      />
      <Collapse in={enabled} timeout="auto" unmountOnExit>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            label="총점 명칭 (선택)"
            size="small"
            fullWidth
            placeholder="예: 우울 점수"
            value={scoring?.label ?? ''}
            onChange={(e) => patchScoring({ label: e.target.value || undefined })}
          />

          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={0.25}>
              총점 해석 구간 (선택)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              총점이 어느 구간에 속하는지 해석 라벨을 표시합니다. (예: 0~4 정상, 5~9 경도)
            </Typography>
            <Stack spacing={1}>
              {bands.map((b) => (
                <Stack key={b.id} direction="row" spacing={0.5} alignItems="center">
                  <TextField
                    size="small"
                    type="number"
                    label="최소"
                    value={b.min}
                    onChange={(e) => updateBand(b.id, { min: num(e.target.value) })}
                    inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                    sx={{ width: 84 }}
                  />
                  <Typography variant="body2" color="text.disabled">
                    ~
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    label="최대"
                    value={b.max}
                    onChange={(e) => updateBand(b.id, { max: num(e.target.value) })}
                    inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                    sx={{ width: 84 }}
                  />
                  <TextField
                    size="small"
                    label="해석"
                    placeholder="예: 경도"
                    value={b.label}
                    onChange={(e) => updateBand(b.id, { label: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <Box
                    component="input"
                    type="color"
                    value={b.color ?? '#1976d2'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateBand(b.id, { color: e.target.value })
                    }
                    sx={{
                      width: 34,
                      height: 34,
                      p: 0,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => patchScoring({ bands: bands.filter((x) => x.id !== b.id) })}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                patchScoring({
                  bands: [...bands, { id: newBandId(), min: 0, max: 0, label: '' }],
                })
              }
              sx={{ mt: 1 }}
            >
              구간 추가
            </Button>
          </Box>
        </Stack>
      </Collapse>
    </Box>
  );
}

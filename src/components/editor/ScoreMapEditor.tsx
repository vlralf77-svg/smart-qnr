// 척도·숫자 문항의 값 구간 → 점수 매핑 편집 (예: 0~3 → 1점)
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Question, ScoreMapRule } from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';

function newRuleId(): string {
  return `map_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

interface Props {
  sectionId: string;
  question: Question;
}

export default function ScoreMapEditor({ sectionId, question }: Props) {
  const updateQuestion = useEditorStore((s) => s.updateQuestion);
  const rules = question.scoreMap ?? [];

  const setRules = (next: ScoreMapRule[]) =>
    updateQuestion(sectionId, question.id, { scoreMap: next.length ? next : undefined });

  const updateRule = (id: string, patch: Partial<ScoreMapRule>) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const num = (raw: string): number => {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" fontWeight={700} mb={0.25}>
        값 → 점수 매핑 (선택)
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        구간을 지정하면 응답 값 대신 해당 점수로 합산합니다. (예: 0~3 → 1점) 비워두면 응답 숫자 값을
        그대로 사용합니다.
      </Typography>
      <Stack spacing={1}>
        {rules.map((r) => (
          <Stack key={r.id} direction="row" spacing={0.5} alignItems="center">
            <TextField
              size="small"
              type="number"
              label="값 최소"
              value={r.min}
              onChange={(e) => updateRule(r.id, { min: num(e.target.value) })}
              inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
              sx={{ width: 90 }}
            />
            <Typography variant="body2" color="text.disabled">
              ~
            </Typography>
            <TextField
              size="small"
              type="number"
              label="값 최대"
              value={r.max}
              onChange={(e) => updateRule(r.id, { max: num(e.target.value) })}
              inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
              sx={{ width: 90 }}
            />
            <Typography variant="body2" color="text.disabled">
              →
            </Typography>
            <TextField
              size="small"
              type="number"
              label="점수"
              value={r.score}
              onChange={(e) => updateRule(r.id, { score: num(e.target.value) })}
              inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
              sx={{ width: 90 }}
            />
            <IconButton size="small" onClick={() => setRules(rules.filter((x) => x.id !== r.id))}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setRules([...rules, { id: newRuleId(), min: 0, max: 0, score: 0 }])}
        sx={{ mt: 1 }}
      >
        구간 추가
      </Button>
    </Box>
  );
}

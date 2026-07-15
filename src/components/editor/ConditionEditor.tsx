// 조건부 표시(분기) 편집 (§3.3) — 앞선 문항의 응답에 따라 표시
import { Box, MenuItem, Stack, Switch, TextField, Typography, FormControlLabel } from '@mui/material';
import {
  ConditionOperator,
  Question,
  QuestionCondition,
} from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';

interface Props {
  sectionId: string;
  question: Question;
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: '같음(=)' },
  { value: 'notEquals', label: '같지 않음(≠)' },
  { value: 'includes', label: '포함(체크박스)' },
  { value: 'greaterThan', label: '초과(>)' },
  { value: 'lessThan', label: '미만(<)' },
];

export default function ConditionEditor({ sectionId, question }: Props) {
  const { form, updateQuestion } = useEditorStore();
  if (!form) return null;

  // 자기 자신을 제외한 모든 문항(앞선 문항 대상)
  const candidates: Question[] = form.sections
    .flatMap((s) => s.questions)
    .filter((q) => q.id !== question.id && q.type !== 'info' && q.type !== 'signature');

  const enabled = !!question.condition;

  const setCondition = (patch: Partial<QuestionCondition>) => {
    const base: QuestionCondition = question.condition ?? {
      questionId: candidates[0]?.id ?? '',
      operator: 'equals',
      value: '',
    };
    updateQuestion(sectionId, question.id, { condition: { ...base, ...patch } });
  };

  const targetQuestion = candidates.find((q) => q.id === question.condition?.questionId);

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            disabled={candidates.length === 0}
            onChange={(e) =>
              e.target.checked
                ? setCondition({})
                : updateQuestion(sectionId, question.id, { condition: undefined })
            }
          />
        }
        label={
          <Typography variant="subtitle2" fontWeight={700}>
            조건부 표시 (분기)
          </Typography>
        }
      />
      {candidates.length === 0 && (
        <Typography variant="caption" color="text.disabled" display="block">
          다른 문항이 있어야 조건을 설정할 수 있습니다.
        </Typography>
      )}

      {enabled && question.condition && (
        <Stack spacing={1.5} sx={{ mt: 1, pl: 1, borderLeft: '3px solid', borderColor: 'primary.light' }}>
          <TextField
            select
            label="기준 문항"
            size="small"
            value={question.condition.questionId}
            onChange={(e) => setCondition({ questionId: e.target.value })}
          >
            {candidates.map((q) => (
              <MenuItem key={q.id} value={q.id}>
                {q.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="조건"
            size="small"
            value={question.condition.operator}
            onChange={(e) => setCondition({ operator: e.target.value as ConditionOperator })}
          >
            {OPERATORS.map((op) => (
              <MenuItem key={op.value} value={op.value}>
                {op.label}
              </MenuItem>
            ))}
          </TextField>

          {/* 대상이 선택형이면 옵션 드롭다운, 아니면 자유 입력 */}
          {targetQuestion?.options && targetQuestion.options.length > 0 ? (
            <TextField
              select
              label="값"
              size="small"
              value={question.condition.value}
              onChange={(e) => setCondition({ value: e.target.value })}
            >
              {targetQuestion.options.map((o) => (
                <MenuItem key={o.id} value={o.value}>
                  {o.label} ({o.value})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="값"
              size="small"
              value={question.condition.value}
              onChange={(e) => setCondition({ value: e.target.value })}
            />
          )}

          <Typography variant="caption" color="text.secondary">
            이 조건을 만족할 때만 문항이 응답 화면에 표시됩니다.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

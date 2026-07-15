// 선택된 문항 편집 패널 (§4.3 중앙 패널)
import {
  Box,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Question,
  QuestionType,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
  OPTION_TYPES,
} from '@/types/schema';
import { useEditorStore } from '@/store/useEditorStore';
import OptionsEditor from './OptionsEditor';
import ConditionEditor from './ConditionEditor';

interface Props {
  sectionId: string;
  question: Question;
}

export default function QuestionEditPanel({ sectionId, question }: Props) {
  const { updateQuestion, changeQuestionType } = useEditorStore();
  const meta = QUESTION_TYPE_META[question.type];
  const isInfo = question.type === 'info';

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          문항 설정
        </Typography>

        <TextField
          select
          label="문항 유형"
          size="small"
          fullWidth
          value={question.type}
          onChange={(e) =>
            changeQuestionType(sectionId, question.id, e.target.value as QuestionType)
          }
          sx={{ mt: 1 }}
        >
          {QUESTION_TYPE_ORDER.map((t) => (
            <MenuItem key={t} value={t}>
              {QUESTION_TYPE_META[t].label}
              {QUESTION_TYPE_META[t].hint ? ` · ${QUESTION_TYPE_META[t].hint}` : ''}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <TextField
        label={isInfo ? '안내문 내용' : '질문(라벨)'}
        size="small"
        fullWidth
        multiline={isInfo}
        minRows={isInfo ? 3 : 1}
        value={question.label}
        onChange={(e) => updateQuestion(sectionId, question.id, { label: e.target.value })}
      />

      {!isInfo && (
        <>
          <TextField
            label="보조 설명 (선택)"
            size="small"
            fullWidth
            value={question.description ?? ''}
            onChange={(e) =>
              updateQuestion(sectionId, question.id, { description: e.target.value })
            }
          />

          {(question.type === 'text' || question.type === 'textarea' || question.type === 'number') && (
            <TextField
              label="플레이스홀더 (선택)"
              size="small"
              fullWidth
              value={question.placeholder ?? ''}
              onChange={(e) =>
                updateQuestion(sectionId, question.id, { placeholder: e.target.value })
              }
            />
          )}

          <FormControlLabel
            control={
              <Switch
                checked={!!question.required}
                onChange={(e) =>
                  updateQuestion(sectionId, question.id, { required: e.target.checked })
                }
              />
            }
            label="필수 응답"
          />
        </>
      )}

      {OPTION_TYPES.includes(question.type) && (
        <>
          <Divider />
          <OptionsEditor sectionId={sectionId} question={question} />
        </>
      )}

      {(question.type === 'number' || question.type === 'scale') && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              {question.type === 'scale' ? '척도 범위' : '숫자 범위 (선택)'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="최소"
                type="number"
                size="small"
                value={question.min ?? ''}
                onChange={(e) =>
                  updateQuestion(sectionId, question.id, {
                    min: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
              <TextField
                label="최대"
                type="number"
                size="small"
                value={question.max ?? ''}
                onChange={(e) =>
                  updateQuestion(sectionId, question.id, {
                    max: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
              {question.type === 'scale' && (
                <TextField
                  label="간격"
                  type="number"
                  size="small"
                  value={question.step ?? 1}
                  onChange={(e) =>
                    updateQuestion(sectionId, question.id, {
                      step: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              )}
            </Stack>
          </Box>
        </>
      )}

      <Divider />
      <ConditionEditor sectionId={sectionId} question={question} />

      <Typography variant="caption" color="text.disabled">
        유형: {meta.label} · id: {question.id}
      </Typography>
    </Stack>
  );
}

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

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];
const COLOR_PRESETS = ['#1e293b', '#d32f2f', '#1976d2', '#2e7d32', '#ed6c02', '#7b1fa2'];

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

      {/* 글자 스타일: 크기·색상 */}
      <Box>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          글자 스타일
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="크기"
            size="small"
            value={String(question.fontSize ?? 13)}
            onChange={(e) =>
              updateQuestion(sectionId, question.id, { fontSize: Number(e.target.value) })
            }
            sx={{ width: 100 }}
          >
            {FONT_SIZES.map((s) => (
              <MenuItem key={s} value={String(s)}>
                {s}px
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              색상
            </Typography>
            <Box
              component="input"
              type="color"
              value={question.color ?? '#1e293b'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateQuestion(sectionId, question.id, { color: e.target.value })
              }
              sx={{
                width: 40,
                height: 34,
                p: 0,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'transparent',
                cursor: 'pointer',
              }}
            />
            {COLOR_PRESETS.map((c) => (
              <Box
                key={c}
                onClick={() => updateQuestion(sectionId, question.id, { color: c })}
                sx={{
                  width: 20,
                  height: 20,
                  bgcolor: c,
                  borderRadius: '50%',
                  border: '1px solid rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                }}
              />
            ))}
            {question.color && (
              <Typography
                variant="caption"
                sx={{ cursor: 'pointer', color: 'text.secondary', ml: 0.5 }}
                onClick={() => updateQuestion(sectionId, question.id, { color: undefined })}
              >
                기본색
              </Typography>
            )}
          </Stack>
        </Stack>
      </Box>

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

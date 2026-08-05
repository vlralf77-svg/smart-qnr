// PC 입력 레이아웃 — 모든 섹션·문항을 한 화면에 표시(스크롤), 하단에서 제출.
// 모바일의 단계별 위저드와 분리된 데스크톱 전용 폼.
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Control, FieldErrors, useWatch } from 'react-hook-form';
import { AnswerValue, FormSchema } from '@/types/schema';
import { isQuestionVisible } from '@/utils/conditions';
import { orderedQuestions } from '@/utils/questionOrder';
import { paletteFor } from '@/theme/sectionPalette';
import QuestionField from './QuestionField';

interface Props {
  schema: FormSchema;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  onSubmit: () => void;
  preview?: boolean;
  submitLabel?: string;
}

export default function DesktopForm({
  schema,
  control,
  errors,
  onSubmit,
  preview,
  submitLabel,
}: Props) {
  // 조건부 표시 반영
  const answers = (useWatch({ control }) ?? {}) as Record<string, AnswerValue>;

  return (
    <Stack spacing={3} sx={{ width: '100%', maxWidth: 860, mx: 'auto' }}>
      <Box>
        <Typography sx={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.4, color: '#12213a' }}>
          {schema.title || '문진'}
        </Typography>
        {schema.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }}
          >
            {schema.description}
          </Typography>
        )}
      </Box>

      {schema.sections.map((section, si) => {
        const qs = orderedQuestions(section).filter((q) => isQuestionVisible(q, answers));
        if (qs.length === 0) return null;
        const pal = paletteFor(si);
        return (
          <Paper
            key={section.id}
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid rgba(15,23,42,0.06)',
              bgcolor: '#fff',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 16px 32px -18px rgba(15,23,42,0.16)',
            }}
          >
            {/* 섹션 헤더 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 3,
                py: 1.9,
                bgcolor: pal.tint,
                borderBottom: '1px solid rgba(15,23,42,0.05)',
              }}
            >
              <Box
                sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: pal.bar, flexShrink: 0 }}
              />
              <Typography
                sx={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.2, color: pal.text }}
              >
                {section.title}
              </Typography>
            </Box>

            {/* 문항들 */}
            <Stack spacing={3} sx={{ p: 3 }}>
              {qs.map((q) => (
                <QuestionField key={q.id} question={q} control={control} errors={errors} />
              ))}
            </Stack>
          </Paper>
        );
      })}

      {!preview && (
        <Button
          type="button"
          variant="contained"
          size="large"
          onClick={onSubmit}
          sx={{ alignSelf: 'flex-end', minWidth: 200, fontWeight: 700 }}
        >
          {submitLabel ?? '제출하기'}
        </Button>
      )}
    </Stack>
  );
}

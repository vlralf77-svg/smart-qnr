// 발행 스키마를 응답 화면으로 렌더 (§4.4 QNR004) — 에디터 미리보기에도 재사용
import { useForm } from 'react-hook-form';
import { Box, Button, Divider, Paper, Stack, Typography, useMediaQuery } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ko';
import { AnswerValue, FormSchema, isOverlayForm } from '@/types/schema';
import { isQuestionVisible } from '@/utils/conditions';
import SectionQuestions from './SectionQuestions';
import OverlayRenderer from './OverlayRenderer';
import MobileWizard from './MobileWizard';

interface Props {
  schema: FormSchema;
  /** true면 미리보기(제출 버튼 비활성/숨김) */
  preview?: boolean;
  onSubmit?: (answers: Record<string, AnswerValue>) => void;
  /** 기존 응답으로 미리 채우기(수정 모드) */
  defaultValues?: Record<string, unknown>;
  /** 제출 버튼 라벨 */
  submitLabel?: string;
}

export default function FormRenderer({
  schema,
  preview = false,
  onSubmit,
  defaultValues,
  submitLabel,
}: Props) {
  const {
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<Record<string, unknown>>({ mode: 'onBlur', defaultValues });

  const answers = watch() as Record<string, AnswerValue>;

  const submit = handleSubmit((data) => {
    onSubmit?.(data as Record<string, AnswerValue>);
  });

  const overlay = isOverlayForm(schema);
  // 모바일/태블릿(<768px)에서는 스크롤 대신 섹션 기반 위저드로 표시
  const isMobile = useMediaQuery('(max-width:767px)');

  // 모바일: 섹션 기반 위저드 (오버레이/캔버스/일반 섹션 모두 QuestionField로 표시)
  if (isMobile) {
    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
        <Box component="form" onSubmit={submit} noValidate>
          <MobileWizard
            schema={schema}
            control={control}
            errors={errors}
            trigger={trigger}
            onSubmit={submit}
            preview={preview}
            submitLabel={submitLabel}
          />
        </Box>
      </LocalizationProvider>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
      <Box component="form" onSubmit={submit} noValidate>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {schema.title || '(제목 없음)'}
            </Typography>
            {schema.description && (
              <Typography variant="body2" color="text.secondary" mt={0.5} whiteSpace="pre-wrap">
                {schema.description}
              </Typography>
            )}
          </Box>

          {overlay ? (
            <OverlayRenderer schema={schema} control={control} errors={errors} />
          ) : (
            schema.sections.map((section) => {
              const visibleQuestions = section.questions.filter((q) =>
                isQuestionVisible(q, answers),
              );
              if (visibleQuestions.length === 0) return null;
              return (
                <Paper key={section.id} variant="outlined" sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                    {section.title}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <SectionQuestions questions={visibleQuestions} control={control} errors={errors} />
                </Paper>
              );
            })
          )}

          {!preview && (
            <Button type="submit" variant="contained" size="large" fullWidth>
              {submitLabel ?? '제출하기'}
            </Button>
          )}
        </Stack>
      </Box>
    </LocalizationProvider>
  );
}

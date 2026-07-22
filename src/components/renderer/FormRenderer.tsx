// 발행 스키마를 응답 화면으로 렌더 (§4.4 QNR004) — 에디터 미리보기에도 재사용
//  - PDF 오버레이 문진: 원본 PDF 위에 입력창을 얹은 그대로 표시(모바일/PC 공통, 위저드 아님)
//  - 그 외(캔버스/일반): 모바일=단계 위저드 / PC=전체 폼
import { useForm } from 'react-hook-form';
import { Box, Button, Stack, Typography, useMediaQuery } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ko';
import { AnswerValue, FormSchema, isOverlayForm } from '@/types/schema';
import MobileWizard from './MobileWizard';
import DesktopForm from './DesktopForm';
import OverlayRenderer from './OverlayRenderer';

interface Props {
  schema: FormSchema;
  /** true면 미리보기(제출 버튼 숨김, 단계 이동은 가능) */
  preview?: boolean;
  onSubmit?: (answers: Record<string, AnswerValue>) => void;
  /** 기존 응답으로 미리 채우기(수정 모드) */
  defaultValues?: Record<string, unknown>;
  /** 제출 버튼 라벨 */
  submitLabel?: string;
  /** true면 마지막 단계까지 안 가도 어느 단계에서나 완료(제출) 가능 — 수정모드용(모바일 위저드) */
  allowSubmitAnywhere?: boolean;
  /** PDF 오버레이 문진을 전체화면 미리보기로(여러 페이지 나란히 + Ctrl+휠 확대/축소) */
  overlayFit?: boolean;
}

export default function FormRenderer({
  schema,
  preview = false,
  onSubmit,
  defaultValues,
  submitLabel,
  allowSubmitAnywhere,
  overlayFit,
}: Props) {
  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<Record<string, unknown>>({ mode: 'onBlur', defaultValues });

  const submit = handleSubmit((data) => {
    onSubmit?.(data as Record<string, AnswerValue>);
  });

  // PDF 오버레이 문진(원본 PDF 배경)은 그대로 얹어 표시. 캔버스는 제외(위저드로).
  const isPdfOverlay = isOverlayForm(schema) && !schema.canvas;
  // 그 외: 모바일=단계 위저드 / PC=전체 폼
  const isMobile = useMediaQuery('(max-width:899px)');

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
      <Box component="form" onSubmit={submit} noValidate>
        {isPdfOverlay ? (
          <Stack spacing={2}>
            {schema.title && (
              <Typography variant="h6" fontWeight={700}>
                {schema.title}
              </Typography>
            )}
            <OverlayRenderer
              schema={schema}
              control={control}
              errors={errors}
              fitPreview={overlayFit}
            />
            {!preview && (
              <Button type="button" variant="contained" size="large" fullWidth onClick={submit}>
                {submitLabel ?? '제출하기'}
              </Button>
            )}
          </Stack>
        ) : isMobile ? (
          <MobileWizard
            schema={schema}
            control={control}
            errors={errors}
            trigger={trigger}
            onSubmit={submit}
            preview={preview}
            submitLabel={submitLabel}
            allowSubmitAnywhere={allowSubmitAnywhere}
          />
        ) : (
          <DesktopForm
            schema={schema}
            control={control}
            errors={errors}
            onSubmit={submit}
            preview={preview}
            submitLabel={submitLabel}
          />
        )}
      </Box>
    </LocalizationProvider>
  );
}

// 발행 스키마를 응답 화면으로 렌더 (§4.4 QNR004) — 에디터 미리보기에도 재사용
// 모바일=단계별 위저드 / PC=전체 표시 폼 으로 레이아웃을 분리한다.
import { useForm } from 'react-hook-form';
import { Box, useMediaQuery } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ko';
import { AnswerValue, FormSchema } from '@/types/schema';
import MobileWizard from './MobileWizard';
import DesktopForm from './DesktopForm';

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
}

export default function FormRenderer({
  schema,
  preview = false,
  onSubmit,
  defaultValues,
  submitLabel,
  allowSubmitAnywhere,
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

  // 모바일=단계별 위저드 / PC=전체 폼
  const isMobile = useMediaQuery('(max-width:899px)');

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
      <Box component="form" onSubmit={submit} noValidate>
        {isMobile ? (
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

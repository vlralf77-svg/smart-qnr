// 발행 스키마를 응답 화면으로 렌더 (§4.4 QNR004) — 에디터 미리보기에도 재사용
// PC·모바일 공통으로 섹션 기반 위저드(한 화면씩 진행)로 표시한다.
import { useForm } from 'react-hook-form';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ko';
import { AnswerValue, FormSchema } from '@/types/schema';
import MobileWizard from './MobileWizard';

interface Props {
  schema: FormSchema;
  /** true면 미리보기(제출 버튼 숨김, 단계 이동은 가능) */
  preview?: boolean;
  onSubmit?: (answers: Record<string, AnswerValue>) => void;
  /** 기존 응답으로 미리 채우기(수정 모드) */
  defaultValues?: Record<string, unknown>;
  /** 제출 버튼 라벨 */
  submitLabel?: string;
  /** true면 마지막 단계까지 안 가도 어느 단계에서나 완료(제출) 가능 — 수정모드용 */
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
          allowSubmitAnywhere={allowSubmitAnywhere}
        />
      </Box>
    </LocalizationProvider>
  );
}

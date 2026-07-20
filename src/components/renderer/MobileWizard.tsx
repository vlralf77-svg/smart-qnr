// 섹션 기반 위저드 렌더 (PC·모바일 공통)
//  - 문항을 논리적 그룹(섹션이 여러 개면 섹션, 아니면 읽기순서로 5개씩)으로 나눔
//  - 한 화면에 한 그룹, 진행표시(2/5) + 이전/다음/제출
//  - 조건부 표시(condition)를 반영해 숨김 문항은 렌더·검증에서 제외
import { useMemo, useState } from 'react';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Control, FieldErrors, UseFormTrigger, useWatch } from 'react-hook-form';
import { AnswerValue, FormSchema, Question } from '@/types/schema';
import { isQuestionVisible } from '@/utils/conditions';
import { orderedQuestions } from '@/utils/questionOrder';
import QuestionField from './QuestionField';

interface Step {
  title: string;
  questions: Question[];
}

const CHUNK = 5;

function buildSteps(schema: FormSchema): Step[] {
  const withQ = schema.sections.filter((s) => s.questions.length > 0);
  // 섹션이 여러 개면 그대로 단계로(섹션 내부는 읽기순서로 정렬)
  if (withQ.length > 1) {
    return withQ.map((s) => ({ title: s.title, questions: orderedQuestions(s) }));
  }
  // 단일 섹션(캔버스/오버레이): 읽기순서로 정렬해 5개씩 묶음
  const all = schema.sections.flatMap((s) => orderedQuestions(s));
  const steps: Step[] = [];
  for (let i = 0; i < all.length; i += CHUNK) {
    steps.push({ title: `${Math.floor(i / CHUNK) + 1}단계`, questions: all.slice(i, i + CHUNK) });
  }
  return steps.length ? steps : [{ title: '문진', questions: [] }];
}

interface Props {
  schema: FormSchema;
  control: Control<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  trigger: UseFormTrigger<Record<string, unknown>>;
  /** 마지막 단계에서 호출할 제출 함수(react-hook-form handleSubmit 래핑) */
  onSubmit: () => void;
  preview?: boolean;
  submitLabel?: string;
}

export default function MobileWizard({
  schema,
  control,
  errors,
  trigger,
  onSubmit,
  preview,
  submitLabel,
}: Props) {
  const steps = useMemo(() => buildSteps(schema), [schema]);
  const [step, setStep] = useState(0);
  const total = steps.length;
  const cur = steps[Math.min(step, total - 1)];
  const isLast = step >= total - 1;

  // 조건부 표시 반영: 현재 답변에 따라 보이는 문항만 렌더·검증
  const answers = (useWatch({ control }) ?? {}) as Record<string, AnswerValue>;
  const visibleQuestions = cur.questions.filter((q) => isQuestionVisible(q, answers));

  const goNext = async () => {
    // 미리보기는 검증 없이 페이지 이동만. 실제 응답은 보이는 필수 항목을 검증 후 진행.
    const ids = visibleQuestions.map((q) => q.id);
    const ok = preview || ids.length === 0 ? true : await trigger(ids);
    if (ok) {
      setStep((s) => Math.min(s + 1, total - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const goPrev = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Stack spacing={2} sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
      <Box>
        <Typography variant="h6" fontWeight={700}>
          {schema.title || '문진'}
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="body2" fontWeight={600} color="secondary.main">
            {cur.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {step + 1} / {total}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={(Math.min(step + 1, total) / total) * 100}
          sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
        />
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          {visibleQuestions.length ? (
            visibleQuestions.map((q) => (
              <QuestionField key={q.id} question={q} control={control} errors={errors} />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              이 단계에 표시할 항목이 없습니다. 다음으로 진행해 주세요.
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* 내비게이션: 미리보기에서도 단계 이동은 가능(제출만 숨김).
          두 버튼에 서로 다른 key 를 주어 '다음'→'제출' 전환 시 DOM 노드 재사용으로
          유령 submit 이 나는 것을 막고, 제출은 native submit 대신 onSubmit 을 직접 호출. */}
      <Stack direction="row" spacing={1}>
        {total > 1 && (
          <Button
            key="prev"
            type="button"
            variant="outlined"
            size="large"
            fullWidth
            disabled={step === 0}
            onClick={goPrev}
          >
            이전
          </Button>
        )}
        {!isLast ? (
          <Button
            key="next"
            type="button"
            variant="contained"
            size="large"
            fullWidth
            onClick={goNext}
          >
            다음
          </Button>
        ) : (
          !preview && (
            <Button
              key="submit"
              type="button"
              variant="contained"
              size="large"
              fullWidth
              onClick={onSubmit}
            >
              {submitLabel ?? '제출하기'}
            </Button>
          )
        )}
      </Stack>
    </Stack>
  );
}

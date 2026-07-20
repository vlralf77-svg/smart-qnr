// 모바일/태블릿(<768px) 섹션 기반 위저드 렌더
//  - 문항을 논리적 그룹(섹션이 여러 개면 섹션, 아니면 읽기순서로 5개씩)으로 나눔
//  - 한 화면에 한 그룹, 진행표시(2/5) + 이전/다음/제출
import { useMemo, useState } from 'react';
import { Box, Button, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Control, FieldErrors, UseFormTrigger } from 'react-hook-form';
import { FormSchema, Question } from '@/types/schema';
import QuestionField from './QuestionField';

interface Step {
  title: string;
  questions: Question[];
}

const CHUNK = 5;

/** 읽기순서(페이지→위→아래→좌→우) 정렬 */
function readingOrder(a: Question, b: Question): number {
  const pa = a.overlay?.page ?? 0;
  const pb = b.overlay?.page ?? 0;
  if (pa !== pb) return pa - pb;
  const ya = a.overlay?.yPct ?? 0;
  const yb = b.overlay?.yPct ?? 0;
  if (Math.abs(ya - yb) > 3) return ya - yb;
  return (a.overlay?.xPct ?? 0) - (b.overlay?.xPct ?? 0);
}

function buildSteps(schema: FormSchema): Step[] {
  const withQ = schema.sections.filter((s) => s.questions.length > 0);
  // 섹션이 여러 개면 그대로 단계로
  if (withQ.length > 1) {
    return withQ.map((s) => ({ title: s.title, questions: s.questions }));
  }
  // 단일 섹션(캔버스/오버레이): 읽기순서로 정렬해 5개씩 묶음
  const all = schema.sections.flatMap((s) => s.questions).slice().sort(readingOrder);
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

  const goNext = async () => {
    // 현재 단계 필수 항목 검증 후 진행
    const ids = cur.questions.map((q) => q.id);
    const ok = await trigger(ids);
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
    <Stack spacing={2}>
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

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2.5}>
          {cur.questions.map((q) => (
            <QuestionField key={q.id} question={q} control={control} errors={errors} />
          ))}
        </Stack>
      </Paper>

      {!preview && (
        <Stack direction="row" spacing={1}>
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
          {/* 두 버튼에 서로 다른 key 를 주어 React 가 DOM 노드를 재사용하지 않도록 한다.
              (재사용 시 '다음'→'제출' 전환 중 유령 submit 이 발생) 제출도 native submit
              대신 onSubmit 을 명시적으로 호출한다. */}
          {isLast ? (
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
          ) : (
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
          )}
        </Stack>
      )}
    </Stack>
  );
}

// 문진 채점 — 문항별 점수 계산 + 총점/최댓값/해석 구간
import {
  AnswerValue,
  FormSchema,
  Question,
  QuestionOption,
  ScoreBand,
  SCORABLE_TYPES,
} from '@/types/schema';

/** 이 문항이 실제로 채점 대상인지(유형 + scored 플래그) */
export function isQuestionScored(q: Question): boolean {
  return !!q.scored && SCORABLE_TYPES.includes(q.type);
}

/** 선택지 점수(미지정·비정상 값은 0점) */
export function optionScore(o: QuestionOption): number {
  return typeof o.score === 'number' && Number.isFinite(o.score) ? o.score : 0;
}

/** 한 문항의 응답 점수 */
export function questionScore(q: Question, answer: AnswerValue): number {
  if (!isQuestionScored(q)) return 0;
  switch (q.type) {
    case 'radio':
    case 'select': {
      const opt = (q.options ?? []).find((o) => o.value === answer);
      return opt ? optionScore(opt) : 0;
    }
    case 'checkbox': {
      const vals = Array.isArray(answer) ? answer : [];
      return (q.options ?? [])
        .filter((o) => vals.includes(o.value))
        .reduce((sum, o) => sum + optionScore(o), 0);
    }
    case 'scale':
    case 'number': {
      const n = typeof answer === 'number' ? answer : Number(answer);
      return Number.isFinite(n) ? n : 0;
    }
    default:
      return 0;
  }
}

/** 한 문항이 낼 수 있는 최대 점수(총점 대비 표시용) */
export function questionMaxScore(q: Question): number {
  if (!isQuestionScored(q)) return 0;
  switch (q.type) {
    case 'radio':
    case 'select': {
      const scores = (q.options ?? []).map(optionScore);
      return scores.length ? Math.max(...scores) : 0;
    }
    case 'checkbox':
      return (q.options ?? []).reduce((sum, o) => sum + Math.max(0, optionScore(o)), 0);
    case 'scale':
    case 'number':
      return typeof q.max === 'number' && Number.isFinite(q.max) ? q.max : 0;
    default:
      return 0;
  }
}

export interface QuestionScore {
  id: string;
  label: string;
  score: number;
  max: number;
}

export interface ScoreResult {
  total: number;
  max: number;
  scoredCount: number;
  perQuestion: QuestionScore[];
  band?: ScoreBand;
}

/** 총점 해석 구간 찾기(min ≤ total ≤ max) */
export function interpretBand(form: FormSchema, total: number): ScoreBand | undefined {
  return (form.scoring?.bands ?? []).find((b) => total >= b.min && total <= b.max);
}

/** 문진 전체 채점 — 총점·최댓값·문항별 점수·해석 구간 */
export function computeScore(form: FormSchema, answers: Record<string, AnswerValue>): ScoreResult {
  const perQuestion: QuestionScore[] = [];
  let total = 0;
  let max = 0;
  for (const section of form.sections) {
    for (const q of section.questions) {
      if (!isQuestionScored(q)) continue;
      const score = questionScore(q, answers[q.id] ?? null);
      const qMax = questionMaxScore(q);
      total += score;
      max += qMax;
      perQuestion.push({ id: q.id, label: q.label, score, max: qMax });
    }
  }
  return {
    total,
    max,
    scoredCount: perQuestion.length,
    perQuestion,
    band: interpretBand(form, total),
  };
}

/** 이 문진이 채점을 표시해야 하는지(명시 활성화 또는 채점 문항 존재) */
export function isScoringEnabled(form: FormSchema): boolean {
  if (form.scoring?.enabled) return true;
  return form.sections.some((s) => s.questions.some(isQuestionScored));
}

/** 총점 명칭 */
export function scoringLabel(form: FormSchema): string {
  const l = form.scoring?.label?.trim();
  return l && l.length > 0 ? l : '총점';
}

// 조건부 로직 평가 (§3.3) — Phase2 기능이나 렌더러에서 미리 지원
import { AnswerValue, Question } from '@/types/schema';

export function isQuestionVisible(
  question: Question,
  answers: Record<string, AnswerValue>,
): boolean {
  const cond = question.condition;
  if (!cond) return true;

  const target = answers[cond.questionId];
  const { operator, value } = cond;

  switch (operator) {
    case 'equals':
      return String(target ?? '') === value;
    case 'notEquals':
      return String(target ?? '') !== value;
    case 'includes':
      return Array.isArray(target) ? target.includes(value) : false;
    case 'greaterThan':
      return Number(target) > Number(value);
    case 'lessThan':
      return Number(target) < Number(value);
    default:
      return true;
  }
}

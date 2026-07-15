// 스키마 유효성 검증·정규화 (§4.2 / §6.3)
// 신뢰할 수 없는 입력(JSON 임포트, LLM 변환 결과)을 안전한 FormSchema 로 보정한다.
import {
  FormSchema,
  Question,
  QuestionOption,
  QuestionType,
  Section,
  QUESTION_TYPE_META,
  OPTION_TYPES,
} from '@/types/schema';
import { newFormId, uid } from './id';

const VALID_TYPES = new Set<string>(Object.keys(QUESTION_TYPE_META));

export interface NormalizeResult {
  schema: FormSchema;
  warnings: string[];
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeOption(raw: unknown): QuestionOption {
  const o = (raw ?? {}) as Record<string, unknown>;
  const label = asString(o.label, '선택지');
  return {
    id: asString(o.id) || uid('o'),
    label,
    value: asString(o.value) || label,
  };
}

function normalizeQuestion(raw: unknown, warnings: string[], seen: Set<string>): Question {
  const q = (raw ?? {}) as Record<string, unknown>;

  let type = asString(q.type, 'text') as QuestionType;
  if (!VALID_TYPES.has(type)) {
    warnings.push(`알 수 없는 문항 유형 "${String(q.type)}" → text 로 강등`);
    type = 'text';
  }

  let id = asString(q.id);
  if (!id || seen.has(id)) {
    if (id && seen.has(id)) warnings.push(`중복 문항 id "${id}" 재발급`);
    id = uid('q');
  }
  seen.add(id);

  const question: Question = {
    id,
    type,
    label: asString(q.label, '(제목 없는 문항)'),
    required: q.required === true,
  };

  if (typeof q.description === 'string') question.description = q.description;
  if (typeof q.placeholder === 'string') question.placeholder = q.placeholder;

  if (OPTION_TYPES.includes(type)) {
    const rawOpts = Array.isArray(q.options) ? q.options : [];
    if (rawOpts.length === 0) {
      warnings.push(`문항 "${question.label}" 에 선택지가 없어 기본 선택지 추가`);
      question.options = [normalizeOption({ label: '선택지 1' })];
    } else {
      question.options = rawOpts.map((o) => normalizeOption(o));
    }
    if (q.allowEtc === true) question.allowEtc = true;
  }

  if (type === 'scale' || type === 'number') {
    if (typeof q.min === 'number') question.min = q.min;
    if (typeof q.max === 'number') question.max = q.max;
    if (typeof q.step === 'number') question.step = q.step;
    if (type === 'scale') {
      question.min = question.min ?? 0;
      question.max = question.max ?? 10;
      question.step = question.step ?? 1;
    }
  }

  return question;
}

function normalizeSection(raw: unknown, warnings: string[], seen: Set<string>): Section {
  const s = (raw ?? {}) as Record<string, unknown>;
  const questionsRaw = Array.isArray(s.questions) ? s.questions : [];
  return {
    id: asString(s.id) || uid('sec'),
    title: asString(s.title, '섹션'),
    questions: questionsRaw.map((q) => normalizeQuestion(q, warnings, seen)),
  };
}

/**
 * 임의 객체를 유효한 FormSchema 로 정규화.
 * - 알 수 없는 type → text 강등
 * - id 누락/중복 → 재발급
 * - 옵션 없는 선택형 → 기본 선택지 추가
 */
export function normalizeToSchema(raw: unknown): NormalizeResult {
  const warnings: string[] = [];
  const obj = (raw ?? {}) as Record<string, unknown>;
  const seen = new Set<string>();

  let sectionsRaw = Array.isArray(obj.sections) ? obj.sections : [];
  if (sectionsRaw.length === 0) {
    // sections 없이 questions 만 온 경우 단일 섹션으로 감싼다
    if (Array.isArray(obj.questions)) {
      sectionsRaw = [{ id: uid('sec'), title: '문항', questions: obj.questions }];
      warnings.push('섹션 정보가 없어 단일 섹션으로 감쌌습니다');
    } else {
      warnings.push('섹션이 없어 빈 섹션을 생성했습니다');
      sectionsRaw = [{ id: uid('sec'), title: '섹션 1', questions: [] }];
    }
  }

  const status = obj.status === 'published' || obj.status === 'archived' ? obj.status : 'draft';

  const schema: FormSchema = {
    id: asString(obj.id) || newFormId(),
    title: asString(obj.title, '제목 없는 문진'),
    description: asString(obj.description),
    version: typeof obj.version === 'number' ? obj.version : 1,
    status,
    sections: sectionsRaw.map((s) => normalizeSection(s, warnings, seen)),
    createdAt: asString(obj.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { schema, warnings };
}

/** LLM 응답 문자열에서 코드펜스 제거 후 파싱 → 정규화 (§6.3) */
export function parseLlmSchemaText(text: string): NormalizeResult {
  let t = text.trim();
  // ```json ... ``` 코드펜스 제거
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) t = fenced[1].trim();
  // 첫 { ~ 마지막 } 구간만 취함(설명 텍스트 방어)
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first >= 0 && last > first) t = t.slice(first, last + 1);

  const parsed = JSON.parse(t) as unknown;
  return normalizeToSchema(parsed);
}

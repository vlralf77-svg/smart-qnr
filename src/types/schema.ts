// ============================================================
// SmartQnR 문진 스키마 — 핵심 계약(Contract)
// 프론트/백엔드/LLM 이 공유하는 단일 스키마. (작업지시서 §3.1~3.3)
// ============================================================

/** 문항 유형 (§3.2) */
export type QuestionType =
  | 'radio' // 단일 선택
  | 'checkbox' // 복수 선택
  | 'select' // 드롭다운 단일선택
  | 'text' // 단답형
  | 'textarea' // 장문형
  | 'number' // 숫자
  | 'date' // 날짜
  | 'boolean' // 예/아니오
  | 'scale' // 척도 (예: 통증 NRS 0~10)
  | 'signature' // 서명 (동의서용, Phase3)
  | 'info'; // 안내문 (입력 없음)

/** 선택지가 필요한 유형 */
export const OPTION_TYPES: QuestionType[] = ['radio', 'checkbox', 'select'];

/** 입력이 없는(값을 수집하지 않는) 유형 */
export const NON_INPUT_TYPES: QuestionType[] = ['info'];

/** 조건부 로직 연산자 (§3.3) */
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'includes' // 체크박스용
  | 'greaterThan'
  | 'lessThan';

export interface QuestionCondition {
  questionId: string;
  operator: ConditionOperator;
  value: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

/** 에디터 캔버스 상의 위치·크기 (12열 그리드 단위). 없으면 문항 순서대로 자동 배치. */
export interface QuestionLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  /** radio/checkbox/select 에서 사용 */
  options?: QuestionOption[];
  /** '기타(직접입력)' 옵션 자동 추가 */
  allowEtc?: boolean;
  /** number/scale 범위 */
  min?: number;
  max?: number;
  step?: number;
  /** 조건부 표시 (Phase2) */
  condition?: QuestionCondition;
  /** 캔버스 위치·크기 (드래그로 편집). 데스크톱 렌더링에서만 사용, 모바일은 세로 스택으로 폴백 */
  layout?: QuestionLayout;
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export type FormStatus = 'draft' | 'published' | 'archived';

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  version: number;
  status: FormStatus;
  sections: Section[];
  createdAt?: string;
  updatedAt?: string;
}

// ------------------------------------------------------------
// 문항 유형 메타데이터 (에디터 UI / 매핑용)
// ------------------------------------------------------------

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string; // 한글 표시명
  hasOptions: boolean;
  isInput: boolean;
  hint?: string;
}

export const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
  radio: { type: 'radio', label: '단일 선택', hasOptions: true, isInput: true },
  checkbox: { type: 'checkbox', label: '복수 선택', hasOptions: true, isInput: true },
  select: { type: 'select', label: '드롭다운', hasOptions: true, isInput: true },
  text: { type: 'text', label: '단답형', hasOptions: false, isInput: true },
  textarea: { type: 'textarea', label: '장문형', hasOptions: false, isInput: true },
  number: { type: 'number', label: '숫자', hasOptions: false, isInput: true, hint: '최소/최대 지정 가능' },
  date: { type: 'date', label: '날짜', hasOptions: false, isInput: true },
  boolean: { type: 'boolean', label: '예/아니오', hasOptions: false, isInput: true },
  scale: { type: 'scale', label: '척도(0~10)', hasOptions: false, isInput: true, hint: '통증 점수 등' },
  signature: { type: 'signature', label: '서명', hasOptions: false, isInput: true, hint: 'Phase3' },
  info: { type: 'info', label: '안내문', hasOptions: false, isInput: false, hint: '입력 없음' },
};

export const QUESTION_TYPE_ORDER: QuestionType[] = [
  'radio',
  'checkbox',
  'select',
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'scale',
  'info',
  'signature',
];

// ------------------------------------------------------------
// 응답(Answer) 타입 — QNR004 렌더러/제출용
// ------------------------------------------------------------

/** 문항 id → 응답 값 (문항 유형에 따라 형태가 다름) */
export type AnswerValue = string | number | boolean | string[] | null;

export interface FormResponse {
  responseId: string;
  formId: string;
  formVersion: number;
  patientId?: string;
  submittedAt: string;
  answers: Record<string, AnswerValue>;
}

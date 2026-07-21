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

/** PDF 배경 오버레이 모드에서의 위치·크기 (페이지 대비 %). 원본 PDF 위에 입력필드를 얹는다. */
export interface QuestionOverlay {
  page: number; // 0-based 페이지 인덱스
  xPct: number; // 0~100 (왼쪽)
  yPct: number; // 0~100 (위)
  wPct: number; // 0~100 (너비)
  hPct: number; // 0~100 (높이)
}

/** 표 셀 등 감지된 사각형 영역 (페이지 대비 %). 클릭 배치 시 자동 크기 스냅에 사용 */
export interface CellRegion {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

/** PDF 페이지 배경 이미지 1장 */
export interface FormPage {
  image: string; // data URL (PNG) — 렌더된 PDF 페이지
  width: number; // 렌더 px 너비
  height: number; // 렌더 px 높이
  cells?: CellRegion[]; // 감지된 표 셀 영역(%)
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
  /** PDF 배경 오버레이 모드에서의 위치(%). 폼에 pages 가 있을 때 사용 */
  overlay?: QuestionOverlay;
  /** 글자 크기(px). 질문 라벨·입력 텍스트에 적용. 미지정 시 기본값 */
  fontSize?: number;
  /** 글자 색상(CSS color, 예: #d32f2f). 라벨·입력 텍스트에 적용 */
  color?: string;
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
  /** PDF 배경 이미지들. 존재하면 이 폼은 "오버레이 모드"(원본 PDF 위에 필드 배치) */
  pages?: FormPage[];
  /** 빈 캔버스(흰 문서)로 직접 작성한 문진. 배경에 글자가 없으므로 각 필드에 라벨을 함께 표시한다. */
  canvas?: boolean;
  /** 테스트 대상 문진 여부. 환자(실사용자) 화면에서 이 값이 true 인 문진만 조회된다. */
  testFlag?: boolean;
  /** 문진 분류(카테고리) — 목록에서 필터링/정리에 사용 */
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 폼이 PDF 오버레이 모드인지 여부 */
export function isOverlayForm(form: FormSchema): boolean {
  return Array.isArray(form.pages) && form.pages.length > 0;
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

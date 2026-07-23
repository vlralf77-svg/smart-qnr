// 에디터 캔버스(자유 배치) 그리드 상수·헬퍼
import { Question, QuestionType, QuestionLayout } from '@/types/schema';

export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 56;
export const GRID_MARGIN: [number, number] = [12, 12];
export const DEFAULT_QUESTION_W = 12; // 기본은 전체 너비(세로 스택과 동일하게 시작)
export const DEFAULT_QUESTION_H = 2; // 기본 높이(작게 시작 — 필요 시 드래그로 키움)

/** 문항 유형에 맞춘 기본 높이(행 수). 단순 입력은 작게, 선택지/장문은 조금 크게. */
export function defaultHeightForType(type: QuestionType, optionCount = 0): number {
  switch (type) {
    case 'textarea':
    case 'signature':
      return 3;
    case 'radio':
    case 'checkbox':
      // 라벨 1행 + 선택지(2개당 1행 근사), 최소 2행
      return Math.max(2, 1 + Math.ceil((optionCount || 2) / 2));
    default:
      // text, number, date, boolean, select, scale, info 등
      return 2;
  }
}

function bottomOf(questions: Question[]): number {
  let bottom = 0;
  for (const q of questions) {
    if (q.layout) bottom = Math.max(bottom, q.layout.y + q.layout.h);
  }
  return bottom;
}

/** 새 문항을 섹션 맨 아래에 전체 너비로 배치(유형별 기본 높이 적용) */
export function createDefaultLayout(existing: Question[], type?: QuestionType, optionCount = 0): QuestionLayout {
  const h = type ? defaultHeightForType(type, optionCount) : DEFAULT_QUESTION_H;
  return { x: 0, y: bottomOf(existing), w: DEFAULT_QUESTION_W, h };
}

/** 복제된 문항을 원본 바로 아래에 배치 */
export function createDuplicateLayout(source: Question, existing: Question[]): QuestionLayout {
  if (source.layout) {
    return { ...source.layout, y: bottomOf(existing) };
  }
  return createDefaultLayout(existing);
}

/**
 * layout이 없는 문항(구버전 데이터·JSON 임포트)에도 안전하게 좌표를 부여한다.
 * 배열 순서대로 세로로 쌓아 기존 목록형 순서와 동일하게 보이도록 한다.
 */
export function withLayouts(questions: Question[]): (Question & { layout: QuestionLayout })[] {
  let y = 0;
  const result: (Question & { layout: QuestionLayout })[] = [];
  for (const q of questions) {
    if (q.layout) {
      result.push(q as Question & { layout: QuestionLayout });
      y = Math.max(y, q.layout.y + q.layout.h);
    } else {
      const layout: QuestionLayout = { x: 0, y, w: DEFAULT_QUESTION_W, h: DEFAULT_QUESTION_H };
      y += DEFAULT_QUESTION_H;
      result.push({ ...q, layout });
    }
  }
  return result;
}

/** 응답 화면(모바일 등 폴백) 용: 캔버스 좌표 기준 읽기 순서(위→아래, 좌→우) 정렬 */
export function sortByReadingOrder(questions: Question[]): Question[] {
  const placed = withLayouts(questions);
  return [...placed].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
}

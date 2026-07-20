// 스키마 요소 기본값 생성 팩토리
import {
  FormSchema,
  Question,
  QuestionOption,
  QuestionType,
  Section,
  OPTION_TYPES,
} from '@/types/schema';
import { newFormId, uid } from './id';

export function createOption(label = '새 선택지'): QuestionOption {
  return { id: uid('o'), label, value: label };
}

export function createQuestion(type: QuestionType = 'text'): Question {
  const base: Question = {
    id: uid('q'),
    type,
    label: '새 문항',
    required: false,
  };
  if (OPTION_TYPES.includes(type)) {
    base.options = [createOption('선택지 1'), createOption('선택지 2')];
  }
  if (type === 'scale') {
    base.min = 0;
    base.max = 10;
    base.step = 1;
  }
  if (type === 'info') {
    base.label = '안내문을 입력하세요';
  }
  return base;
}

export function createSection(title = '새 섹션'): Section {
  return {
    id: uid('sec'),
    title,
    questions: [],
  };
}

/** 빈 흰색 페이지 이미지(PNG data URL) 생성 — 캔버스 편집용 배경 */
export function blankPageDataUrl(width = 800, height = 1131): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL('image/png');
}

export const BLANK_PAGE_W = 800;
export const BLANK_PAGE_H = 1131; // A4 세로 비율 근사

/** 빈 캔버스(흰 페이지) 문진 — 파워포인트식 팔레트 편집기로 열린다(pages 보유). */
export function createBlankCanvasForm(title = '제목 없는 문진'): FormSchema {
  const now = new Date().toISOString();
  return {
    id: newFormId(),
    title,
    description: '',
    version: 1,
    status: 'draft',
    sections: [{ id: uid('sec'), title: '섹션 1', questions: [] }],
    pages: [{ image: blankPageDataUrl(BLANK_PAGE_W, BLANK_PAGE_H), width: BLANK_PAGE_W, height: BLANK_PAGE_H }],
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyForm(title = '제목 없는 문진'): FormSchema {
  return {
    id: newFormId(),
    title,
    description: '',
    version: 1,
    status: 'draft',
    sections: [
      {
        id: uid('sec'),
        title: '섹션 1',
        questions: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** 문항 유형 변경 시 옵션/범위 정합성 보정 */
export function coerceQuestionForType(q: Question, type: QuestionType): Question {
  const next: Question = { ...q, type };
  if (OPTION_TYPES.includes(type)) {
    if (!next.options || next.options.length === 0) {
      next.options = [createOption('선택지 1'), createOption('선택지 2')];
    }
  } else {
    delete next.options;
    delete next.allowEtc;
  }
  if (type === 'scale') {
    next.min = next.min ?? 0;
    next.max = next.max ?? 10;
    next.step = next.step ?? 1;
  }
  if (type !== 'scale' && type !== 'number') {
    delete next.min;
    delete next.max;
    delete next.step;
  }
  return next;
}

// 질문 제시(답변) 순서 기준 — 전 화면 공통.
//  순서 = 섹션 순서 → 섹션 내 읽기순서(페이지 → 위→아래 → 좌→우)
//  overlay(위치) 정보가 없으면 0 이므로 배열(작성) 순서를 그대로 유지한다.
import { Question, Section } from '@/types/schema';

export function readingOrder(a: Question, b: Question): number {
  const pa = a.overlay?.page ?? 0;
  const pb = b.overlay?.page ?? 0;
  if (pa !== pb) return pa - pb;
  const ya = a.overlay?.yPct ?? 0;
  const yb = b.overlay?.yPct ?? 0;
  if (Math.abs(ya - yb) > 3) return ya - yb;
  return (a.overlay?.xPct ?? 0) - (b.overlay?.xPct ?? 0);
}

/** 섹션 내 질문을 읽기순서로 정렬한 새 배열(원본 불변) */
export function orderedQuestions(section: Section): Question[] {
  return section.questions.slice().sort(readingOrder);
}

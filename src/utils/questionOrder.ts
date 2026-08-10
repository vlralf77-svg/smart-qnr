// 질문 제시(답변) 순서 기준 — 전 화면 공통.
//  순서 = 섹션 순서 → 섹션 내 읽기순서
//    1) PDF 오버레이 문진: overlay(page → 위→아래 → 좌→우)
//    2) 캔버스(자유 배치) 문진: layout(캔버스 y → x) — 드래그로 바꾼 순서를 반영
//    3) 둘 다 없으면 배열(작성) 순서 유지
import { Question, Section } from '@/types/schema';

export function readingOrder(a: Question, b: Question): number {
  // 1) PDF 오버레이(원본 위 배치)
  const pa = a.overlay?.page ?? 0;
  const pb = b.overlay?.page ?? 0;
  if (pa !== pb) return pa - pb;
  const oya = a.overlay?.yPct;
  const oyb = b.overlay?.yPct;
  if (oya != null || oyb != null) {
    const ya = oya ?? 0;
    const yb = oyb ?? 0;
    if (Math.abs(ya - yb) > 3) return ya - yb;
    return (a.overlay?.xPct ?? 0) - (b.overlay?.xPct ?? 0);
  }
  // 2) 캔버스 그리드 위치 — 위→아래, 좌→우 (드래그로 바꾼 순서 반영)
  const la = a.layout;
  const lb = b.layout;
  if (la || lb) {
    const ya = la?.y ?? 0;
    const yb = lb?.y ?? 0;
    if (ya !== yb) return ya - yb;
    return (la?.x ?? 0) - (lb?.x ?? 0);
  }
  // 3) 위치 정보 없음 → 배열(작성) 순서 유지
  return 0;
}

/** 섹션 내 질문을 읽기순서로 정렬한 새 배열(원본 불변) */
export function orderedQuestions(section: Section): Question[] {
  return section.questions.slice().sort(readingOrder);
}

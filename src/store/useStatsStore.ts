// 사용자가 직접 구성하는 통계 항목들 — 기간·문진·문항 조합. 브라우저에 기억.
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { uid } from '@/utils/id';

export type ChartKind = 'bar' | 'donut';
export type FilterOp = 'eq' | 'gte' | 'lte' | 'includes';

// AND 조건 — 이 조건들을 모두 만족하는 응답만 집계 대상으로 추린다.
export interface StatFilter {
  id: string;
  questionId: string;
  op: FilterOp;
  value: string;
}

// 통계 종류: 문항별 분포 / 총점 분포(채점 문진)
export type StatMeasure = 'question' | 'score';

export interface StatItem {
  id: string;
  title: string;
  formId: string;
  questionIds: string[]; // 한 기간에 대해 여러 문항을 함께 구성
  filters: StatFilter[]; // AND 조건으로 대상 응답을 추림
  from: string; // YYYY-MM-DD ('' = 제한 없음)
  to: string; // YYYY-MM-DD ('' = 제한 없음)
  chart: ChartKind;
  /** 'question'=문항별 분포, 'score'=기간 내 총점 분포(채점 문진). 미지정=question */
  measure?: StatMeasure;
}

interface StatsState {
  items: StatItem[];
  addItem: (preset?: Partial<StatItem>) => void;
  updateItem: (id: string, patch: Partial<StatItem>) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
}

function blank(preset?: Partial<StatItem>): StatItem {
  return {
    id: uid('stat'),
    title: '새 통계',
    formId: '',
    questionIds: [],
    filters: [],
    from: '',
    to: '',
    chart: 'donut',
    measure: 'question',
    ...preset,
  };
}

export const useStatsStore = create<StatsState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        addItem: (preset) => set((st) => ({ items: [...st.items, blank(preset)] })),
        updateItem: (id, patch) =>
          set((st) => ({
            items: st.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
          })),
        removeItem: (id) => set((st) => ({ items: st.items.filter((it) => it.id !== id) })),
        duplicateItem: (id) =>
          set((st) => {
            const src = st.items.find((it) => it.id === id);
            if (!src) return st;
            const copy = { ...src, id: uid('stat'), title: `${src.title} (복사)` };
            const idx = st.items.findIndex((it) => it.id === id);
            const items = st.items.slice();
            items.splice(idx + 1, 0, copy);
            return { items };
          }),
      }),
      {
        name: 'smartqnr-stats',
        version: 2,
        // v1: 단일 문항(questionId) → 다중(questionIds), v2: AND 조건(filters) 추가
        migrate: (persisted: unknown, version: number) => {
          const state = persisted as { items?: (StatItem & { questionId?: string })[] } | undefined;
          if (state?.items) {
            state.items = state.items.map((it) => ({
              ...it,
              questionIds:
                it.questionIds ??
                (version < 1 && it.questionId ? [it.questionId] : (it.questionIds ?? [])),
              filters: it.filters ?? [],
            }));
          }
          return state as unknown as StatsState;
        },
      },
    ),
    { name: 'stats' },
  ),
);

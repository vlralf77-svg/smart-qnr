// 사용자가 직접 구성하는 통계 항목들 — 기간·문진·문항 조합. 브라우저에 기억.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/utils/id';

export type ChartKind = 'bar' | 'donut';

export interface StatItem {
  id: string;
  title: string;
  formId: string;
  questionIds: string[]; // 한 기간에 대해 여러 문항을 함께 구성
  from: string; // YYYY-MM-DD ('' = 제한 없음)
  to: string; // YYYY-MM-DD ('' = 제한 없음)
  chart: ChartKind;
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
    from: '',
    to: '',
    chart: 'bar',
    ...preset,
  };
}

export const useStatsStore = create<StatsState>()(
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
      version: 1,
      // 예전 단일 문항(questionId) → 다중 문항(questionIds) 마이그레이션
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { items?: (StatItem & { questionId?: string })[] } | undefined;
        if (state?.items && version < 1) {
          state.items = state.items.map((it) => ({
            ...it,
            questionIds: it.questionIds ?? (it.questionId ? [it.questionId] : []),
          }));
        }
        return state as unknown as StatsState;
      },
    },
  ),
);

// 팔레트에서 끌고 있는 컴포넌트 유형 — 팔레트(드래그 시작)와 캔버스(드롭 위치 표시)가 공유한다.
//  화면을 벗어나면 남을 값이 아니므로 저장(persist)하지 않는다.
import { create } from 'zustand';
import type { QuestionType } from '@/types/schema';

interface PaletteDragState {
  /** 지금 끌고 있는 유형(없으면 null) */
  type: QuestionType | null;
  setType: (type: QuestionType | null) => void;
}

export const usePaletteDrag = create<PaletteDragState>((set) => ({
  type: null,
  setType: (type) => set({ type }),
}));

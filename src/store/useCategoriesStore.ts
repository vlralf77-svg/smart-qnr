// 문진 분류(카테고리) 관리 — 이름 목록을 로컬에 영속화.
//  문진(FormSchema.category)은 여기의 이름 문자열을 참조한다.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CategoriesState {
  categories: string[];
  /** 분류 추가(중복/빈값 무시) */
  addCategory: (name: string) => void;
  /** 분류 이름 변경 */
  renameCategory: (oldName: string, newName: string) => void;
  /** 분류 삭제 */
  removeCategory: (name: string) => void;
}

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set) => ({
      categories: ['건강검진', '수술', '예방접종', '일반'],
      addCategory: (name) =>
        set((s) => {
          const v = name.trim();
          return !v || s.categories.includes(v) ? s : { categories: [...s.categories, v] };
        }),
      renameCategory: (oldName, newName) =>
        set((s) => {
          const v = newName.trim();
          if (!v || s.categories.includes(v)) return s;
          return { categories: s.categories.map((c) => (c === oldName ? v : c)) };
        }),
      removeCategory: (name) =>
        set((s) => ({ categories: s.categories.filter((c) => c !== name) })),
    }),
    { name: 'smartqnr-categories' },
  ),
);

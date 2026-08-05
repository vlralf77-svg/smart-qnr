// 문진 분류(카테고리) 관리 — 이름 목록을 로컬에 영속화.
//  2뎁스 지원: 하위 분류는 "대분류 > 소분류" 경로 문자열로 저장한다(구분자 CATEGORY_SEP).
//  문진(FormSchema.category)은 여기의 경로 문자열을 그대로 참조한다(하위 호환).
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 대분류/소분류 구분자
export const CATEGORY_SEP = ' > ';

export function splitCategory(path: string): { parent: string; child?: string } {
  const i = path.indexOf(CATEGORY_SEP);
  if (i < 0) return { parent: path };
  return { parent: path.slice(0, i), child: path.slice(i + CATEGORY_SEP.length) };
}

export function makeCategoryPath(parent: string, child?: string): string {
  const p = parent.trim();
  const c = (child ?? '').trim();
  return c ? `${p}${CATEGORY_SEP}${c}` : p;
}

interface CategoriesState {
  categories: string[]; // 대분류 이름 또는 "대분류 > 소분류" 경로
  /** 분류 추가(중복/빈값 무시) — 전체 경로 문자열 */
  addCategory: (name: string) => void;
  /** 대분류 아래 하위 분류 추가(대분류가 없으면 함께 등록) */
  addSubCategory: (parent: string, child: string) => void;
  /** 분류 이름/경로 변경 — 대분류를 바꾸면 하위 경로도 함께 갱신 */
  renameCategory: (oldPath: string, newPath: string) => void;
  /** 분류 삭제 — 대분류 삭제 시 하위 경로도 함께 삭제 */
  removeCategory: (path: string) => void;
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

export const useCategoriesStore = create<CategoriesState>()(
  devtools(
    persist(
      (set) => ({
        categories: ['건강검진', '수술', '예방접종', '일반'],
        addCategory: (name) =>
          set((s) => {
            const v = name.trim();
            return !v || s.categories.includes(v) ? s : { categories: [...s.categories, v] };
          }),
        addSubCategory: (parent, child) =>
          set((s) => {
            const p = parent.trim();
            const c = child.trim();
            if (!p || !c) return s;
            const path = makeCategoryPath(p, c);
            if (s.categories.includes(path)) return s;
            // 대분류가 목록에 없으면 함께 등록
            return { categories: uniq([...s.categories, p, path]) };
          }),
        renameCategory: (oldPath, newPath) =>
          set((s) => {
            const from = oldPath.trim();
            const to = newPath.trim();
            if (!from || !to || from === to) return s;
            const prefix = from + CATEGORY_SEP;
            const mapped = s.categories.map((c) => {
              if (c === from) return to;
              if (c.startsWith(prefix)) return to + CATEGORY_SEP + c.slice(prefix.length);
              return c;
            });
            return { categories: uniq(mapped) };
          }),
        removeCategory: (path) =>
          set((s) => {
            const target = path.trim();
            const prefix = target + CATEGORY_SEP;
            return {
              categories: s.categories.filter((c) => c !== target && !c.startsWith(prefix)),
            };
          }),
      }),
      { name: 'smartqnr-categories' },
    ),
    { name: 'categories' },
  ),
);

// 문진 에디터 상태관리 (§4.3) — 편집 중인 스키마 + 편집 오퍼레이션
import { create } from 'zustand';
import {
  FormPage,
  FormSchema,
  Question,
  QuestionLayout,
  QuestionOption,
  QuestionOverlay,
  QuestionType,
  Section,
} from '@/types/schema';
import {
  coerceQuestionForType,
  createOption,
  createQuestion,
  createSection,
  createBlankCanvasForm,
  blankPageDataUrl,
  BLANK_PAGE_W,
  BLANK_PAGE_H,
} from '@/utils/schemaFactory';
import {
  createDefaultLayout,
  createDuplicateLayout,
  GRID_COLS,
  DEFAULT_QUESTION_W,
  DEFAULT_QUESTION_H,
} from '@/utils/gridLayout';

interface Selection {
  sectionId: string;
  questionId: string;
}

const HISTORY_LIMIT = 60;

interface EditorState {
  form: FormSchema | null;
  /** 편집 패널이 다루는 기준(primary) 선택 */
  selected: Selection | null;
  /** 다중 선택된 문항 id 목록(기준 선택 포함). 일괄 삭제·이동에 사용 */
  selectedIds: string[];
  dirty: boolean;

  // 실행 취소 이력
  _past: FormSchema[];
  _future: FormSchema[];
  undo: () => void;
  redo: () => void;
  /** 현재 선택된 문항 삭제(Delete 키) */
  deleteSelected: () => void;
  /**
   * 선택된 문항을 방향키로 조작.
   * - move: 일반 이동, fine: 미세 이동(Ctrl), resize: 크기 조절(Shift)
   */
  nudgeSelected: (
    dir: 'left' | 'right' | 'up' | 'down',
    mode: 'move' | 'fine' | 'resize',
  ) => void;

  // 초기화
  loadForm: (form: FormSchema) => void;
  newForm: () => void;
  reset: () => void;

  // 폼 메타
  updateMeta: (
    patch: Partial<Pick<FormSchema, 'title' | 'description' | 'testFlag' | 'category'>>,
  ) => void;

  // 섹션
  addSection: () => void;
  updateSection: (sectionId: string, patch: Partial<Pick<Section, 'title'>>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  /** 선택된 문항들을 새 섹션으로 묶는다(섹션 그룹 지정). 선택 상태는 유지 */
  groupSelectedIntoSection: (title?: string) => void;
  /** 선택된 문항들을 기존 섹션으로 이동 */
  assignSelectedToSection: (sectionId: string) => void;
  /** 섹션 해제 — 해당 섹션의 문항을 첫 섹션으로 합치고 그 섹션을 제거 */
  ungroupSection: (sectionId: string) => void;

  // 문항
  addQuestion: (sectionId: string, type?: QuestionType) => void;
  updateQuestion: (sectionId: string, questionId: string, patch: Partial<Question>) => void;
  changeQuestionType: (sectionId: string, questionId: string, type: QuestionType) => void;
  removeQuestion: (sectionId: string, questionId: string) => void;
  duplicateQuestion: (sectionId: string, questionId: string) => void;
  /** 캔버스 드래그·리사이즈로 문항 위치/크기 변경 */
  updateQuestionLayout: (sectionId: string, questionId: string, layout: QuestionLayout) => void;
  /** PDF 오버레이 모드: 필드 위치/크기(%) 변경 */
  updateQuestionOverlay: (sectionId: string, questionId: string, overlay: QuestionOverlay) => void;
  /** PDF 오버레이 모드: 지정 위치에 필드 추가 */
  addOverlayQuestion: (sectionId: string, type: QuestionType, overlay: QuestionOverlay) => void;

  // 선택지
  addOption: (sectionId: string, questionId: string) => void;
  updateOption: (
    sectionId: string,
    questionId: string,
    optionId: string,
    patch: Partial<QuestionOption>,
  ) => void;
  removeOption: (sectionId: string, questionId: string, optionId: string) => void;
  reorderOptions: (
    sectionId: string,
    questionId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;

  // 선택
  select: (sel: Selection | null) => void;
  /** Ctrl+클릭: 선택 목록에서 해당 문항을 토글(기존 선택 유지) */
  toggleSelect: (sectionId: string, questionId: string) => void;
  /** 드래그 영역 선택: 문항 id 목록으로 선택을 교체 */
  setSelection: (sectionId: string, questionIds: string[]) => void;
  /** 선택된 문항들에 글자 크기(px)를 일괄 적용 */
  setFontSizeForSelected: (fontSize: number) => void;
  /** 빈 캔버스 페이지 추가(여러 페이지 문진) */
  addBlankPage: () => void;
  /** 선택된 오버레이 필드를 다른 페이지로 이동(위치·크기는 유지) */
  moveSelectedToPage: (pageIndex: number) => void;
  /**
   * 다중 선택한 필드를 마지막 선택(기준)에 맞춰 정렬/크기 통일.
   * left/right/top/bottom/centerX/centerY = 정렬, matchW/matchH/matchSize = 크기 맞춤
   */
  alignSelected: (
    mode: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY' | 'matchW' | 'matchH' | 'matchSize',
  ) => void;

  // 복사/붙여넣기
  _clipboard: Question[];
  /** 선택된 문항을 클립보드로 복사(Ctrl+C) */
  copySelected: () => void;
  /** 클립보드 내용을 붙여넣기(Ctrl+V) — 살짝 옮겨 배치하고 선택 */
  paste: () => void;
}

// undo/redo 로 form 을 되돌리는 동안엔 이력 기록을 건너뛴다.
let timeTraveling = false;

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** form 을 불변 업데이트하는 헬퍼 */
function mapSections(form: FormSchema, fn: (sections: Section[]) => Section[]): FormSchema {
  return { ...form, sections: fn(form.sections), updatedAt: new Date().toISOString() };
}

function mapSection(
  sections: Section[],
  sectionId: string,
  fn: (s: Section) => Section,
): Section[] {
  return sections.map((s) => (s.id === sectionId ? fn(s) : s));
}

function mapQuestion(
  questions: Question[],
  questionId: string,
  fn: (q: Question) => Question,
): Question[] {
  return questions.map((q) => (q.id === questionId ? fn(q) : q));
}

/**
 * 모든 섹션을 통틀어 특정 문항을 찾아 변환한다.
 * 문항 id 는 폼 전체에서 유일하므로, 섹션을 이동한 뒤에도(섹션 id 무관) 안전하게 동작.
 */
function mapQuestionEverywhere(
  form: FormSchema,
  questionId: string,
  fn: (q: Question) => Question,
): FormSchema {
  return {
    ...form,
    sections: form.sections.map((s) => ({
      ...s,
      questions: mapQuestion(s.questions, questionId, fn),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export const useEditorStore = create<EditorState>((set) => ({
  form: null,
  selected: null,
  selectedIds: [],
  dirty: false,
  _past: [],
  _future: [],
  _clipboard: [],

  undo: () =>
    set((st) => {
      if (st._past.length === 0 || !st.form) return st;
      const prev = st._past[st._past.length - 1];
      timeTraveling = true;
      queueMicrotask(() => {
        timeTraveling = false;
      });
      return {
        form: prev,
        _past: st._past.slice(0, -1),
        _future: [st.form, ...st._future].slice(0, HISTORY_LIMIT),
        selected: null,
        selectedIds: [],
        dirty: true,
      };
    }),

  redo: () =>
    set((st) => {
      if (st._future.length === 0 || !st.form) return st;
      const next = st._future[0];
      timeTraveling = true;
      queueMicrotask(() => {
        timeTraveling = false;
      });
      return {
        form: next,
        _past: [...st._past, st.form].slice(-HISTORY_LIMIT),
        _future: st._future.slice(1),
        selected: null,
        selectedIds: [],
        dirty: true,
      };
    }),

  deleteSelected: () =>
    set((st) => {
      if (!st.form || st.selectedIds.length === 0) return st;
      const ids = new Set(st.selectedIds);
      return {
        form: mapSections(st.form, (secs) =>
          secs.map((s) => ({ ...s, questions: s.questions.filter((q) => !ids.has(q.id)) })),
        ),
        selected: null,
        selectedIds: [],
        dirty: true,
      };
    }),

  nudgeSelected: (dir, mode) =>
    set((st) => {
      if (!st.form || st.selectedIds.length === 0) return st;
      const ids = new Set(st.selectedIds);
      const horiz = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const vert = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;

      const transform = (q: Question): Question => {
        if (!ids.has(q.id)) return q;
        if (q.overlay) {
          // PDF 오버레이: % 단위
          const ov = q.overlay;
          if (mode === 'resize') {
            const step = 0.5;
            const MIN = 1.5;
            const wPct = Math.max(MIN, Math.min(100 - ov.xPct, ov.wPct + horiz * step));
            const hPct = Math.max(MIN, Math.min(100 - ov.yPct, ov.hPct + vert * step));
            return { ...q, overlay: { ...ov, wPct, hPct } };
          }
          const step = mode === 'fine' ? 0.1 : 0.5;
          const xPct = Math.min(100 - ov.wPct, Math.max(0, ov.xPct + horiz * step));
          const yPct = Math.min(100 - ov.hPct, Math.max(0, ov.yPct + vert * step));
          return { ...q, overlay: { ...ov, xPct, yPct } };
        }
        // 자유 캔버스: 그리드 칸 단위(정수)
        const layout = q.layout ?? { x: 0, y: 0, w: DEFAULT_QUESTION_W, h: DEFAULT_QUESTION_H };
        if (mode === 'resize') {
          const w = Math.max(1, Math.min(GRID_COLS - layout.x, layout.w + horiz));
          const h = Math.max(1, layout.h + vert);
          return { ...q, layout: { ...layout, w, h } };
        }
        const x = Math.min(GRID_COLS - layout.w, Math.max(0, layout.x + horiz));
        const y = Math.max(0, layout.y + vert);
        return { ...q, layout: { ...layout, x, y } };
      };

      return {
        form: mapSections(st.form, (secs) =>
          secs.map((s) => ({ ...s, questions: s.questions.map(transform) })),
        ),
        dirty: true,
      };
    }),

  loadForm: (form) =>
    set({ form, selected: null, selectedIds: [], dirty: false, _past: [], _future: [] }),
  newForm: () =>
    set({
      form: createBlankCanvasForm(),
      selected: null,
      selectedIds: [],
      dirty: false,
      _past: [],
      _future: [],
    }),
  reset: () =>
    set({ form: null, selected: null, selectedIds: [], dirty: false, _past: [], _future: [] }),

  updateMeta: (patch) =>
    set((st) => (st.form ? { form: { ...st.form, ...patch }, dirty: true } : st)),

  addSection: () =>
    set((st) => {
      if (!st.form) return st;
      const section = createSection(`섹션 ${st.form.sections.length + 1}`);
      return {
        form: mapSections(st.form, (secs) => [...secs, section]),
        dirty: true,
      };
    }),

  updateSection: (sectionId, patch) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({ ...s, ...patch })),
        ),
        dirty: true,
      };
    }),

  removeSection: (sectionId) =>
    set((st) => {
      if (!st.form) return st;
      const sections = st.form.sections.filter((s) => s.id !== sectionId);
      return {
        form: mapSections(st.form, () => sections),
        selected: st.selected?.sectionId === sectionId ? null : st.selected,
        dirty: true,
      };
    }),

  reorderSections: (fromIndex, toIndex) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) => moveItem(secs, fromIndex, toIndex)),
        dirty: true,
      };
    }),

  groupSelectedIntoSection: (title) =>
    set((st) => {
      if (!st.form || st.selectedIds.length === 0) return st;
      const ids = new Set(st.selectedIds);
      // 선택 문항을 원래 순서(섹션 → 배열 순서)대로 모아 새 섹션에 넣는다.
      const moved: Question[] = [];
      const remaining = st.form.sections.map((s) => {
        const keep: Question[] = [];
        for (const q of s.questions) (ids.has(q.id) ? moved : keep).push(q);
        return { ...s, questions: keep };
      });
      if (moved.length === 0) return st;
      const section = createSection(title || `섹션 ${st.form.sections.length + 1}`);
      section.questions = moved;
      // 빈 섹션은 정리하되 최소 한 개는 남긴다.
      const cleaned = remaining.filter((s) => s.questions.length > 0);
      const nextSections = [...(cleaned.length ? cleaned : [remaining[0]]), section];
      return {
        form: { ...st.form, sections: nextSections, updatedAt: new Date().toISOString() },
        selected: { sectionId: section.id, questionId: st.selectedIds[st.selectedIds.length - 1] },
        dirty: true,
      };
    }),

  assignSelectedToSection: (sectionId) =>
    set((st) => {
      if (!st.form || st.selectedIds.length === 0) return st;
      if (!st.form.sections.some((s) => s.id === sectionId)) return st;
      const ids = new Set(st.selectedIds);
      const moved: Question[] = [];
      const stripped = st.form.sections.map((s) => {
        const keep: Question[] = [];
        for (const q of s.questions) {
          if (ids.has(q.id) && s.id !== sectionId) moved.push(q);
          else keep.push(q);
        }
        return { ...s, questions: keep };
      });
      const nextSections = stripped
        .map((s) => (s.id === sectionId ? { ...s, questions: [...s.questions, ...moved] } : s))
        .filter((s, i) => s.questions.length > 0 || i === 0);
      return {
        form: { ...st.form, sections: nextSections, updatedAt: new Date().toISOString() },
        selected: { sectionId, questionId: st.selectedIds[st.selectedIds.length - 1] },
        dirty: true,
      };
    }),

  ungroupSection: (sectionId) =>
    set((st) => {
      if (!st.form || st.form.sections.length <= 1) return st;
      const idx = st.form.sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return st;
      const target = st.form.sections[idx];
      // 첫 섹션(제거 대상이면 두 번째)으로 합친다.
      const mergeInto = idx === 0 ? st.form.sections[1] : st.form.sections[0];
      const nextSections = st.form.sections
        .filter((s) => s.id !== sectionId)
        .map((s) =>
          s.id === mergeInto.id ? { ...s, questions: [...s.questions, ...target.questions] } : s,
        );
      return {
        form: { ...st.form, sections: nextSections, updatedAt: new Date().toISOString() },
        dirty: true,
      };
    }),

  addQuestion: (sectionId, type = 'text') =>
    set((st) => {
      if (!st.form) return st;
      let newQuestionId = '';
      const form = mapSections(st.form, (secs) =>
        mapSection(secs, sectionId, (s) => {
          const question = createQuestion(type);
          question.layout = createDefaultLayout(s.questions, type, question.options?.length ?? 0);
          newQuestionId = question.id;
          return { ...s, questions: [...s.questions, question] };
        }),
      );
      return {
        form,
        selected: { sectionId, questionId: newQuestionId },
        selectedIds: [newQuestionId],
        dirty: true,
      };
    }),

  // 섹션 이동을 지원하므로 문항 조작은 섹션 id 에 의존하지 않고 폼 전체에서 찾는다.
  updateQuestion: (_sectionId, questionId, patch) =>
    set((st) =>
      st.form
        ? {
            form: mapQuestionEverywhere(st.form, questionId, (q) => ({ ...q, ...patch })),
            dirty: true,
          }
        : st,
    ),

  changeQuestionType: (_sectionId, questionId, type) =>
    set((st) =>
      st.form
        ? {
            form: mapQuestionEverywhere(st.form, questionId, (q) => coerceQuestionForType(q, type)),
            dirty: true,
          }
        : st,
    ),

  removeQuestion: (_sectionId, questionId) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          secs.map((s) => ({ ...s, questions: s.questions.filter((q) => q.id !== questionId) })),
        ),
        selected: st.selected?.questionId === questionId ? null : st.selected,
        selectedIds: st.selectedIds.filter((id) => id !== questionId),
        dirty: true,
      };
    }),

  duplicateQuestion: (_sectionId, questionId) =>
    set((st) => {
      if (!st.form) return st;
      let newId = '';
      let ownerSectionId = '';
      const form = mapSections(st.form, (secs) =>
        secs.map((s) => {
          const idx = s.questions.findIndex((q) => q.id === questionId);
          if (idx < 0) return s;
          ownerSectionId = s.id;
          const src = s.questions[idx];
          const copy = createQuestion(src.type);
          const cloned: Question = {
            ...src,
            id: copy.id,
            label: `${src.label} (복사)`,
            options: src.options?.map((o) => ({ ...o, id: createOption(o.label).id })),
            layout: createDuplicateLayout(src, s.questions),
          };
          newId = cloned.id;
          const questions = s.questions.slice();
          questions.splice(idx + 1, 0, cloned);
          return { ...s, questions };
        }),
      );
      return {
        form,
        selected: newId ? { sectionId: ownerSectionId, questionId: newId } : st.selected,
        selectedIds: newId ? [newId] : st.selectedIds,
        dirty: true,
      };
    }),

  updateQuestionLayout: (_sectionId, questionId, layout) =>
    set((st) =>
      st.form
        ? { form: mapQuestionEverywhere(st.form, questionId, (q) => ({ ...q, layout })), dirty: true }
        : st,
    ),

  updateQuestionOverlay: (_sectionId, questionId, overlay) =>
    set((st) =>
      st.form
        ? { form: mapQuestionEverywhere(st.form, questionId, (q) => ({ ...q, overlay })), dirty: true }
        : st,
    ),

  addOverlayQuestion: (sectionId, type, overlay) =>
    set((st) => {
      if (!st.form) return st;
      let newId = '';
      const form = mapSections(st.form, (secs) =>
        mapSection(secs, sectionId, (s) => {
          const q = createQuestion(type);
          q.overlay = overlay;
          delete q.layout;
          newId = q.id;
          return { ...s, questions: [...s.questions, q] };
        }),
      );
      return {
        form,
        selected: newId ? { sectionId, questionId: newId } : st.selected,
        selectedIds: newId ? [newId] : st.selectedIds,
        dirty: true,
      };
    }),

  addOption: (_sectionId, questionId) =>
    set((st) =>
      st.form
        ? {
            form: mapQuestionEverywhere(st.form, questionId, (q) => ({
              ...q,
              options: [...(q.options ?? []), createOption(`선택지 ${(q.options?.length ?? 0) + 1}`)],
            })),
            dirty: true,
          }
        : st,
    ),

  updateOption: (_sectionId, questionId, optionId, patch) =>
    set((st) =>
      st.form
        ? {
            form: mapQuestionEverywhere(st.form, questionId, (q) => ({
              ...q,
              options: q.options?.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
            })),
            dirty: true,
          }
        : st,
    ),

  removeOption: (_sectionId, questionId, optionId) =>
    set((st) =>
      st.form
        ? {
            form: mapQuestionEverywhere(st.form, questionId, (q) => ({
              ...q,
              options: q.options?.filter((o) => o.id !== optionId),
            })),
            dirty: true,
          }
        : st,
    ),

  reorderOptions: (_sectionId, questionId, fromIndex, toIndex) =>
    set((st) =>
      st.form
        ? {
            form: mapQuestionEverywhere(st.form, questionId, (q) => ({
              ...q,
              options: q.options ? moveItem(q.options, fromIndex, toIndex) : q.options,
            })),
            dirty: true,
          }
        : st,
    ),

  select: (sel) => set({ selected: sel, selectedIds: sel ? [sel.questionId] : [] }),

  toggleSelect: (sectionId, questionId) =>
    set((st) => {
      const has = st.selectedIds.includes(questionId);
      const selectedIds = has
        ? st.selectedIds.filter((id) => id !== questionId)
        : [...st.selectedIds, questionId];
      const selected: Selection | null = selectedIds.length
        ? has && st.selected?.questionId === questionId
          ? { sectionId, questionId: selectedIds[selectedIds.length - 1] }
          : { sectionId, questionId }
        : null;
      return { selectedIds, selected };
    }),

  setSelection: (sectionId, questionIds) =>
    set(() => ({
      selectedIds: questionIds,
      selected: questionIds.length
        ? { sectionId, questionId: questionIds[questionIds.length - 1] }
        : null,
    })),

  setFontSizeForSelected: (fontSize) =>
    set((st) => {
      if (!st.form || st.selectedIds.length === 0) return st;
      const ids = new Set(st.selectedIds);
      const clamped = Math.max(6, Math.min(72, Math.round(fontSize)));
      return {
        form: mapSections(st.form, (secs) =>
          secs.map((s) => ({
            ...s,
            questions: s.questions.map((q) => (ids.has(q.id) ? { ...q, fontSize: clamped } : q)),
          })),
        ),
        dirty: true,
      };
    }),

  alignSelected: (mode) =>
    set((st) => {
      if (!st.form || !st.selected || st.selectedIds.length < 2) return st;
      const ids = new Set(st.selectedIds);
      // 기준 = 마지막 선택(primary)
      let ref: QuestionOverlay | undefined;
      for (const s of st.form.sections)
        for (const q of s.questions)
          if (q.id === st.selected.questionId && q.overlay) ref = q.overlay;
      if (!ref) return st;
      const R = ref;

      const transform = (q: Question): Question => {
        if (!ids.has(q.id) || !q.overlay) return q;
        let { xPct, yPct, wPct, hPct } = q.overlay;
        switch (mode) {
          case 'left':
            xPct = R.xPct;
            break;
          case 'right':
            xPct = R.xPct + R.wPct - wPct;
            break;
          case 'centerX':
            xPct = R.xPct + R.wPct / 2 - wPct / 2;
            break;
          case 'top':
            yPct = R.yPct;
            break;
          case 'bottom':
            yPct = R.yPct + R.hPct - hPct;
            break;
          case 'centerY':
            yPct = R.yPct + R.hPct / 2 - hPct / 2;
            break;
          case 'matchW':
            wPct = R.wPct;
            break;
          case 'matchH':
            hPct = R.hPct;
            break;
          case 'matchSize':
            wPct = R.wPct;
            hPct = R.hPct;
            break;
        }
        // 경계 보정
        wPct = Math.max(1, Math.min(100, wPct));
        hPct = Math.max(1, Math.min(100, hPct));
        xPct = Math.max(0, Math.min(100 - wPct, xPct));
        yPct = Math.max(0, Math.min(100 - hPct, yPct));
        return { ...q, overlay: { ...q.overlay, xPct, yPct, wPct, hPct } };
      };

      return {
        form: mapSections(st.form, (secs) =>
          secs.map((s) => ({ ...s, questions: s.questions.map(transform) })),
        ),
        dirty: true,
      };
    }),

  addBlankPage: () =>
    set((st) => {
      if (!st.form) return st;
      const page: FormPage = {
        image: blankPageDataUrl(BLANK_PAGE_W, BLANK_PAGE_H),
        width: BLANK_PAGE_W,
        height: BLANK_PAGE_H,
      };
      return {
        form: { ...st.form, pages: [...(st.form.pages ?? []), page], updatedAt: new Date().toISOString() },
        dirty: true,
      };
    }),

  moveSelectedToPage: (pageIndex) =>
    set((st) => {
      if (!st.form || st.selectedIds.length === 0) return st;
      const pages = st.form.pages ?? [];
      if (pageIndex < 0 || pageIndex >= pages.length) return st;
      const ids = new Set(st.selectedIds);
      return {
        form: mapSections(st.form, (secs) =>
          secs.map((s) => ({
            ...s,
            questions: s.questions.map((q) =>
              ids.has(q.id) && q.overlay
                ? { ...q, overlay: { ...q.overlay, page: pageIndex } }
                : q,
            ),
          })),
        ),
        dirty: true,
      };
    }),

  copySelected: () =>
    set((st) => {
      if (!st.form || st.selectedIds.length === 0) return st;
      const ids = new Set(st.selectedIds);
      const items: Question[] = [];
      for (const s of st.form.sections)
        for (const q of s.questions)
          if (ids.has(q.id)) items.push(JSON.parse(JSON.stringify(q)) as Question);
      return { _clipboard: items };
    }),

  paste: () =>
    set((st) => {
      if (!st.form || st._clipboard.length === 0) return st;
      const targetSectionId = st.selected?.sectionId ?? st.form.sections[0]?.id;
      if (!targetSectionId) return st;
      const newIds: string[] = [];
      const clones = st._clipboard.map((src) => {
        const fresh = createQuestion(src.type);
        const cloned: Question = {
          ...(JSON.parse(JSON.stringify(src)) as Question),
          id: fresh.id,
          options: src.options?.map((o) => ({ ...o, id: createOption(o.label).id })),
        };
        // 살짝 옮겨 원본과 겹치지 않게
        if (cloned.overlay) {
          cloned.overlay = {
            ...cloned.overlay,
            xPct: Math.min(100 - cloned.overlay.wPct, cloned.overlay.xPct + 2),
            yPct: Math.min(100 - cloned.overlay.hPct, cloned.overlay.yPct + 2),
          };
        } else if (cloned.layout) {
          cloned.layout = {
            ...cloned.layout,
            x: Math.min(GRID_COLS - cloned.layout.w, cloned.layout.x + 1),
            y: cloned.layout.y + 1,
          };
        }
        newIds.push(cloned.id);
        return cloned;
      });
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, targetSectionId, (s) => ({
            ...s,
            questions: [...s.questions, ...clones],
          })),
        ),
        selected: { sectionId: targetSectionId, questionId: newIds[newIds.length - 1] },
        selectedIds: newIds,
        dirty: true,
      };
    }),
}));

// form 이 바뀔 때마다 직전 스냅샷을 이력에 기록(undo/redo 중이면 건너뜀).
useEditorStore.subscribe((state, prev) => {
  if (timeTraveling) return;
  if (state.form !== prev.form && prev.form) {
    const past = [...useEditorStore.getState()._past, prev.form].slice(-HISTORY_LIMIT);
    // form 은 그대로이므로 이 setState 는 다시 이력을 기록하지 않는다.
    useEditorStore.setState({ _past: past, _future: [] });
  }
});

// 문진 에디터 상태관리 (§4.3) — 편집 중인 스키마 + 편집 오퍼레이션
import { create } from 'zustand';
import {
  FormSchema,
  Question,
  QuestionOption,
  QuestionType,
  Section,
} from '@/types/schema';
import {
  coerceQuestionForType,
  createOption,
  createQuestion,
  createSection,
  createEmptyForm,
} from '@/utils/schemaFactory';

interface Selection {
  sectionId: string;
  questionId: string;
}

interface EditorState {
  form: FormSchema | null;
  selected: Selection | null;
  dirty: boolean;

  // 초기화
  loadForm: (form: FormSchema) => void;
  newForm: () => void;
  reset: () => void;

  // 폼 메타
  updateMeta: (patch: Partial<Pick<FormSchema, 'title' | 'description'>>) => void;

  // 섹션
  addSection: () => void;
  updateSection: (sectionId: string, patch: Partial<Pick<Section, 'title'>>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;

  // 문항
  addQuestion: (sectionId: string, type?: QuestionType) => void;
  updateQuestion: (sectionId: string, questionId: string, patch: Partial<Question>) => void;
  changeQuestionType: (sectionId: string, questionId: string, type: QuestionType) => void;
  removeQuestion: (sectionId: string, questionId: string) => void;
  duplicateQuestion: (sectionId: string, questionId: string) => void;
  reorderQuestions: (sectionId: string, fromIndex: number, toIndex: number) => void;

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
}

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

export const useEditorStore = create<EditorState>((set) => ({
  form: null,
  selected: null,
  dirty: false,

  loadForm: (form) => set({ form, selected: null, dirty: false }),
  newForm: () => set({ form: createEmptyForm(), selected: null, dirty: false }),
  reset: () => set({ form: null, selected: null, dirty: false }),

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

  addQuestion: (sectionId, type = 'text') =>
    set((st) => {
      if (!st.form) return st;
      const question = createQuestion(type);
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: [...s.questions, question],
          })),
        ),
        selected: { sectionId, questionId: question.id },
        dirty: true,
      };
    }),

  updateQuestion: (sectionId, questionId, patch) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: mapQuestion(s.questions, questionId, (q) => ({ ...q, ...patch })),
          })),
        ),
        dirty: true,
      };
    }),

  changeQuestionType: (sectionId, questionId, type) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: mapQuestion(s.questions, questionId, (q) =>
              coerceQuestionForType(q, type),
            ),
          })),
        ),
        dirty: true,
      };
    }),

  removeQuestion: (sectionId, questionId) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: s.questions.filter((q) => q.id !== questionId),
          })),
        ),
        selected: st.selected?.questionId === questionId ? null : st.selected,
        dirty: true,
      };
    }),

  duplicateQuestion: (sectionId, questionId) =>
    set((st) => {
      if (!st.form) return st;
      let newId = '';
      const form = mapSections(st.form, (secs) =>
        mapSection(secs, sectionId, (s) => {
          const idx = s.questions.findIndex((q) => q.id === questionId);
          if (idx < 0) return s;
          const src = s.questions[idx];
          const copy = createQuestion(src.type);
          const cloned: Question = {
            ...src,
            id: copy.id,
            label: `${src.label} (복사)`,
            options: src.options?.map((o) => ({ ...o, id: createOption(o.label).id })),
          };
          newId = cloned.id;
          const questions = s.questions.slice();
          questions.splice(idx + 1, 0, cloned);
          return { ...s, questions };
        }),
      );
      return {
        form,
        selected: newId ? { sectionId, questionId: newId } : st.selected,
        dirty: true,
      };
    }),

  reorderQuestions: (sectionId, fromIndex, toIndex) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: moveItem(s.questions, fromIndex, toIndex),
          })),
        ),
        dirty: true,
      };
    }),

  addOption: (sectionId, questionId) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: mapQuestion(s.questions, questionId, (q) => ({
              ...q,
              options: [...(q.options ?? []), createOption(`선택지 ${(q.options?.length ?? 0) + 1}`)],
            })),
          })),
        ),
        dirty: true,
      };
    }),

  updateOption: (sectionId, questionId, optionId, patch) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: mapQuestion(s.questions, questionId, (q) => ({
              ...q,
              options: q.options?.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
            })),
          })),
        ),
        dirty: true,
      };
    }),

  removeOption: (sectionId, questionId, optionId) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: mapQuestion(s.questions, questionId, (q) => ({
              ...q,
              options: q.options?.filter((o) => o.id !== optionId),
            })),
          })),
        ),
        dirty: true,
      };
    }),

  reorderOptions: (sectionId, questionId, fromIndex, toIndex) =>
    set((st) => {
      if (!st.form) return st;
      return {
        form: mapSections(st.form, (secs) =>
          mapSection(secs, sectionId, (s) => ({
            ...s,
            questions: mapQuestion(s.questions, questionId, (q) => ({
              ...q,
              options: q.options ? moveItem(q.options, fromIndex, toIndex) : q.options,
            })),
          })),
        ),
        dirty: true,
      };
    }),

  select: (sel) => set({ selected: sel }),
}));

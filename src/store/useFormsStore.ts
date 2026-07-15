// 문진 목록/발행/응답 저장 (QNR001/QNR005) — localStorage 영속화 (백엔드 연동 전)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FormSchema, FormResponse } from '@/types/schema';

interface FormsState {
  forms: FormSchema[];
  responses: FormResponse[];

  /** 에디터에서 저장(신규/수정) */
  saveForm: (form: FormSchema) => void;
  deleteForm: (formId: string) => void;
  getForm: (formId: string) => FormSchema | undefined;

  /** 발행: status=published, version 증가 */
  publishForm: (formId: string) => void;

  /** 응답 제출 */
  addResponse: (response: FormResponse) => void;
  responsesByForm: (formId: string) => FormResponse[];
}

export const useFormsStore = create<FormsState>()(
  persist(
    (set, get) => ({
      forms: [],
      responses: [],

      saveForm: (form) =>
        set((st) => {
          const exists = st.forms.some((f) => f.id === form.id);
          const stamped = { ...form, updatedAt: new Date().toISOString() };
          return {
            forms: exists
              ? st.forms.map((f) => (f.id === form.id ? stamped : f))
              : [stamped, ...st.forms],
          };
        }),

      deleteForm: (formId) =>
        set((st) => ({ forms: st.forms.filter((f) => f.id !== formId) })),

      getForm: (formId) => get().forms.find((f) => f.id === formId),

      publishForm: (formId) =>
        set((st) => ({
          forms: st.forms.map((f) =>
            f.id === formId
              ? {
                  ...f,
                  status: 'published' as const,
                  updatedAt: new Date().toISOString(),
                }
              : f,
          ),
        })),

      addResponse: (response) =>
        set((st) => ({ responses: [response, ...st.responses] })),

      responsesByForm: (formId) => get().responses.filter((r) => r.formId === formId),
    }),
    { name: 'smartqnr-forms' },
  ),
);

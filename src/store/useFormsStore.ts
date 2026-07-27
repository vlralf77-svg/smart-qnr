// 문진 목록/발행/응답 저장 (QNR001/QNR005)
//  - 백엔드 연동 시(isBackendEnabled): REST API 로 저장·조회(중앙 DB).
//  - 오프라인(데스크톱): localStorage 로 영속화.
// getForm/responsesByForm 은 캐시(state)에서 동기 반환하므로, 백엔드 모드에서는
// 화면 진입 시 refreshForms()/fetchForm() 으로 캐시를 채운다.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FormSchema, FormResponse } from '@/types/schema';
import { api, isBackendEnabled } from '@/api/client';

interface FormsState {
  forms: FormSchema[];
  responses: FormResponse[];
  loading: boolean;

  /** 백엔드에서 목록을 다시 불러와 캐시 갱신 */
  refreshForms: () => Promise<void>;
  /** 단건을 불러와 캐시에 병합(딥링크 진입용) */
  fetchForm: (formId: string) => Promise<FormSchema | undefined>;

  saveForm: (form: FormSchema) => Promise<void>;
  deleteForm: (formId: string) => Promise<void>;
  getForm: (formId: string) => FormSchema | undefined;
  publishForm: (formId: string) => Promise<void>;

  addResponse: (response: FormResponse) => Promise<void>;
  responsesByForm: (formId: string) => FormResponse[];
}

function upsert(forms: FormSchema[], form: FormSchema): FormSchema[] {
  return forms.some((f) => f.id === form.id)
    ? forms.map((f) => (f.id === form.id ? form : f))
    : [form, ...forms];
}

export const useFormsStore = create<FormsState>()(
  persist(
    (set, get) => ({
      forms: [],
      responses: [],
      loading: false,

      refreshForms: async () => {
        if (!isBackendEnabled) return;
        set({ loading: true });
        try {
          const forms = await api.listForms();
          set({ forms, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      fetchForm: async (formId) => {
        if (!isBackendEnabled) return get().forms.find((f) => f.id === formId);
        try {
          const form = await api.getForm(formId);
          set((st) => ({ forms: upsert(st.forms, form) }));
          return form;
        } catch {
          return get().forms.find((f) => f.id === formId);
        }
      },

      saveForm: async (form) => {
        if (isBackendEnabled) {
          const saved = await api.saveForm(form);
          set((st) => ({ forms: upsert(st.forms, saved) }));
          return;
        }
        const now = new Date().toISOString();
        // 최초등록일(createdAt)은 첫 저장 때 기록하고 이후 유지
        const stamped = { ...form, createdAt: form.createdAt ?? now, updatedAt: now };
        set((st) => ({ forms: upsert(st.forms, stamped) }));
      },

      deleteForm: async (formId) => {
        if (isBackendEnabled) {
          await api.deleteForm(formId);
        }
        set((st) => ({ forms: st.forms.filter((f) => f.id !== formId) }));
      },

      getForm: (formId) => get().forms.find((f) => f.id === formId),

      publishForm: async (formId) => {
        if (isBackendEnabled) {
          const saved = await api.publishForm(formId);
          set((st) => ({ forms: upsert(st.forms, saved) }));
          return;
        }
        set((st) => ({
          forms: st.forms.map((f) =>
            f.id === formId
              ? { ...f, status: 'published' as const, updatedAt: new Date().toISOString() }
              : f,
          ),
        }));
      },

      addResponse: async (response) => {
        if (isBackendEnabled) {
          const saved = await api.submitResponse(response);
          set((st) => ({ responses: [saved, ...st.responses] }));
          return;
        }
        set((st) => ({ responses: [response, ...st.responses] }));
      },

      responsesByForm: (formId) => get().responses.filter((r) => r.formId === formId),
    }),
    { name: 'smartqnr-forms' },
  ),
);

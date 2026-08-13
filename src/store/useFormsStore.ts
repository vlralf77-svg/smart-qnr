// 문진 목록/발행/응답 저장 (QNR001/QNR005)
//  - 백엔드 연동 시(isBackendEnabled): REST API 로 저장·조회(중앙 DB).
//  - 오프라인(데스크톱): localStorage 로 영속화.
// getForm/responsesByForm 은 캐시(state)에서 동기 반환하므로, 백엔드 모드에서는
// 화면 진입 시 refreshForms()/fetchForm() 으로 캐시를 채운다.
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { FormSchema, FormResponse, FormRevision } from '@/types/schema';
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
  /**
   * 문진 확정(버전 확정). 편집 내용을 저장하면서 확정한다.
   * 이미 확정(published)된 문진을 다시 확정하면 직전 확정본을 이력에 보관하고 버전을 +1 한다.
   * (첫 확정은 v1 유지, 이력 없음)
   */
  confirmForm: (form: FormSchema) => Promise<FormSchema>;

  addResponse: (response: FormResponse) => Promise<void>;
  responsesByForm: (formId: string) => FormResponse[];
}

function upsert(forms: FormSchema[], form: FormSchema): FormSchema[] {
  return forms.some((f) => f.id === form.id)
    ? forms.map((f) => (f.id === form.id ? form : f))
    : [form, ...forms];
}

export const useFormsStore = create<FormsState>()(
  devtools(
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

        confirmForm: async (form) => {
          const prev = get().forms.find((f) => f.id === form.id);
          const now = new Date().toISOString();
          let version = form.version ?? 1;
          // 이력은 항상 저장본 기준으로 이어간다(중첩 방지 위해 스냅샷에는 history 제외)
          let history: FormRevision[] = prev?.history ?? form.history ?? [];
          // 이미 확정본이 있는데 다시 확정 → 직전 확정본을 이력에 보관하고 버전 +1
          if (prev && prev.status === 'published') {
            const snapshot: FormSchema = { ...prev };
            delete snapshot.history;
            history = [
              { version: prev.version, confirmedAt: prev.updatedAt ?? now, form: snapshot },
              ...history,
            ];
            version = prev.version + 1;
          }
          const next: FormSchema = {
            ...form,
            version,
            status: 'published',
            history,
            createdAt: form.createdAt ?? prev?.createdAt ?? now,
            updatedAt: now,
          };
          if (isBackendEnabled) {
            // 백엔드가 이력·버전을 자체 관리하지 않을 수 있으므로 우리가 계산한 값을 신뢰
            const saved = await api.saveForm(next);
            const merged: FormSchema = {
              ...saved,
              version: next.version,
              status: 'published',
              history: next.history,
            };
            try {
              await api.publishForm(next.id);
            } catch {
              /* 상태는 merged 로 보장 */
            }
            set((st) => ({ forms: upsert(st.forms, merged) }));
            return merged;
          }
          set((st) => ({ forms: upsert(st.forms, next) }));
          return next;
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
      {
        // 저장 키를 모드별로 분리한다.
        //  백엔드 모드에서는 서버 목록을 그대로 상태에 넣는데, 키가 같으면 그 결과가
        //  오프라인(로컬) 문진을 덮어써 데이터가 사라진다. 키를 나눠 서로 영향을 주지 않게 함.
        name: isBackendEnabled ? 'smartqnr-forms-api' : 'smartqnr-forms',
      },
    ),
    { name: 'forms' },
  ),
);

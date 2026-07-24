// EMR/외부 API 연동 설정 — 엔드포인트(URL·헤더)와 응답 컬럼 매핑을 저장.
//  관리 화면에서 API를 등록하고, 응답의 어떤 필드를 앱의 어떤 값으로 쓸지 매핑한다.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HeaderPair {
  key: string;
  value: string;
}

export interface FieldMapping {
  /** 앱에서 쓸 필드명(예: formId, title, category) */
  target: string;
  /** 응답 항목에서 값을 가져올 경로(예: FORM_ID, form.id) */
  source: string;
}

export type ApiPurpose = 'patientForms' | 'custom';

export interface ApiEndpoint {
  id: string;
  name: string;
  purpose: ApiPurpose;
  method: 'GET' | 'POST';
  url: string; // {변수} 치환 가능 — 예: https://emr/{hospital}/api/forms?patientNo={patientNo}
  /** URL/본문의 {변수} 에 채울 고정 변수(이름/값). 실행 시 런타임 값(예: patientNo)이 우선. */
  variables: HeaderPair[];
  headers: HeaderPair[];
  body: string; // POST 본문(템플릿, {변수} 치환)
  rootPath: string; // 응답에서 배열 위치(예: data.list). 비우면 최상위가 배열
  mappings: FieldMapping[];
  enabled: boolean;
}

interface ApiConfigState {
  endpoints: ApiEndpoint[];
  addEndpoint: (purpose?: ApiPurpose) => string;
  updateEndpoint: (id: string, patch: Partial<ApiEndpoint>) => void;
  removeEndpoint: (id: string) => void;
}

const uid = () => `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const PURPOSE_LABELS: Record<ApiPurpose, string> = {
  patientForms: '환자 문진 대상 목록',
  custom: '기타(직접 정의)',
};

/** 용도별 앱 필드 목록(매핑 대상) — 화면에서 기본으로 골라 쓸 수 있게 제공 */
export const APP_FIELDS: Record<ApiPurpose, { key: string; label: string }[]> = {
  patientForms: [
    { key: 'formId', label: '문진 ID' },
    { key: 'title', label: '문진 이름' },
    { key: 'category', label: '분류' },
    { key: 'status', label: '상태' },
  ],
  custom: [],
};

function defaultMappings(purpose: ApiPurpose): FieldMapping[] {
  const fields = APP_FIELDS[purpose];
  return fields.length
    ? fields.map((f) => ({ target: f.key, source: '' }))
    : [{ target: '', source: '' }];
}

export const useApiConfigStore = create<ApiConfigState>()(
  persist(
    (set) => ({
      endpoints: [],
      addEndpoint: (purpose = 'patientForms') => {
        const id = uid();
        const ep: ApiEndpoint = {
          id,
          name: purpose === 'patientForms' ? '환자 문진 대상 조회' : '새 연동',
          purpose,
          method: 'GET',
          url: '',
          variables: [],
          headers: [{ key: 'Content-Type', value: 'application/json' }],
          body: '',
          rootPath: '',
          mappings: defaultMappings(purpose),
          enabled: true,
        };
        set((s) => ({ endpoints: [...s.endpoints, ep] }));
        return id;
      },
      updateEndpoint: (id, patch) =>
        set((s) => ({
          endpoints: s.endpoints.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEndpoint: (id) => set((s) => ({ endpoints: s.endpoints.filter((e) => e.id !== id) })),
    }),
    { name: 'smartqnr-api-config' },
  ),
);

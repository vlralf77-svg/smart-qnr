// EMR/외부 API 연동 설정 — 엔드포인트(URL·헤더)와 응답 컬럼 매핑을 저장.
//  관리 화면에서 API를 등록하고, 응답의 어떤 필드를 앱의 어떤 값으로 쓸지 매핑한다.
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface HeaderPair {
  key: string;
  value: string;
  /** 설명(메모) — 표에서 참고용, 호출에는 쓰이지 않음 */
  desc?: string;
  /** 사용 여부(없으면 사용) — 체크를 해제하면 호출에서 제외된다 */
  on?: boolean;
}

/** 체크가 켜져 있고 이름이 있는 항목만 사용 */
export const activePairs = (pairs: HeaderPair[] = []): HeaderPair[] =>
  pairs.filter((p) => p.on !== false && p.key.trim());

export interface FieldMapping {
  /** 앱에서 쓸 필드명(예: formId, title, category) */
  target: string;
  /** 응답 항목에서 값을 가져올 경로(예: FORM_ID, form.id) */
  source: string;
}

export type ApiPurpose = 'patientLogin' | 'patientForms' | 'custom';

/** 연동 방식 — 같은 연동 대상을 API 호출로 받을지, DB 쿼리로 받을지 */
export type LinkKind = 'api' | 'db';

/** DB 쿼리 연동의 접속·쿼리 설정(연동 항목에 함께 보관) */
export type DbConnMode = 'ezconnect' | 'tns' | 'jdbc';
export interface DbSettings {
  mode: DbConnMode;
  host: string; // ezconnect
  port: string;
  serviceName: string;
  tnsAlias: string; // tns
  tnsAdmin: string;
  jdbcUrl: string; // jdbc
  user: string;
  password: string;
  /** 읽기 전용 조회 쿼리(:변수 로 바인드 파라미터 사용) */
  query: string;
  params: HeaderPair[];
}

export const DEFAULT_DB: DbSettings = {
  mode: 'ezconnect',
  host: '',
  port: '1521',
  serviceName: '',
  tnsAlias: '',
  tnsAdmin: '',
  jdbcUrl: '',
  user: '',
  password: '',
  query:
    'SELECT form_id AS "formId", title AS "title", category AS "category"\nFROM qnr_forms\nWHERE patient_no = :patientNo',
  params: [{ key: 'patientNo', value: '' }],
};

export interface ApiEndpoint {
  id: string;
  name: string;
  purpose: ApiPurpose;
  /** 연동 방식(없으면 api — 기존 저장분 호환) */
  kind?: LinkKind;
  /** kind='db' 일 때 쓰는 접속·쿼리 설정 */
  db?: DbSettings;
  /**
   * 서버 경유로 호출할지 여부(kind='api' 전용).
   *  켜면 브라우저가 직접 부르지 않고 개발 서버/백엔드가 대신 호출한다 — 대상 서버가
   *  CORS 를 허용하지 않을 때 사용. EXE(Electron)는 원래 CORS 제약이 없어 영향 없음.
   */
  viaProxy?: boolean;
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
  addEndpoint: (purpose?: ApiPurpose, kind?: LinkKind) => string;
  updateEndpoint: (id: string, patch: Partial<ApiEndpoint>) => void;
  removeEndpoint: (id: string) => void;
}

const uid = () => `api_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const PURPOSE_LABELS: Record<ApiPurpose, string> = {
  patientLogin: '환자 로그인/인증',
  patientForms: '환자 문진 대상 목록',
  custom: '기타(직접 정의)',
};

/** 용도별 앱 필드 목록(매핑 대상) — 화면에서 기본으로 골라 쓸 수 있게 제공 */
export const APP_FIELDS: Record<ApiPurpose, { key: string; label: string }[]> = {
  patientLogin: [
    { key: 'valid', label: '성공여부(옵션)' },
    { key: 'patientNo', label: '환자 식별번호' },
    { key: 'name', label: '환자 이름' },
    { key: 'visitDate', label: '진료일자(예약일자)' },
    { key: 'department', label: '진료과' },
    { key: 'doctor', label: '진료의사' },
  ],
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
  devtools(
    persist(
      (set) => ({
        endpoints: [],
        addEndpoint: (purpose = 'patientForms', kind = 'api') => {
          const id = uid();
          const ep: ApiEndpoint = {
            id,
            name: purpose === 'custom' ? '새 연동' : PURPOSE_LABELS[purpose],
            purpose,
            kind,
            db: { ...DEFAULT_DB },
            method: 'GET',
            url: '',
            variables: [],
            // 기본 메서드가 GET 이므로 헤더는 비워 둔다. Content-Type 을 기본으로 넣으면
            //  브라우저가 프리플라이트(OPTIONS)를 보내 CORS 로 막히는 서버가 많다.
            headers: [],
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
    { name: 'apiConfig' },
  ),
);

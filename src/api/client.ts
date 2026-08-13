// 백엔드(REST) 연동 클라이언트.
//  - VITE_API_BASE_URL 이 설정되어 있으면 서버 API 를 사용, 없으면 이 모듈은 사용하지 않음.
//  - 토큰은 sessionStorage 에 보관(로그인 세션과 동일 수명).
// 사용 예:
//   const forms = await api.listForms();
//   await api.saveForm(schema);
import { FormResponse, FormSchema } from '@/types/schema';

// 빈 문자열이면 같은 오리진('/api' 상대경로) — nginx 가 백엔드로 프록시.
export const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(
  /\/$/,
  '',
);

/**
 * 백엔드 연동 사용 여부.
 * - VITE_USE_BACKEND=1 이면 API 사용(도커 웹 빌드).
 * - 미설정이면 false → 프론트는 localStorage 로 동작(데스크톱 오프라인).
 */
export const isBackendEnabled =
  import.meta.env.VITE_USE_BACKEND === '1' || import.meta.env.VITE_USE_BACKEND === 'true';

const TOKEN_KEY = 'smartqnr.token';

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(t: string | null) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 무시 */
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isBackendEnabled) throw new Error('백엔드 연동이 비활성화되어 있습니다.');
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `요청 실패(${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export interface LoginResult {
  token: string;
  username: string;
  expiresIn: number;
}

export const api = {
  // 인증
  async login(username: string, password: string): Promise<LoginResult> {
    const r = await request<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(r.token);
    return r;
  },
  logout() {
    setToken(null);
  },

  // 문진
  listForms(): Promise<FormSchema[]> {
    return request<FormSchema[]>('/api/forms');
  },
  listPublishedForms(): Promise<FormSchema[]> {
    return request<FormSchema[]>('/api/forms?published=true');
  },
  getForm(id: string): Promise<FormSchema> {
    return request<FormSchema>(`/api/forms/${encodeURIComponent(id)}`);
  },
  saveForm(form: FormSchema): Promise<FormSchema> {
    return request<FormSchema>('/api/forms', { method: 'POST', body: JSON.stringify(form) });
  },
  publishForm(id: string): Promise<FormSchema> {
    return request<FormSchema>(`/api/forms/${encodeURIComponent(id)}/publish`, { method: 'POST' });
  },
  deleteForm(id: string): Promise<void> {
    return request<void>(`/api/forms/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // 응답
  submitResponse(response: FormResponse): Promise<FormResponse> {
    return request<FormResponse>('/api/responses', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  },
  responsesByForm(formId: string): Promise<FormResponse[]> {
    return request<FormResponse[]>(`/api/forms/${encodeURIComponent(formId)}/responses`);
  },

  // 환자(공개) — 인증 불필요. 테스트 대상(testFlag) 문진만 조회.
  publicListForms(): Promise<FormSchema[]> {
    return request<FormSchema[]>('/api/public/forms');
  },
  publicGetForm(id: string): Promise<FormSchema> {
    return request<FormSchema>(`/api/public/forms/${encodeURIComponent(id)}`);
  },
  publicSubmitResponse(response: FormResponse): Promise<FormResponse> {
    return request<FormResponse>('/api/public/responses', {
      method: 'POST',
      body: JSON.stringify(response),
    });
  },
  publicMyResponses(patientId: string): Promise<FormResponse[]> {
    return request<FormResponse[]>(
      `/api/public/responses?patientId=${encodeURIComponent(patientId)}`,
    );
  },

  // 서버(백단) 로그 — 백엔드에 /api/logs 엔드포인트가 있을 때만 동작
  serverLogs(limit = 200): Promise<ServerLogEntry[]> {
    return request<ServerLogEntry[]>(`/api/logs?limit=${limit}`);
  },

  /** DB 쿼리 연동 테스트 — 서버가 실제 DB 에 접속해 SELECT 를 실행한다 */
  dbLinkTest(body: DbLinkTestRequest): Promise<DbLinkTestResult> {
    return request<DbLinkTestResult>('/api/db-link/test', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

/** 서버로 보내는 DB 연동 테스트 요청(접속 정보 + 쿼리 + 파라미터) */
export interface DbLinkTestRequest {
  mode: string;
  host?: string;
  port?: string;
  serviceName?: string;
  tnsAlias?: string;
  tnsAdmin?: string;
  jdbcUrl?: string;
  user?: string;
  password?: string;
  query: string;
  params: { key: string; value: string }[];
  runtime: Record<string, string>;
  limit?: number;
}

/** 서버 실행 결과 — 프론트 시뮬레이션(SimResult)과 같은 모양 */
export interface DbLinkTestResult {
  columns: string[];
  rows: Record<string, string | number>[];
  matched: number;
  effective: Record<string, string>;
  note: string;
}

export interface ServerLogEntry {
  ts?: string | number;
  level?: string;
  message?: string;
  [k: string]: unknown;
}

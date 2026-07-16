// 백엔드(REST) 연동 클라이언트.
//  - VITE_API_BASE_URL 이 설정되어 있으면 서버 API 를 사용, 없으면 이 모듈은 사용하지 않음.
//  - 토큰은 sessionStorage 에 보관(로그인 세션과 동일 수명).
// 사용 예:
//   const forms = await api.listForms();
//   await api.saveForm(schema);
import { FormResponse, FormSchema } from '@/types/schema';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  '',
);

/** 백엔드 연동 사용 여부 (env 미설정 시 false → 프론트는 localStorage 로 동작) */
export const isBackendEnabled = !!API_BASE;

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
  if (!API_BASE) throw new Error('VITE_API_BASE_URL 이 설정되지 않았습니다.');
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
};

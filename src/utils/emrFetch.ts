// 외부 API 호출 + 응답 매핑 유틸.
//  - Electron: 메인 프로세스로 호출(브라우저 CORS 제약 회피).
//  - 웹: fetch 직접 호출(대상 서버가 CORS 허용해야 함).
import { ApiEndpoint, FieldMapping, HeaderPair } from '@/store/useApiConfigStore';

export interface EmrFetchResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

export interface EmrRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** "{key}" 치환 (URL 인코딩) */
export function fillTemplate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{(\w+)\}/g, (_m, k) =>
    vars[k] != null ? encodeURIComponent(vars[k]) : `{${k}}`,
  );
}

/** 문자열에서 {변수} 토큰 목록 추출 */
export function extractVars(...strings: string[]): string[] {
  const set = new Set<string>();
  for (const s of strings) {
    for (const m of s.matchAll(/\{(\w+)\}/g)) set.add(m[1]);
  }
  return [...set];
}

/** 'a.b.c' 경로로 값 꺼내기 */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<unknown>((o, key) => {
    if (o == null) return undefined;
    const k = key.trim();
    return (o as Record<string, unknown>)[k];
  }, obj);
}

/** 응답 → 매핑된 행 배열 */
export function extractRows(
  data: unknown,
  rootPath: string,
  mappings: FieldMapping[],
): Record<string, unknown>[] {
  const at = getByPath(data, rootPath);
  const list = Array.isArray(at) ? at : Array.isArray(data) ? (data as unknown[]) : [];
  return list.map((item) => {
    const row: Record<string, unknown> = {};
    for (const m of mappings) {
      if (m.target) row[m.target] = getByPath(item, m.source);
    }
    return row;
  });
}

function headersToObject(pairs: HeaderPair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of pairs) if (p.key.trim()) out[p.key.trim()] = p.value;
  return out;
}

/** 엔드포인트 설정 + 변수로 실제 호출 */
export async function callEndpoint(
  ep: ApiEndpoint,
  vars: Record<string, string>,
): Promise<EmrFetchResult> {
  const req: EmrRequest = {
    url: fillTemplate(ep.url, vars),
    method: ep.method,
    headers: headersToObject(ep.headers),
    body: ep.method === 'POST' ? fillTemplate(ep.body, vars) : undefined,
  };

  const bridge = window.smartqnr;
  if (bridge?.emrFetch) {
    return bridge.emrFetch(req);
  }
  // 웹 폴백
  try {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.method === 'POST' ? req.body : undefined,
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* 텍스트 그대로 */
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

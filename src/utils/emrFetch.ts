// 외부 API 호출 + 응답 매핑 유틸.
//  - Electron: 메인 프로세스로 호출(브라우저 CORS 제약 회피).
//  - 웹: fetch 직접 호출(대상 서버가 CORS 허용해야 함).
import { ApiEndpoint, FieldMapping, HeaderPair } from '@/store/useApiConfigStore';
import { pushLog } from '@/store/useLogStore';

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

/** 응답에서 단일 레코드(객체)를 매핑 (로그인/인증 등 목록이 아닌 응답용) */
export function extractRecord(
  data: unknown,
  rootPath: string,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const at = getByPath(data, rootPath);
  let obj: unknown;
  if (at && typeof at === 'object' && !Array.isArray(at)) obj = at;
  else if (Array.isArray(at)) obj = at[0];
  else if (Array.isArray(data)) obj = (data as unknown[])[0];
  else obj = data;
  const row: Record<string, unknown> = {};
  for (const m of mappings) {
    if (m.target) row[m.target] = getByPath(obj, m.source);
  }
  return row;
}

/** 로그인/성공 판단용 truthy 해석 */
export function isTruthy(x: unknown): boolean {
  if (x === true || x === 1) return true;
  if (x == null) return false;
  return ['true', 'y', 'yes', '1', 'ok', 'success', '성공', 't'].includes(
    String(x).trim().toLowerCase(),
  );
}

function headersToObject(pairs: HeaderPair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of pairs) if (p.key.trim()) out[p.key.trim()] = p.value;
  return out;
}

/** HeaderPair[] → { key: value } (빈 키 제외) */
export function pairsToVars(pairs: { key: string; value: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of pairs) if (p.key.trim()) out[p.key.trim()] = p.value;
  return out;
}

/** base URL 에 쿼리 파라미터를 이어붙임(기존 ? / & 상황 고려) */
function appendQuery(base: string, params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([k]) => k);
  if (entries.length === 0) return base;
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
    .join('&');
  if (base.includes('?')) {
    return base + (base.endsWith('?') || base.endsWith('&') ? '' : '&') + qs;
  }
  return base + '?' + qs;
}

/**
 * 최종 URL 생성.
 *  - URL 안의 {변수} 는 값으로 치환하고,
 *  - URL 에 {변수}로 쓰이지 않은 변수는 쿼리 파라미터(key=value)로 이어붙인다.
 */
export function buildUrl(urlTemplate: string, mergedVars: Record<string, string>): string {
  const used = new Set(extractVars(urlTemplate));
  const substituted = fillTemplate(urlTemplate, mergedVars);
  const leftover: Record<string, string> = {};
  for (const [k, v] of Object.entries(mergedVars)) {
    if (!used.has(k) && v !== '' && v != null) leftover[k] = v;
  }
  return appendQuery(substituted, leftover);
}

/** 엔드포인트 설정 + 변수로 실제 호출. 고정 변수(variables) 위에 런타임 vars 를 덮어씀. */
export async function callEndpoint(
  ep: ApiEndpoint,
  vars: Record<string, string>,
): Promise<EmrFetchResult> {
  const merged = { ...pairsToVars(ep.variables ?? []), ...vars };
  const req: EmrRequest = {
    url: buildUrl(ep.url, merged),
    method: ep.method,
    headers: headersToObject(ep.headers),
    body: ep.method === 'POST' ? fillTemplate(ep.body, merged) : undefined,
  };

  const started = Date.now();
  pushLog('api', `→ ${req.method} ${req.url}`, ep.name ? `연동: ${ep.name}` : undefined);
  const finish = (r: EmrFetchResult): EmrFetchResult => {
    const ms = Date.now() - started;
    if (r.ok) pushLog('api', `← ${r.status} ${req.method} ${req.url} (${ms}ms)`);
    else pushLog('error', `← 실패 ${r.status || '-'} ${req.method} ${req.url} (${ms}ms)`, r.error);
    return r;
  };

  const bridge = window.smartqnr;
  if (bridge?.emrFetch) {
    try {
      return finish(await bridge.emrFetch(req));
    } catch (e) {
      return finish({ ok: false, status: 0, error: (e as Error).message });
    }
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
    return finish({ ok: res.ok, status: res.status, data });
  } catch (e) {
    return finish({ ok: false, status: 0, error: (e as Error).message });
  }
}

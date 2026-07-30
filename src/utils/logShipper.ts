// 중앙 로그 전송기 — 화면 로그를 주기적으로 수집 API(POST)로 보낸다.
//  · 사내 백엔드가 useLogConfig.url 을 제공하고 enabled=true 일 때만 동작
//  · 피드백 루프 방지: 여기서는 emrFetch.callEndpoint(로그 남김)를 쓰지 않고 원시 요청 사용, 자체 로그도 남기지 않음
import { LogEntry, SESSION_ID, useLogStore } from '@/store/useLogStore';
import { useLogConfig } from '@/store/useLogConfig';

let started = false;
let lastSentN = 0;
let inFlight = false;

export interface LogPayload {
  ts: string; // ISO8601
  level: string;
  message: string;
  detail?: string;
  sessionId: string;
  userId?: string;
  userName?: string;
  department?: string;
  role?: string;
  appVersion?: string;
  platform?: string;
  route?: string;
}

function toPayload(e: LogEntry): LogPayload {
  const c = e.ctx ?? {};
  return {
    ts: new Date(e.ts).toISOString(),
    level: e.level,
    message: e.message,
    detail: e.detail,
    sessionId: SESSION_ID,
    userId: c.userId,
    userName: c.userName,
    department: c.department,
    role: c.role,
    appVersion: c.appVersion,
    platform: c.platform,
    route: c.route,
  };
}

async function postJson(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const headers = { 'Content-Type': 'application/json' };
  const payload = JSON.stringify(body);
  const bridge = window.smartqnr;
  if (bridge?.emrFetch) {
    try {
      const r = await bridge.emrFetch({ url, method: 'POST', headers, body: payload });
      return { ok: r.ok, status: r.status, error: r.error };
    } catch (e) {
      return { ok: false, status: 0, error: (e as Error).message };
    }
  }
  try {
    const res = await fetch(url, { method: 'POST', headers, body: payload, keepalive: true });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

async function flush() {
  if (inFlight) return;
  const cfg = useLogConfig.getState();
  if (!cfg.enabled || !cfg.url.trim()) return;
  const pending = useLogStore.getState().entries.filter((e) => e.n > lastSentN);
  if (pending.length === 0) return;

  inFlight = true;
  const batch = pending.slice(0, 100); // 한 번에 최대 100건
  const maxN = batch[batch.length - 1].n;
  const r = await postJson(cfg.url.trim(), { logs: batch.map(toPayload) });
  inFlight = false;

  if (r.ok) {
    lastSentN = maxN;
    useLogConfig.getState().setLastSentAt(Date.now());
    if (cfg.lastError) useLogConfig.getState().setLastError('');
  } else {
    useLogConfig.getState().setLastError(`전송 실패(${r.status || '-'}) ${r.error ?? ''}`.trim());
  }
}

/** 앱 시작 시 1회 호출 — 4초마다 미전송 로그를 중앙으로 보냄 */
export function startLogShipper() {
  if (started || typeof window === 'undefined') return;
  started = true;
  setInterval(() => {
    void flush();
  }, 4000);
}

/** 즉시 전송(설정 화면의 '지금 전송' 버튼용) */
export function flushLogsNow() {
  return flush();
}

export interface CentralLogEntry {
  ts?: string | number;
  level?: string;
  message?: string;
  userId?: string;
  userName?: string;
  department?: string;
  [k: string]: unknown;
}

/** 중앙 수집 API에서 로그 조회(GET). 관리자 전체 조회용. */
export async function queryCentralLogs(filters: {
  user?: string;
  level?: string;
  q?: string;
  limit?: number;
}): Promise<{ ok: boolean; status: number; rows?: CentralLogEntry[]; error?: string }> {
  const cfg = useLogConfig.getState();
  const base = cfg.url.trim();
  if (!base) return { ok: false, status: 0, error: '수집 API 주소가 설정되지 않았습니다.' };

  const qs = new URLSearchParams();
  if (filters.user) qs.set('user', filters.user);
  if (filters.level && filters.level !== 'all') qs.set('level', filters.level);
  if (filters.q) qs.set('q', filters.q);
  qs.set('limit', String(filters.limit ?? 300));
  const url = `${base}${base.includes('?') ? '&' : '?'}${qs.toString()}`;

  const parse = (data: unknown): CentralLogEntry[] => {
    if (Array.isArray(data)) return data as CentralLogEntry[];
    if (data && typeof data === 'object' && Array.isArray((data as { logs?: unknown }).logs))
      return (data as { logs: CentralLogEntry[] }).logs;
    return [];
  };

  const bridge = window.smartqnr;
  if (bridge?.emrFetch) {
    try {
      const r = await bridge.emrFetch({ url, method: 'GET', headers: {} });
      return { ok: r.ok, status: r.status, rows: parse(r.data), error: r.error };
    } catch (e) {
      return { ok: false, status: 0, error: (e as Error).message };
    }
  }
  try {
    const res = await fetch(url);
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* 텍스트 */
    }
    return { ok: res.ok, status: res.status, rows: parse(data) };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

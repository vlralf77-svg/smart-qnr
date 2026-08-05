// 화면(프론트) 로그 버퍼 — 콘솔/전역 오류/네트워크(API) 이벤트를 메모리에 모아 로그 뷰어에서 확인.
//  · 최대 MAX_LOGS 개 링버퍼(오래된 것부터 제거)
//  · 각 로그에 사용자 컨텍스트(ctx)를 붙여 중앙 수집(서버 전송)에 대비
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'api';

// 로그를 남긴 주체/환경 — 중앙 수집 시 사용자별 필터에 사용
export interface LogContext {
  userId?: string;
  userName?: string;
  department?: string;
  role?: string;
  appVersion?: string;
  platform?: string; // 'electron' | 'web'
  route?: string; // 현재 화면 해시 경로
}

export interface LogEntry {
  id: string;
  n: number; // 앱 실행 중 단조 증가(전송 진행 추적용)
  ts: number; // epoch ms
  level: LogLevel;
  message: string;
  detail?: string; // 스택/응답 본문 등 추가 정보
  actor?: string; // 표시용 요약 문자열(ctx에서 파생)
  ctx?: LogContext; // 구조화된 컨텍스트(중앙 전송용)
}

const MAX_LOGS = 800;

// 이 앱 실행 세션 식별자(전송 로그 묶음 추적용) — 재시작하면 새로 발급
export const SESSION_ID = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

interface LogState {
  entries: LogEntry[];
  add: (level: LogLevel, message: string, detail?: string) => void;
  clear: () => void;
}

let seq = 0;

// 로그를 남길 때 사용자 컨텍스트를 붙이기 위한 리졸버(App에서 주입 — 순환 참조 회피)
let contextResolver: (() => LogContext | undefined) | null = null;
export function setLogContextResolver(fn: (() => LogContext | undefined) | null) {
  contextResolver = fn;
}

function deriveActor(ctx?: LogContext): string | undefined {
  if (!ctx) return undefined;
  const who = ctx.userName || ctx.userId || '미로그인';
  const dept = ctx.department ? `·${ctx.department}` : '';
  const ver = ctx.appVersion ? ` · v${ctx.appVersion}` : '';
  return `${who}${dept}${ver}`;
}

export const useLogStore = create<LogState>()(
  devtools(
    (set) => ({
      entries: [],
      add: (level, message, detail) =>
        set((st) => {
          let ctx: LogContext | undefined;
          try {
            ctx = contextResolver?.();
          } catch {
            /* 무시 */
          }
          const entry: LogEntry = {
            id: `${Date.now().toString(36)}_${(seq++).toString(36)}`,
            n: seq,
            ts: Date.now(),
            level,
            message: String(message ?? ''),
            detail,
            ctx,
            actor: deriveActor(ctx),
          };
          const next = st.entries.length >= MAX_LOGS ? st.entries.slice(1) : st.entries.slice();
          next.push(entry);
          return { entries: next };
        }),
      clear: () => set({ entries: [] }),
    }),
    { name: 'log' },
  ),
);

// 스토어 밖(유틸/콘솔 훅)에서 호출하기 쉬운 헬퍼
export function pushLog(level: LogLevel, message: string, detail?: string) {
  useLogStore.getState().add(level, message, detail);
}

// 화면(프론트) 로그 버퍼 — 콘솔/전역 오류/네트워크(API) 이벤트를 메모리에 모아 로그 뷰어에서 확인.
//  · 최대 MAX_LOGS 개 링버퍼(오래된 것부터 제거)
//  · 데스크톱/웹 모두 동작(서버 불필요)
import { create } from 'zustand';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'api';

export interface LogEntry {
  id: string;
  ts: number; // epoch ms
  level: LogLevel;
  message: string;
  detail?: string; // 스택/응답 본문 등 추가 정보
  actor?: string; // 로그를 남긴 사용자(아이디·이름·부서·버전 등) — 나중 중앙 수집 대비
}

const MAX_LOGS = 800;

interface LogState {
  entries: LogEntry[];
  add: (level: LogLevel, message: string, detail?: string) => void;
  clear: () => void;
}

let seq = 0;

// 로그를 남길 때 현재 사용자 식별정보를 붙이기 위한 리졸버.
//  (스토어 간 순환 참조를 피하려고 App에서 주입 — setLogActorResolver)
let actorResolver: (() => string | undefined) | null = null;
export function setLogActorResolver(fn: (() => string | undefined) | null) {
  actorResolver = fn;
}

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  add: (level, message, detail) =>
    set((st) => {
      let actor: string | undefined;
      try {
        actor = actorResolver?.();
      } catch {
        /* 무시 */
      }
      const entry: LogEntry = {
        id: `${Date.now().toString(36)}_${(seq++).toString(36)}`,
        ts: Date.now(),
        level,
        message: String(message ?? ''),
        detail,
        actor,
      };
      const next = st.entries.length >= MAX_LOGS ? st.entries.slice(1) : st.entries.slice();
      next.push(entry);
      return { entries: next };
    }),
  clear: () => set({ entries: [] }),
}));

// 스토어 밖(유틸/콘솔 훅)에서 호출하기 쉬운 헬퍼
export function pushLog(level: LogLevel, message: string, detail?: string) {
  useLogStore.getState().add(level, message, detail);
}

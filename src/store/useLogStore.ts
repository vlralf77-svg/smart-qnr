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
}

const MAX_LOGS = 800;

interface LogState {
  entries: LogEntry[];
  add: (level: LogLevel, message: string, detail?: string) => void;
  clear: () => void;
}

let seq = 0;

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  add: (level, message, detail) =>
    set((st) => {
      const entry: LogEntry = {
        id: `${Date.now().toString(36)}_${(seq++).toString(36)}`,
        ts: Date.now(),
        level,
        message: String(message ?? ''),
        detail,
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

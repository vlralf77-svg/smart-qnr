// 중앙 로그 수집 설정 — 사내 로그 수집 API로 화면 로그를 전송/조회.
//  계약(백엔드가 제공해야 하는 규격):
//   · 전송(ingest): POST {url}   body: { logs: LogPayload[] }        → 200/204 성공
//   · 조회(query) : GET  {url}?user=&level=&q=&limit=  → CentralLogEntry[]
//  LogPayload = { ts(ISO8601), level, message, detail?, sessionId,
//                 userId?, userName?, department?, role?, appVersion?, platform?, route? }
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LogConfigState {
  enabled: boolean; // 중앙 전송 사용 여부
  url: string; // 수집 API 주소(POST 전송 / GET 조회 공용)
  lastError: string; // 마지막 전송 오류(설정 화면 표시용)
  lastSentAt: number | null; // 마지막 전송 성공 시각
  setEnabled: (v: boolean) => void;
  setUrl: (v: string) => void;
  setLastError: (v: string) => void;
  setLastSentAt: (v: number | null) => void;
}

export const useLogConfig = create<LogConfigState>()(
  persist(
    (set) => ({
      enabled: false,
      url: '',
      lastError: '',
      lastSentAt: null,
      setEnabled: (v) => set({ enabled: v }),
      setUrl: (v) => set({ url: v }),
      setLastError: (v) => set({ lastError: v }),
      setLastSentAt: (v) => set({ lastSentAt: v }),
    }),
    {
      name: 'smartqnr-log-config',
      // 오류/시각 같은 휘발성 값은 저장하지 않음
      partialize: (s) => ({ enabled: s.enabled, url: s.url }),
    },
  ),
);

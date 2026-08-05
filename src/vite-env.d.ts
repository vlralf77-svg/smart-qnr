/// <reference types="vite/client" />

// 빌드 시 vite define 으로 주입되는 프로그램(exe) 버전 (package.json version)
declare const __APP_VERSION__: string;

interface UpdateStatusPayload {
  state: 'checking' | 'available' | 'downloading' | 'downloaded' | 'ready' | 'up-to-date' | 'error';
  version?: string;
  percent?: number;
}

interface SmartQnrBridge {
  isElectron: boolean;
  platform: string;
  convertDocument: (payload: {
    fileName: string;
    data: ArrayBuffer;
  }) => Promise<{ schemaText: string; rawText: string }>;
  /** 자동 업데이트 진행 상태 구독. 구독 해제 함수를 반환. */
  onUpdateStatus?: (cb: (payload: UpdateStatusPayload) => void) => () => void;
  /** 창 닫기 시도 시 종료 확인 모달을 띄우도록 알림 받기. 구독 해제 함수를 반환. */
  onQuitRequest?: (cb: () => void) => () => void;
  /** 종료 확인 모달에서 '종료' 선택 시 실제 종료 진행. */
  confirmQuit?: () => void;
  /** 업데이트 준비 모달에서 '지금 재시작' 선택 시 설치·재시작. */
  restartForUpdate?: () => void;
  /** 문진 엑셀 템플릿을 네이티브 저장창으로 저장. */
  saveTemplate?: () => Promise<{
    ok: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }>;
  /** 표시 모드(pc/mobile/auto) 알림 → 창 최소 크기 조절. */
  setDisplayWindow?: (mode: 'pc' | 'mobile' | 'auto') => void;
  /** EMR/외부 API 호출(메인 프로세스 경유, CORS 없음). */
  emrFetch?: (req: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  }) => Promise<{ ok: boolean; status: number; data?: unknown; error?: string }>;
}

interface Window {
  smartqnr?: SmartQnrBridge;
}

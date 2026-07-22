/// <reference types="vite/client" />

// 빌드 시 vite define 으로 주입되는 프로그램(exe) 버전 (package.json version)
declare const __APP_VERSION__: string;

interface UpdateStatusPayload {
  state: 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error';
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
}

interface Window {
  smartqnr?: SmartQnrBridge;
}

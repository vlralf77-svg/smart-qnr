/// <reference types="vite/client" />

// 빌드 시 vite define 으로 주입되는 프로그램(exe) 버전 (package.json version)
declare const __APP_VERSION__: string;

interface SmartQnrBridge {
  isElectron: boolean;
  platform: string;
  convertDocument: (payload: {
    fileName: string;
    data: ArrayBuffer;
  }) => Promise<{ schemaText: string; rawText: string }>;
}

interface Window {
  smartqnr?: SmartQnrBridge;
}

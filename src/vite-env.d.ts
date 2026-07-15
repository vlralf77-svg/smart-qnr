/// <reference types="vite/client" />

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

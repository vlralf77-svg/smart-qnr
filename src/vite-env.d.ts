/// <reference types="vite/client" />

interface Window {
  smartqnr?: {
    isElectron: boolean;
    platform: string;
  };
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createRequire } from 'node:module';

// package.json 의 version 을 빌드 시점에 앱으로 주입(화면에 프로그램 버전 표시용)
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

// Electron 패키징 시 file:// 로 로드되므로 상대경로(base './') 필요
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // 개발서버(HMR)에서 백엔드(도커/로컬 8080)로 /api 프록시.
    //  `docker compose up -d db backend` + `npm run dev:api` 조합으로,
    //  실제 DB에 저장하면서도 화면 수정은 즉시 반영된다.
    //  대상 주소는 VITE_DEV_API_TARGET 로 바꿀 수 있음(기본 localhost:8080).
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});

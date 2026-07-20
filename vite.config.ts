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
  },
});

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
    // react-rnd(내부 react-draggable)가 브라우저에 없는 process.env.DRAGGABLE_DEBUG 를
    // 참조해 dev 에서 "process is not defined" 오류가 남 → false 로 치환.
    'process.env.DRAGGABLE_DEBUG': 'false',
  },
  // dev 사전번들(esbuild)에도 동일 치환 적용
  optimizeDeps: {
    esbuildOptions: {
      define: { 'process.env.DRAGGABLE_DEBUG': 'false' },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // 최신 ECMAScript(ES2024 문법 보존) 출력 + tree-shaking·코드 스플리팅 최적화
  //  esbuild 는 'es2024' 리터럴 타깃을 아직 받지 않으므로 상위 개념인 'esnext' 사용(다운레벨 없이 최신 문법 유지)
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // 앱 전역에서 정적으로 쓰는 무거운 벤더를 별도 청크로 분리(초기 로드/캐시 효율)
        //  pdfjs·mammoth 등은 변환 화면에서 동적 import 되어 자동으로 코드 스플리팅됨
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
          ],
          'vendor-datepickers': ['@mui/x-date-pickers', 'dayjs'],
        },
      },
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
      // 연동 관리의 '서버 경유로 호출' 옵션 — 개발 서버가 EMR 을 대신 호출한다.
      //  브라우저는 같은 오리진(개발 서버)만 부르므로, EMR 이 CORS 를 허용하지 않아도 동작한다.
      //  대상 서버 주소는 요청 헤더 x-emr-target 으로 전달받는다.
      '/emr-proxy': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
        router: (req) => (req.headers['x-emr-target'] as string) || 'http://127.0.0.1',
        rewrite: (p) => p.replace(/^\/emr-proxy/, ''),
        configure: (proxy) => {
          // 내부용 헤더는 대상 서버로 넘기지 않는다
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('x-emr-target'));
        },
      },
    },
  },
});

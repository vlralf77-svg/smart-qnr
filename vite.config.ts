import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createRequire } from 'node:module';

// package.json 의 version 을 빌드 시점에 앱으로 주입(화면에 프로그램 버전 표시용)
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

/**
 * 연동 관리의 '서버 경유로 호출' 옵션용 개발 서버 프록시(dev 전용).
 *  브라우저는 같은 오리진(개발 서버)만 부르므로, 대상 서버가 CORS 를 허용하지 않아도 동작한다.
 *  대상 서버 주소는 요청 헤더 x-emr-target 으로 받고, 나머지 경로/쿼리는 그대로 이어붙인다.
 *  (vite 의 server.proxy 는 요청마다 대상을 바꾸지 못해 직접 미들웨어로 처리)
 */
function emrDevProxy(): Plugin {
  // 대상 서버로 넘기지 않을 헤더(연결 관련·내부용)
  const DROP = new Set([
    'host',
    'connection',
    'content-length',
    'x-emr-target',
    'origin',
    'referer',
    'accept-encoding',
  ]);
  return {
    name: 'smartqnr-emr-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/emr-proxy', (req, res) => {
        void (async () => {
          const fail = (status: number, message: string) => {
            res.statusCode = status;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            // 대상 서버의 응답이 아니라 프록시 자체의 실패임을 화면에 알린다
            res.setHeader('x-emr-proxy-error', '1');
            res.end(JSON.stringify({ error: message }));
          };
          const target = req.headers['x-emr-target'];
          if (typeof target !== 'string' || !/^https?:\/\//i.test(target)) {
            fail(400, '대상 서버(x-emr-target)가 지정되지 않았습니다.');
            return;
          }
          const url = target.replace(/\/$/, '') + (req.url || '/');
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(req.headers)) {
            if (DROP.has(k.toLowerCase()) || v == null) continue;
            headers[k] = Array.isArray(v) ? v.join(', ') : v;
          }
          let body: Buffer | undefined;
          if (req.method && !['GET', 'HEAD'].includes(req.method)) {
            const chunks: Buffer[] = [];
            for await (const c of req) chunks.push(c as Buffer);
            body = Buffer.concat(chunks);
          }
          try {
            const r = await fetch(url, { method: req.method || 'GET', headers, body });
            const buf = Buffer.from(await r.arrayBuffer());
            res.statusCode = r.status;
            const ct = r.headers.get('content-type');
            if (ct) res.setHeader('content-type', ct);
            res.end(buf);
          } catch (e) {
            // 대상 서버에 닿지 못함(주소 오류·방화벽·서버 다운 등)
            const cause = (e as { cause?: { code?: string } })?.cause?.code;
            fail(
              502,
              `대상 서버 호출 실패: ${(e as Error).message}${cause ? ` (${cause})` : ''} — ${url}`,
            );
          }
        })();
      });
    },
  };
}

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
  plugins: [react(), emrDevProxy()],
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
    },
  },
});

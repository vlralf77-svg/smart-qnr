// 콘솔/전역 오류를 로그 스토어로 캡처(1회 설치). 원래 콘솔 동작은 그대로 유지.
import { pushLog } from '@/store/useLogStore';

let installed = false;

function stringifyArgs(args: unknown[]): { message: string; detail?: string } {
  const parts = args.map((a) => {
    if (a instanceof Error) return a.message;
    if (typeof a === 'string') return a;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  });
  const errWithStack = args.find((a): a is Error => a instanceof Error);
  return { message: parts.join(' '), detail: errWithStack?.stack };
}

export function installLogCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  (['error', 'warn', 'info'] as const).forEach((method) => {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args);
      try {
        const { message, detail } = stringifyArgs(args);
        pushLog(method === 'info' ? 'info' : method, message, detail);
      } catch {
        /* 로깅 실패는 무시 */
      }
    };
  });

  // 처리되지 않은 예외/프라미스 거부
  window.addEventListener('error', (e) => {
    pushLog(
      'error',
      `Uncaught: ${e.message}`,
      e.error?.stack ?? `${e.filename}:${e.lineno}:${e.colno}`,
    );
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    pushLog(
      'error',
      `Unhandled promise rejection: ${msg}`,
      reason instanceof Error ? reason.stack : undefined,
    );
  });

  pushLog('info', '로그 캡처 시작');
}

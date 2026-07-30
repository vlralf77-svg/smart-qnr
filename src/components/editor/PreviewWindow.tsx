// 미리보기를 별도 OS 창으로 띄우는 컴포넌트(2모니터 작업용).
//  React 포털로 새 창 문서에 렌더 → 같은 편집 스토어를 그대로 구독하므로 실시간으로 갱신된다.
//  MUI(emotion) 스타일이 새 창에도 적용되도록 새 문서 head 에 전용 emotion 캐시를 주입.
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import createCache, { EmotionCache } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '@/theme';

interface Props {
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function PreviewWindow({ title = '미리보기 — SmartQnR', onClose, children }: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [cache, setCache] = useState<EmotionCache | null>(null);

  useEffect(() => {
    const win = window.open('', 'smartqnr-preview', 'width=900,height=1040');
    if (!win) {
      // 팝업이 차단된 경우
      onClose();
      return;
    }

    win.document.title = title;

    // 기본 리셋 + 앱 배경 톤
    const base = win.document.createElement('style');
    base.textContent =
      'html,body{margin:0;padding:0;height:100%;}' +
      'body{background:#f2f6f4;-webkit-font-smoothing:antialiased;}' +
      '*{box-sizing:border-box;}';
    win.document.head.appendChild(base);

    const mount = win.document.createElement('div');
    mount.id = 'preview-root';
    mount.style.minHeight = '100%';
    win.document.body.appendChild(mount);

    const emo = createCache({ key: 'pvw', container: win.document.head, prepend: true });

    setContainer(mount);
    setCache(emo);

    // 새 창을 사용자가 닫으면 상태 동기화
    const onChildUnload = () => onClose();
    win.addEventListener('beforeunload', onChildUnload);
    // 부모 창(앱)이 닫히면 미리보기 창도 함께 닫기
    const onParentUnload = () => {
      try {
        win.close();
      } catch {
        /* 무시 */
      }
    };
    window.addEventListener('beforeunload', onParentUnload);

    return () => {
      win.removeEventListener('beforeunload', onChildUnload);
      window.removeEventListener('beforeunload', onParentUnload);
      try {
        win.close();
      } catch {
        /* 무시 */
      }
    };
    // 최초 1회만 창을 연다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!container || !cache) return null;

  return createPortal(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>,
    container,
  );
}

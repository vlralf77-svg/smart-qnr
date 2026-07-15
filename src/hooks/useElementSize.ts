import { useCallback, useEffect, useRef, useState } from 'react';

/** 요소의 실제 렌더 크기(px)를 반응형으로 추적 (오버레이 % ↔ px 변환용) */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setSize({ width: el.clientWidth, height: el.clientHeight });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return { ref, size, measure };
}

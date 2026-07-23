// 데모/시연 모드 플래그.
//  - 빌드 시 VITE_DEMO=1 이면 데모(시연) 모드 → 테스트 편의 요소 노출.
//  - 기본(자동배포) 빌드는 운영 모드로, 테스트 요소가 화면에 보이지 않고 동작도 비활성.
//
//  데모 빌드:   VITE_DEMO=1 npm run build   (또는 npm run build:demo)
//  운영 빌드:   npm run build               (기본값 — 테스트 요소 없음)
export const IS_DEMO =
  import.meta.env.VITE_DEMO === '1' || import.meta.env.VITE_DEMO === 'true';

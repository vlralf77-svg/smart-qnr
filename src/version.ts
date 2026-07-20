// 프로그램(exe) 버전 — package.json 의 version 을 빌드 시 vite define 으로 주입.
// 앱 여러 화면(로그인/헤더)에서 "v0.1.35" 형태로 표시한다.
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

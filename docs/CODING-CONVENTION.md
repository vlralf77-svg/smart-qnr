# 코딩 컨벤션 (SmartQnR)

본 프로젝트는 **「자연스럽고 일관성 있게 자바스크립트 코딩하는 원칙」(idiomatic.js, 한국어판)** 을
기준으로 개발합니다.

- 원문/번역: https://github.com/rwaldron/idiomatic.js/tree/master/translations/ko_KR

컨벤션은 사람이 눈으로만 지키는 것이 아니라 **도구로 자동 강제**합니다.

- **Prettier** — 코드 포맷팅(들여쓰기·따옴표·줄바꿈 등) 자동화
- **ESLint** — 코드 품질·문법·안티패턴 검사
- **TypeScript(`tsc --noEmit`)** — 타입 검사

## 자동 검사 실행

```bash
npm run format        # Prettier 로 전체 포맷 정리
npm run format:check  # 포맷 위반 여부만 검사(CI 용)
npm run lint          # ESLint 검사
npm run lint:fix      # ESLint 자동 수정
npm run typecheck     # 타입 검사
```

위 4가지는 CI(`.github/workflows/ci.yml`)에서 **푸시·PR 시 자동 실행**되며, 실패 시 병합할 수 없습니다.

## 핵심 규칙 (idiomatic.js 요약 + 프로젝트 확정값)

Prettier 설정(`.prettierrc.json`)으로 강제되는 포맷:

| 항목        | 값               | 비고                |
| ----------- | ---------------- | ------------------- |
| 들여쓰기    | 스페이스 2칸     | 탭 사용 금지        |
| 따옴표      | 작은따옴표(`'`)  | JSX 속성 포함       |
| 세미콜론    | 사용             | 문장 끝 `;`         |
| 최대 줄길이 | 100자            | 초과 시 자동 줄바꿈 |
| 후행 콤마   | 항상(`all`)      | 배열·객체·인자 목록 |
| 화살표 괄호 | 항상(`(x) => …`) | 인자 1개여도 괄호   |
| 줄바꿈 문자 | LF               | OS 무관 통일        |

ESLint 로 강제되는 품질 규칙(발췌, `.eslintrc.cjs`):

- `var` 금지 — `const`/`let` 사용(`no-var`: error)
- 재할당 없는 변수는 `const`(`prefer-const`)
- 타입 강제 동등 비교 `===`/`!==` 지향(`eqeqeq`)
- 사용하지 않는 변수 금지(단, `_` 접두 인자는 허용)
- React Hooks 규칙 준수(`react-hooks/rules-of-hooks`: error, `exhaustive-deps`: warn)
- `any` 지양(`no-explicit-any`: warn)

## 네이밍·구조 관례

- 변수·함수: `camelCase`, 컴포넌트·타입: `PascalCase`, 상수: `UPPER_SNAKE_CASE`
- 파일: 컴포넌트 `PascalCase.tsx`, 그 외 `camelCase.ts`
- 스토어: `useXxxStore.ts`(Zustand), 훅: `useXxx.ts`
- 주석은 "무엇"이 아니라 "왜"를 설명(한국어 허용)

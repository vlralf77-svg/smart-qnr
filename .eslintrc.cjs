// ESLint 설정 — idiomatic.js(ko) 원칙 기반 + TypeScript/React + Prettier 연동.
//  포맷팅 규칙은 Prettier 에 위임(eslint-config-prettier 로 충돌 비활성화).
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    // idiomatic.js: 일관성/가독성 원칙 — 실질적 오류는 error, 스타일·정리성은 warn
    eqeqeq: ['warn', 'smart'], // 타입 강제 비교(=== / !==) 지향
    'prefer-const': 'warn',
    'no-var': 'error',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'react/prop-types': 'off', // 타입은 TypeScript 로 검증
    'react/no-unescaped-entities': 'off', // 한글 본문의 따옴표 오탐 방지
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error', // 훅 규칙 위반은 실제 버그 → error
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
  },
  ignorePatterns: [
    'dist',
    'release',
    'build',
    'node_modules',
    '**/*.cjs',
    'vite.config.ts',
    '*.config.js',
  ],
};

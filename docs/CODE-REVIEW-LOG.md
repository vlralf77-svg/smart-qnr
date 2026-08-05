# 코드 리뷰 수행 이력 (SmartQnR)

본 문서는 `docs/CODE-REVIEW.md`에 정의된 **절차·기준·체크리스트**에 따라 실제로 수행한
코드 리뷰의 이력(산출물)이다. 각 변경 단위(커밋/버전)에 대해 자체 검증 결과와 리뷰 지적사항,
조치·재검토 결과를 기록한다.

> 리뷰 형태: 현재 저장소는 병원 BitBucket 이관 전 단계로, **작성자 자체 리뷰 + 도구 기반 게이트(CI)**를
> 1차 리뷰로 운영한다. 이관 후에는 GitHub/BitBucket PR의 리뷰·승인 기록이 동일 기준으로 축적된다.
> (게이트: `format:check` · `lint` · `typecheck` · `build`, `.github/workflows/ci.yml`)

## 1. 리뷰 세션 요약

| 일자       | 대상(버전 / 커밋)                | 유형     | 자체검증(F/L/T/B) | 지적→조치  | 결과 |
| ---------- | -------------------------------- | -------- | ----------------- | ---------- | ---- |
| 2026-08-05 | v0.9.14 / `fbb72c1`              | build    | ✅ / ✅ / ✅ / ✅ | 1건 → 반영 | 승인 |
| 2026-08-05 | v0.9.13 / `6f21cd8`              | feat     | ✅ / ✅ / ✅ / ✅ | 1건 → 반영 | 승인 |
| 2026-08-05 | (hotfix) / `839c6e3`             | style/CI | ✅ / ✅ / ✅ / ✅ | 1건 → 반영 | 승인 |
| 2026-08-05 | v0.9.12 / `75a2fce`              | security | ✅ / ✅ / ✅ / ✅ | 3건 → 반영 | 승인 |
| 2026-08-05 | v0.9.11 / `908e7f8`              | feat     | ✅ / ✅ / ✅ / ✅ | 0건        | 승인 |
| 2026-08-05 | v0.9.10 / `e8d7595`              | fix      | ✅ / ✅ / ✅ / ✅ | 1건 → 반영 | 승인 |
| 2026-08-05 | v0.9.5–0.9.9 / 마이그레이션 묶음 | feat     | ✅ / ✅ / ✅ / ✅ | 4건 → 반영 | 승인 |
| 2026-08-05 | v0.9.2 / `cb754f1`               | chore    | ✅ / ✅ / ✅ / ✅ | 0건        | 승인 |

_F=format:check, L=lint, T=typecheck, B=build_

## 2. 세션별 상세

### v0.9.14 — tsconfig target 조정 (`fbb72c1`)

- **범위:** `tsconfig.json` target `ES2024`→`ESNext`, `lib`은 `ES2024` 유지
- **성능:** 빌드 시 `Unrecognized target environment "ES2024"` 경고 발생 확인
- **지적:** esbuild가 `ES2024` 리터럴을 인식하지 못함 → 다운레벨 없이 상위 개념 `ESNext`로 조정, API 기준선은 `lib`로 유지
- **재검토:** `tsc --noEmit` 통과, 빌드 경고 0, 코드 스플리팅 청크 결과 동일함 확인 → **승인**

### v0.9.13 — OCI 표준 이미지 라벨 + 빌드 컨텍스트 경량화 (`6f21cd8`)

- **범위:** `server/Dockerfile`에 `org.opencontainers.image.*` 라벨, `server/.dockerignore` 신규, compose 빌드 args
- **지적(경량화):** 백엔드 `build.context: ./server`인데 `.dockerignore`가 저장소 루트에만 있어
  백엔드 빌드에 미적용 → 빌드 컨텍스트에 `target/` 등이 포함됨 → `server/.dockerignore` 추가로 해결
- **보안:** `.dockerignore`에 `*.p12/*.pem/*.key` 포함해 인증서가 이미지에 유입되지 않도록 방어
- **재검토:** compose YAML 유효성 확인, 라벨 스펙(OCI Image Spec) 키 검토 → **승인**

### (hotfix) — 문서 포맷 정리 (`839c6e3`)

- **계기:** v0.9.12 푸시 후 CI `format:check` 실패(자동 게이트가 지적)
- **지적:** `docs/ENV-COMPLIANCE.md` 표 정렬이 Prettier 규칙 불일치
- **조치:** `prettier --write`로 정리, 전체 `format:check` 통과 후 재푸시 → **CI 통과/승인**
- _교훈: 문서(.md)도 포맷 게이트 대상. 커밋 전 `format:check` 습관화._

### v0.9.12 — 서버 간 통신 HTTPS (`75a2fce`)

- **범위:** nginx→backend 구간 TLS(backend `server.ssl` + nginx `proxy_pass https` + 내부 CA 검증), 인증서 생성 스크립트
- **지적 3건:**
  1. **보안 – 비밀정보 커밋 위험:** 생성 인증서/키가 저장소에 올라갈 수 있음 → `.gitignore`에
     `certs/`, `*.p12/*.pem/*.key/*.crt/*.csr/*.srl` 추가
  2. **정확성 – 프록시 검증:** `proxy_ssl_verify off`는 암호화만 하고 대상 위조 방어 불가 →
     내부 CA(`internal-ca.pem`) 신뢰 + `proxy_ssl_verify on`, 인증서 SAN에 `DNS:backend` 부여
  3. **호환성 – 비루트 권한:** 키스토어를 non-root(uid 10001)가 읽어야 함 → 마운트 파일 권한(644) 확인
- **검증:** `gen-internal-certs.sh` 실행하여 키스토어 alias·SAN 생성 확인, YAML 유효성 확인 → **승인**

### v0.9.10 — Redux DevTools 전 스토어 적용 (`e8d7595`)

- **지적(일관성):** `devtools` 미들웨어가 일부(코어 4개) 스토어에만 적용되어 요구(디버깅) **부분 충족** →
  전 스토어(15개)로 확대 적용, persist와 중첩 순서(`devtools(persist(...))`) 통일
- **재검토:** 각 스토어 `name` 지정, 빌드·타입 통과 → **승인**

### v0.9.5–0.9.9 — 환경 마이그레이션 묶음

- **대상:** React 18→19, MUI 5→7 / x-date-pickers 7→8, Spring Boot 3.3→4.0, JDK 25, Thymeleaf, OpenAPI
- **지적 4건(주요):**
  - React 19: 전역 `JSX` 네임스페이스 제거 → 필요한 파일에 `import type { JSX }` 추가
  - x-date-pickers 8: `PickersDayProps` 비제네릭화 → 타입 인자 제거
  - Vite: `target: 'es2024'` 거부 → `esnext`로 조정(문법 보존)
  - 빌드 산출물(`server/target`) Prettier 검사 대상 유입 → `.prettierignore` 반영
- **검증:** 단계별 `mvn compile` / `npm run build` 통과 확인 → **승인**

## 3. 이력 관리 원칙

- 신규 변경은 본 로그의 **세션 요약 표에 1행 추가** + 지적·조치가 있으면 상세 절 기록.
- 자동 게이트(CI) 지적도 리뷰 이력으로 간주하여 기록한다.
- BitBucket/GitHub PR 이관 후에는 PR 링크를 각 행에 병기하여 근거를 일원화한다.

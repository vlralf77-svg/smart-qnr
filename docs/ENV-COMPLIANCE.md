# 환경 요구사항 대비표 (RFP: 외래센터·연구동 스마트 통합시스템)

현재 저장소 구성 기준. ✅ 충족 · ⚠️ 부분/주의 · ➖ 운영·조직 환경 사항(코드 무관).

## 1. 프론트엔드 (Front-End)

| 요구사항      | 요구값                              | 현재                                                                                                            | 판정 |
| ------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---- |
| 런타임        | Node.js v22 LTS↑                    | CI/빌드 Node 22, `engines: node>=22`, web Dockerfile `node:22-alpine`                                           | ✅   |
| 개발 언어     | TypeScript ES2024                   | TS 5.9, tsconfig `target/lib ES2024`, Vite `esnext`                                                             | ✅   |
| 프레임워크    | React v19↑                          | React 19 (함수형 컴포넌트)                                                                                      | ✅   |
| 상태관리      | Zustand + 미들웨어                  | Zustand 4.5, `persist` + `devtools`                                                                             | ✅   |
| 불변성·최적화 | 유지                                | 불변 업데이트 헬퍼                                                                                              | ✅   |
| 빌드          | Vite HMR·tree-shaking·코드 스플리팅 | Vite 5, React.lazy + manualChunks                                                                               | ✅   |
| IDE           | VSCode + 확장 + 포맷/린트 자동화    | `.vscode`(권장 확장·저장 시 포맷·ESLint)                                                                        | ✅   |
| 디버깅        | Redux DevTools                      | zustand `devtools` 미들웨어 **전 스토어(15개) 적용** → 웹 빌드(브라우저 Redux DevTools 확장)에서 상태·액션 추적 | ✅   |
| REST-API      | OpenAPI 3.0 + JSON                  | springdoc(백엔드) + 표준 JSON                                                                                   | ✅   |

## 2. 백엔드 (Back-End)

| 요구사항              | 요구값                          | 현재                                                                                               | 판정 |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| 런타임                | Node22 또는 Temurin JDK 25      | Temurin JDK 25 (pom·Docker)                                                                        | ✅   |
| 개발 언어             | TS(ES2024) 또는 Java 25         | Java 25                                                                                            | ✅   |
| 프레임워크            | nest10+ 또는 Spring Boot v4     | Spring Boot 4.0.0                                                                                  | ✅   |
| 템플릿 엔진(JAVA)     | Thymeleaf 필수                  | Thymeleaf + `ConsoleViewController(/console)`                                                      | ✅   |
| OpenAPI               | 모든 REST-API + View Controller | springdoc `GroupedOpenApi`(rest-api·view 그룹) + `@Operation`                                      | ✅   |
| 컨테이너              | OCI·경량·멀티스테이지           | 멀티스테이지 + `eclipse-temurin:25-jre`(JRE) + `org.opencontainers.image.*` 라벨 + `.dockerignore` | ✅   |
| Non-root              | 최소 권한                       | 백엔드 Dockerfile `USER 10001`                                                                     | ✅   |
| 환경별 매니페스트     | 개발/검증/운영                  | `docker-compose.yml`(개발) · `docker-compose.staging.yml`(검증) · `docker-compose.prod.yml`(운영)  | ✅   |
| Private Registry 저장 | 병원 제공 레지스트리            | 이미지 빌드 준비 완료 / 실제 push 는 배포 파이프라인                                               | ➖   |
| IDE(JAVA)             | IntelliJ IDEA Ultimate          | 개발자 로컬 도구                                                                                   | ➖   |
| Git 서버              | BitBucket                       | 현재 GitHub / 병원 BitBucket 이관                                                                  | ➖   |

## 3. 웹서버

| 요구사항 | 요구값            | 현재                                 | 판정 |
| -------- | ----------------- | ------------------------------------ | ---- |
| 웹서버   | nginx 최신 Stable | web Dockerfile `nginx:stable-alpine` | ✅   |

## 3-1. 서버 간 통신(HTTPS)

| 구간                      | 요구값     | 현재                                                                                         | 판정 |
| ------------------------- | ---------- | -------------------------------------------------------------------------------------------- | ---- |
| 클라이언트 → web(nginx)   | HTTPS 필수 | 443 TLS1.2/1.3, HTTP→HTTPS 301, HSTS (`nginx.https.conf`)                                    | ✅   |
| web(nginx) → backend(WAS) | HTTPS 필수 | `proxy_pass https://backend:8080` + `proxy_ssl_verify on`(내부 CA), backend `server.ssl` TLS | ✅   |
| backend → DB              | (범위 외)  | 내부 네트워크 평문(요청 범위: nginx→backend 구간만 적용)                                     | ➖   |

- 내부 사설 인증서 생성: `scripts/gen-internal-certs.sh` → `certs/backend-keystore.p12`(백엔드 키스토어) · `certs/internal-ca.pem`(nginx 신뢰 CA)
- backend TLS 는 env 로 제어(`SERVER_SSL_ENABLED`); 개발은 기본 off(평문), 운영은 on
- 운영 오버레이(`docker-compose.prod.yml`)에서 키스토어 마운트 + `SERVER_SSL_*` 주입

## 4. 공통 개발 품질

| 항목              | 현재                                                                                | 판정 |
| ----------------- | ----------------------------------------------------------------------------------- | ---- |
| ESLint / Prettier | 적용 + CI 게이트(`ci.yml`)                                                          | ✅   |
| 코딩 컨벤션       | idiomatic.js 기준 문서 + 도구 강제                                                  | ✅   |
| 코드 리뷰 절차    | `docs/CODE-REVIEW.md`(절차·기준) + `docs/CODE-REVIEW-LOG.md`(수행 이력) + PR 템플릿 | ✅   |

## 참고: 실운영 최종 검증 권장

- JDK25 Docker 빌드: `docker build -f server/Dockerfile server/` (maven:temurin-25 에서 컴파일)
- SB4 런타임 스모크: DB·JWT·API 기동 테스트
- 프론트 스모크: React19+MUI7 주요 화면 육안 확인

# 대규모 환경 마이그레이션 계획 (RFP 대응)

RFP 환경 요구사항 중 **대규모 변경**을 단계별로 진행한다. 각 단계는 독립 커밋 + 검증(빌드/타입체크/린트/컴파일) 통과 후 다음 단계로 넘어간다.

## 단계 개요

| 단계                                    | 내용                                                                      | 검증                          | 위험도  |
| --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------- | ------- |
| **1. FE — React 19**                    | react/react-dom 18→19, @types/react 19, `JSX.Element`→`React.JSX.Element` | typecheck·build               | 중      |
| **2. FE — MUI 7**                       | @mui/material·icons 5→7, @mui/x-date-pickers 7→8, emotion 확인            | typecheck·build + 화면 스모크 | 중~높음 |
| **3. BE — JDK 25**                      | Docker 베이스/컴파일 타깃 21→25(Temurin)                                  | mvn compile                   | 중      |
| **4. BE — Spring Boot 4**               | parent 3.3→4.0, Jakarta/설정 변경 대응                                    | mvn compile·test              | 높음    |
| **5. BE — Thymeleaf + View Controller** | thymeleaf 스타터 + 뷰 컨트롤러 + 해당 OpenAPI                             | mvn compile                   | 중      |

## 단계별 세부

### 1) React 19

- `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19`
- 브레이킹: 전역 `JSX` 네임스페이스 제거 → `JSX.Element` 사용처(App/FormList/ComponentPalette/CreateFormDialog)를 `React.JSX.Element` 로 교체
- `ReactDOM.createRoot` 는 이미 사용 중(영향 없음)
- 검증: `npm run typecheck && npm run build`

### 2) MUI 7

- `@mui/material@^7`, `@mui/icons-material@^7`, `@mui/x-date-pickers@^8`
- 확인 포인트: `Grid`(현재 미사용 — 영향 없음), `sx`/테마 API(대부분 호환), DatePicker/DateCalendar slots API
- 검증: typecheck·build 후 주요 화면(로그인·목록·편집기·통계·환자문진) 스모크

### 3) JDK 25

- `server/Dockerfile` 베이스 `eclipse-temurin:21` → `25`, `pom.xml <java.version>21→25`
- 검증: 멀티스테이지 이미지 빌드 또는 `mvn compile`

### 4) Spring Boot 4

- `spring-boot-starter-parent` 3.3.5 → 4.0.x
- 대응: 의존성 좌표·자동설정 변경, Jakarta EE 11, springdoc 호환 버전 상향
- 검증: `mvn -B compile`, 가능하면 `mvn test`

### 5) Thymeleaf + View Controller

- `spring-boot-starter-thymeleaf` 추가, 서버 렌더 뷰(관리/상태 페이지 등) + 뷰 컨트롤러 OpenAPI 문서화
- 검증: `mvn compile`

## 공통 원칙

- 단계마다 **버전 bump + 커밋 + 푸시**, CI(품질 게이트) 통과 확인
- 실패 시 해당 단계에서 멈추고 원인·대안 보고(무리한 강행 금지)
- 프론트/백엔드는 독립적이므로 순서 조정 가능

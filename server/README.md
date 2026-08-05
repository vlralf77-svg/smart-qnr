# SmartQnR 백엔드 (Spring Boot + PostgreSQL)

문진(양식)·응답을 중앙 서버 + DB 로 저장·공유하기 위한 REST API 입니다.
프론트엔드(Electron/React)는 `VITE_API_BASE_URL` 을 지정하면 이 서버를 사용합니다.

## 구성

```
Electron(React)  ──HTTP──▶  Spring Boot (:8080)  ──JDBC──▶  PostgreSQL
                            · 로그인(JWT)              · forms (jsonb)
                            · 문진 CRUD/발행            · form_responses (jsonb)
                            · 응답 저장/조회
```

- 전체 `FormSchema` JSON 은 `forms.schema_json`(jsonb)에 통째로 저장 — 프론트 계약과 1:1.
- 응답의 `answers` 는 `form_responses.answers_json`(jsonb)에 저장.
- 인증: 로그인 시 JWT 발급, 이후 `/api/**` 요청은 `Authorization: Bearer <token>` 필요
  (`/api/auth/**` 제외).

## 실행

### 1) PostgreSQL 준비

```bash
cd server
docker compose up -d          # localhost:5432, db/user/pw = smartqnr
```

(도커가 없으면 로컬 PostgreSQL 에 `smartqnr` DB/계정을 직접 만들어도 됩니다.)

### 2) 서버 실행

```bash
cd server
./mvnw spring-boot:run        # 또는: mvn spring-boot:run
# 패키징: mvn -DskipTests package && java -jar target/smartqnr-server-0.1.0.jar
```

기본 포트 `:8080`. 최초 기동 시 테이블이 자동 생성됩니다(`ddl-auto=update`).

### 환경변수 (운영에서 반드시 지정)

| 변수                          | 기본값                                      | 설명                              |
| ----------------------------- | ------------------------------------------- | --------------------------------- |
| `DB_URL`                      | `jdbc:postgresql://localhost:5432/smartqnr` | DB 접속 URL                       |
| `DB_USER` / `DB_PASSWORD`     | `smartqnr` / `smartqnr`                     | DB 계정                           |
| `AUTH_USER` / `AUTH_PASSWORD` | `admin` / `lit123qwe!`                      | 로그인 계정(프론트와 동일)        |
| `JWT_SECRET`                  | (개발용 고정값)                             | **운영에서는 강력한 랜덤값 필수** |
| `JWT_EXPIRY_HOURS`            | `12`                                        | 토큰 만료(시간)                   |
| `JPA_DDL_AUTO`                | `update`                                    | 운영은 `validate` + Flyway 권장   |

## API

| 메서드 | 경로                        | 설명                                                 |
| ------ | --------------------------- | ---------------------------------------------------- |
| POST   | `/api/auth/login`           | `{username,password}` → `{token,username,expiresIn}` |
| GET    | `/api/forms`                | 전체 문진 목록(JSON 배열)                            |
| GET    | `/api/forms?published=true` | 발행본만(응답 화면용)                                |
| GET    | `/api/forms/{id}`           | 문진 1건                                             |
| POST   | `/api/forms`                | 문진 저장(upsert). 본문 = `FormSchema` JSON          |
| PUT    | `/api/forms/{id}`           | 문진 수정                                            |
| POST   | `/api/forms/{id}/publish`   | 발행(status=published)                               |
| DELETE | `/api/forms/{id}`           | 삭제                                                 |
| POST   | `/api/responses`            | 응답 제출. 본문 = `FormResponse` JSON                |
| GET    | `/api/forms/{id}/responses` | 특정 문진의 응답 목록                                |

`/api/auth/login` 외 모든 `/api/**` 는 Bearer 토큰이 필요합니다.

## 프론트엔드 연결

1. 프론트 루트에 `.env` 생성:
   ```
   VITE_API_BASE_URL=http://localhost:8080
   ```
2. `src/api/client.ts` 의 `api` 를 사용하도록 스토어를 전환:
   - `useAuthStore.login` → `await api.login(id, pw)`
   - `useFormsStore` 의 localStorage 로직 → `api.listForms/saveForm/deleteForm/publishForm/...`
     (env 미설정 시 `isBackendEnabled === false` 이므로 기존 localStorage 로 계속 동작합니다.)

> 참고: 현재 프론트는 기본적으로 localStorage 로 동작합니다. 위 전환 작업(스토어를
> 비동기 API 호출로 교체)은 별도 단계로 진행하면 됩니다.

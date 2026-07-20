# SmartQnR 서버 실행 (Docker) — 내 PC 로컬 & 서버 공통

DB(PostgreSQL) + WAS(Spring Boot·내장 Tomcat) + 웹서버(nginx) 3계층을
Docker Compose 로 한 번에 띄웁니다. **서버가 아니라 내 PC(Windows/Mac)에서도
Docker Desktop 만 있으면 그대로 로컬 실행됩니다.**

```
브라우저 ──▶ web(nginx :8081) ──┬─ 정적 프론트(React)
                                └─ /api/* ──▶ backend(WAS :8080) ──▶ db(PostgreSQL :5432)
```

## 내 PC에서 로컬 실행 (Docker Desktop)

1. **Docker Desktop** 설치·실행: https://www.docker.com/products/docker-desktop/
2. 아래 중 하나로 기동:
   - **Windows**: `start-local.bat` 더블클릭 (중지: `stop-local.bat`)
   - **Mac/Linux**: `./start-local.sh` (중지: `./stop-local.sh`)
   - 또는 수동:
     ```bash
     cp .env.example .env          # 값 수정(비밀번호·JWT_SECRET 등)
     docker compose up -d --build  # db + backend + web 빌드·기동
     ```
3. 접속:
   - 웹: http://localhost:8081  (프론트 + /api 프록시)
   - API 직접: http://localhost:8080/api
   - 로그인: `admin` / `lit123qwe!`

최초 기동 시 백엔드가 테이블(`forms`, `form_responses`)을 자동 생성합니다.
(첫 빌드는 이미지 다운로드·빌드로 몇 분 걸릴 수 있고, 이후엔 캐시로 빠릅니다.)

중지/재시작:
```bash
docker compose down          # 중지(데이터 볼륨 pgdata 는 보존)
docker compose down -v       # 데이터까지 삭제
docker compose up -d --build # 코드 변경 후 재빌드 기동
```

## 구성 파일
| 파일 | 역할 |
|---|---|
| `docker-compose.yml` | 전체 스택(db·backend·web) 오케스트레이션 |
| `server/Dockerfile` | 백엔드(WAS) 멀티스테이지 빌드(Maven→JRE) |
| `web/Dockerfile` | 프론트 Vite 빌드 → nginx 서빙 |
| `web/nginx.conf` | 정적 서빙 + `/api` 리버스 프록시 |
| `.env.example` | 환경변수 템플릿(`.env` 로 복사) |

## 환경변수 (.env)
| 변수 | 기본값 | 설명 |
|---|---|---|
| `DB_NAME`/`DB_USER`/`DB_PASSWORD` | smartqnr | DB 이름/계정 |
| `DB_PORT` | 5432 | DB 외부 포트 |
| `BACKEND_PORT` | 8080 | API 포트 |
| `WEB_PORT` | 8081 | 웹 포트 |
| `AUTH_USER`/`AUTH_PASSWORD` | admin / lit123qwe! | 로그인 계정(프론트와 동일) |
| `JWT_SECRET` | (변경 필수) | 토큰 서명 키 — 운영에선 강력한 랜덤값 |
| `JWT_EXPIRY_HOURS` | 12 | 토큰 만료(시간) |
| `JPA_DDL_AUTO` | update | 운영은 `validate` + 마이그레이션 권장 |
| `VITE_API_BASE_URL` | (빈값) | 브라우저 API 오리진. 비우면 nginx 가 프록시 |

## 데스크톱(.exe) 앱과의 관계
- 관리용 **.exe(Electron)** 앱은 그대로 사용 가능하며, 원격 API를 쓰려면
  앱/브라우저에서 `VITE_API_BASE_URL` 을 이 서버 주소로 지정하면 됩니다.
- 현재 프론트는 기본적으로 로컬(localStorage)로 동작합니다. 서버 저장으로
  전환하려면 스토어를 `src/api/client.ts` 호출로 바꾸면 됩니다(별도 단계).

## 검증 노트
이 구성은 동일한 3계층(PostgreSQL + Spring Boot + nginx)을 실제로 세워
`웹서버 → 백엔드 → DB` 전 경로(로그인·문진 CRUD·발행·응답·삭제)를 통과
확인했습니다. `web/nginx.conf` 는 `nginx -t` 문법 검사도 통과합니다.
(도커 이미지 빌드 자체는 Docker 데몬이 있는 환경에서 `docker compose up`
으로 수행하세요.)

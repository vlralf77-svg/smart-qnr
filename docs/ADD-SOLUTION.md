# 서버에 다른 솔루션 추가 구성 가이드

SmartQnR 서버 스택(web·backend·db)에 **다른 솔루션을 함께 올릴 때**의 구성 방법.
자체 개발 서비스(케이스 1)와 외부 벤더 패키지(케이스 2)를 모두 다룬다.

## 원칙 한 줄

> 기존 스택은 그대로 두고, 새 솔루션을 **별도 컨테이너**로 붙인 뒤
> **web(nginx)** 가 경로로 갈라 보낸다. 새 컨테이너는 **호스트 포트를 열지 않는다.**

```
            병원 Proxy Server (SSL 종단, 병원 도메인)
                          │
                    web (nginx)  ← 유일한 관문
       ┌──────────────────┼──────────────────┐
   / , /api/         /solution-a/        /solution-b/
       │                  │                  │
  backend(SmartQnR)  solution-a(자체)   solution-b(벤더 이미지)
       │                  │                  │
       └──────────── db (Postgres, DB/계정 단위 분리) ──────────┘
```

## 두 가지 케이스

| 구분        | 케이스 1 — 자체 개발    | 케이스 2 — 외부 벤더             |
| ----------- | ----------------------- | -------------------------------- |
| compose     | `build: ./solution-a`   | `image: vendor/xxx:tag`          |
| 이미지 출처 | 우리 CI 빌드 → Registry | 벤더 제공 → 병원 Registry 미러링 |
| 환경변수    | 우리가 정의             | 벤더 문서 규격에 맞춤            |
| 업데이트    | CI/CD 파이프라인        | 벤더 태그 교체(고정 태그)        |

## 구성 4요소

### 1) 컨테이너 추가 — `docker-compose.ext.yml`

기본 스택 위에 오버레이로 얹는다.

```bash
docker compose -f docker-compose.yml -f docker-compose.ext.yml up -d
```

- `solution-a`(자체 빌드), `solution-b`(벤더 이미지) 예시 포함
- 공통: `ports` 미노출 · `depends_on: db` · 자원 상한(`deploy.resources.limits`) · healthcheck

### 2) nginx 라우팅 — `web/nginx.extra.conf.example`

`server {}` 안에 `location /solution-a/`, `/solution-b/` 블록 추가.

| 방식       | 접근 URL             | 언제                                 |
| ---------- | -------------------- | ------------------------------------ |
| 경로 기반  | `도메인/solution-a/` | 도메인 하나 공유, 가장 간단(권장)    |
| 서브도메인 | `solution-a.병원.kr` | 완전 분리 필요(DNS·인증서 병원 협의) |

- `/api/`, `/assets/` 와 겹치지 않는 prefix 사용
- WebSocket 쓰면 `Upgrade`/`Connection` 헤더 추가
- 벤더 앱이 절대경로 리소스로 깨지면 앱 base-url 을 `/solution-b` 로 지정하거나 `sub_filter` 치환

### 3) DB 분리 — `scripts/init-extra-solutions.sql.example`

- 기본: 같은 Postgres 안에 **DB+계정 분리**(자원 절약, 데이터 격리)
- 대안: 스키마만 분리 / 벤더가 다른 엔진 요구 시 `db2` 컨테이너 별도

### 4) HTTPS·보안 구간

- 외부 → nginx: 병원 Proxy 가 SSL 종단(병원 도메인). `docs/PROXY-ARCHITECTURE.md`
- nginx → 새 솔루션: 필요 시 `nginx.https.conf` 처럼 `https://` + 내부 CA 적용

## 추가 시 체크리스트

- [ ] 새 컨테이너 `ports` 미노출(외부 직접 접근 차단, nginx 만 관문)
- [ ] nginx location prefix 충돌 없음(`/api/`·`/assets/` 회피)
- [ ] `deploy.resources.limits` 로 자원 상한 → 동시 100명 기존 성능 보호
- [ ] 외부 이미지는 병원 Private Registry 미러링 + 보안 스캔 + **태그 고정**
- [ ] DB 계정·데이터베이스 분리, 비밀번호는 `.env`/secret
- [ ] `healthcheck` 정의, 로그 수집 경로 통일(`docs/central-logging.md`)
- [ ] 자체 솔루션은 `.github/workflows/ci.yml` 에 빌드 잡 추가
- [ ] 백업 대상에 새 DB/볼륨 포함

## 화면 없는(headless) 솔루션일 때

배치·연계·메시지 처리 등 **웹 UI 가 없는** 솔루션이면 nginx 라우팅(2)은 생략한다.
컨테이너만 내부 네트워크에 추가하고, SmartQnR backend 나 DB 와 내부 주소
(`http://solution-x:port`, `db:5432`)로만 통신하도록 구성한다.

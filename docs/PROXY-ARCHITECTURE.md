# 프록시 아키텍처 (병원 Proxy Server 연동)

RFP 요구:

1. 외부(환자·보호자) 접근 서비스와 병원 내부망 시스템 간 인터페이스는 **병원 Proxy Server**를 통해 연결.
2. Proxy Server는 **Reverse Proxy** 설정으로 내부 시스템이 외부에 공개되지 않도록 매칭.
3. Proxy Server 구간에 **SSL 적용**, SSL 은 **병원이 제공하는 도메인 SSL** 활용.
4. **기존 병원 Proxy 정책 준수.**

## 1. 연결 구조

```
 [외부] 환자·보호자
     │  HTTPS (병원 도메인 SSL)
     ▼
 ┌─────────────────────────┐
 │  병원 Proxy Server        │  ← Reverse Proxy + SSL 종단(병원 도메인 인증서)
 │  (병원 제공·병원 정책)     │
 └─────────────────────────┘
     │  (내부망) — 외부 비공개
     ▼
 ┌─────────────────────────┐
 │  web (nginx)             │  ← 정적 프론트 + /api 리버스 프록시
 └─────────────────────────┘
     │  (내부망)
     ▼
 ┌───────────┐   ┌───────────┐
 │ backend    │──▶│ db(postgres)│   ← 외부 미노출(ports 없음)
 └───────────┘   └───────────┘
```

- 외부에는 **병원 Proxy Server만** 노출된다. 우리 시스템(web/backend/db)은 **내부망**에만 위치.
- 병원 Proxy 가 **SSL 종단**(병원 도메인 인증서)을 담당한다 → 우리 시스템은 그 뒤에서 동작.

## 2. RFP 항목별 충족

| 요구                        | 구현/대응                                                                                      | 판정 |
| --------------------------- | ---------------------------------------------------------------------------------------------- | ---- |
| 병원 Proxy 경유 연결        | 우리 스택은 병원 Proxy 뒤에 배치. 외부 진입점은 병원 Proxy 하나                                | ✅   |
| Reverse Proxy·내부 비공개   | 운영 compose 에서 `db`/`backend` **포트 미노출**(`ports: []`), web 만 내부 프록시로 노출       | ✅   |
| Proxy 구간 SSL(병원 도메인) | **SSL 종단은 병원 Proxy**(병원 도메인 인증서). 우리 백엔드는 `X-Forwarded-*` 신뢰로 https 인식 | ✅   |
| 기존 Proxy 정책 준수        | 병원 정책에 맞춰 헤더·경로·포트 매칭(조직 협의 사항)                                           | ➖   |

## 3. 프록시 뒤 정상 동작을 위한 설정 (완료)

- **백엔드**: `application.yml` `server.forward-headers-strategy: framework`
  → 병원 Proxy/nginx 가 넘긴 `X-Forwarded-Proto/Host` 를 신뢰해, 리다이렉트·OpenAPI 서버 URL·secure 쿠키가
  실제 외부 스킴(https)·도메인 기준으로 생성됨.
- **web(nginx)**: `/api` 프록시에서 `Host`·`X-Real-IP`·`X-Forwarded-For`·`X-Forwarded-Proto` 전달(설정됨).
- **CORS**: `CORS_ALLOWED_ORIGINS` 에 외부 공개 도메인(병원 도메인) 지정.

## 4. SSL 처리 방식 — 2가지 (병원 정책에 맞춰 선택)

### 방식 1) 병원 Proxy 가 SSL 종단 (권장·RFP 기본)

병원 Proxy 가 병원 도메인 SSL 로 HTTPS 를 종단하고, 내부망 구간(Proxy→web)은 병원 정책에 따라 HTTP
또는 내부 TLS 로 전달. 이 경우 우리 web 는 **SSL 인증서를 직접 보유할 필요가 없다**.

- web 는 기본 `web/nginx.conf`(HTTP) 로 운영 가능 — 병원 Proxy 로부터만 트래픽 수신.
- 외부용 공인 인증서를 우리 시스템에 넣지 않아도 됨(병원 도메인 SSL 을 Proxy 가 처리).

### 방식 2) 내부망도 TLS(재암호화)

병원 정책이 내부망 구간에도 암호화를 요구하면, Proxy→web 를 HTTPS 로 재암호화.

- web 는 `web/nginx.https.conf` 사용(내부 인증서 또는 병원 제공 인증서 마운트).
- nginx→backend 구간은 이미 내부 TLS 적용됨(`docs/ENV-COMPLIANCE.md` 3-1).

## 5. 배포 시 협의 필요(병원 전산팀)

- 병원 Proxy 에서 우리 web 로 매칭할 **경로/포트/업스트림 주소**
- 병원 Proxy 의 **SSL 종단 정책**(방식 1/2 중 무엇인지)
- 병원 Proxy 가 전달하는 **헤더 규약**(X-Forwarded-* 명칭·신뢰 범위)
- 방화벽/네트워크 세그먼트(내부망 배치 위치)

> 우리 시스템 측 설정(리버스 프록시·내부 비공개·X-Forwarded 신뢰)은 준비 완료.
> 병원 Proxy 실제 매칭·SSL 종단·정책은 병원 제공 환경에 맞춰 연동한다.

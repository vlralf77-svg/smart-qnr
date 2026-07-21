# SmartQnR 보안 가이드 (개인정보·의료정보)

병원 문진은 **개인정보/민감정보(의료)** 를 다루므로 아래 통제를 운영 전 반드시 적용하세요.
이 문서는 (A) 코드로 구현된 보안 기능과 설정, (B) 운영자가 해야 할 체크리스트로 구성됩니다.

---

## A. 구현된 보안 기능 & 설정 방법

### 1) 관리자 비밀번호 — BCrypt 해시
- `AUTH_PASSWORD_HASH` 설정 시 평문 대신 **BCrypt 해시로 검증**(설정 없으면 개발용 평문 폴백 + 경고 로그).
- 해시 생성:
  ```bash
  # apache2-utils(htpasswd) 사용 — 앞의 ':' 와 개행 제거
  htpasswd -bnBC 12 "" '실제_강력한_비밀번호' | tr -d ':\n'
  # → $2y$12$.... 형태 출력. 이 값을 AUTH_PASSWORD_HASH 로.
  ```
  (운영에서는 `AUTH_PASSWORD` 는 비워 둡니다.)

### 2) CORS 출처 제한
- `CORS_ALLOWED_ORIGINS` (콤마 구분)로 허용 도메인 지정. 예: `https://qnr.hospital.example.com`
- 미설정 시 `*`(개발) + 경고 로그.

### 3) HTTPS / 보안 헤더 (nginx)
- HTTP 기본 설정(`web/nginx.conf`)에도 X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy 적용.
- **HTTPS 운영**: `web/nginx.https.conf` 템플릿 사용 — TLS1.2/1.3, HSTS, CSP, HTTP→HTTPS 리다이렉트.
  - 인증서를 `./certs/fullchain.pem`, `./certs/privkey.pem` 에 두고, `server_name` 을 실제 도메인으로 변경.
  - 운영 compose(`docker-compose.prod.yml`)가 이 파일과 인증서를 마운트하고 443 을 노출합니다.

### 4) 운영 compose — 포트 비노출 + 시크릿 강제
- `docker-compose.prod.yml`:
  - **db/backend 포트를 호스트로 노출하지 않음**(web 프록시 경유만).
  - `DB_PASSWORD / JWT_SECRET / AUTH_PASSWORD_HASH / DATA_ENCRYPTION_KEY / CORS_ALLOWED_ORIGINS` **미설정 시 기동 실패**.
  - `JPA_DDL_AUTO=validate`(운영에서 스키마 자동변경 금지).
- 실행:
  ```bash
  cp .env.prod.example .env   # 값 채우기
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  ```

### 5) 문진 응답 암호화 (AES-256-GCM)
- 환자 응답(`form_responses.answers_json`)을 **AES-256-GCM 으로 암호화**해 저장(`EncryptedStringConverter`).
- 키: 환경변수 **`DATA_ENCRYPTION_KEY`** (Base64 32바이트). 코드/이미지에 넣지 말고 시크릿으로만 주입.
  ```bash
  openssl rand -base64 32   # → DATA_ENCRYPTION_KEY
  ```
- 키 미설정 시 평문 저장(개발) + 경고. **운영에서는 반드시 설정.**
- 저장 형식은 `enc:v1:...` 접두어로 암호문/평문을 구분하므로, 키 도입 후 신규 응답부터 암호화됩니다.
- ⚠️ **스키마 변경 주의**: 이 컬럼이 기존 `jsonb` → `text` 로 바뀌었습니다.
  - **신규 배포**: 자동 생성되어 문제 없음.
  - **기존 DB**: 컬럼 타입을 바꿔야 합니다.
    ```sql
    ALTER TABLE form_responses ALTER COLUMN answers_json TYPE text USING answers_json::text;
    ```
    또는 개발 DB면 `docker compose down -v` 로 재생성.
- 🔑 **키 관리**: 운영에서는 KMS/Vault 로 키를 보관·회전하세요. 키 분실 시 기존 암호문 복호화 불가.

### 6) 로그인 무차별 대입 방지
- `AuthController` + `LoginThrottleService`: (사용자+IP) 기준 실패 카운트, `LOGIN_MAX_ATTEMPTS`(기본 5) 초과 시 `LOGIN_LOCK_MINUTES`(기본 10)분 잠금 → `429`.
- 인메모리(단일 인스턴스). 다중 인스턴스는 Redis 등 공유 저장소로 확장 권장.

### 7) JWT
- HS256, 시크릿 `JWT_SECRET`(운영: 랜덤 32바이트+ `openssl rand -base64 48`), 만료 `JWT_EXPIRY_HOURS`(운영 권장 8 이하).

---

## B. 운영자 체크리스트

### 필수 (배포 전)
- [ ] `AUTH_PASSWORD_HASH` 설정, `AUTH_PASSWORD` 비움
- [ ] `JWT_SECRET` 강력 랜덤으로 교체
- [ ] `DATA_ENCRYPTION_KEY` 설정(+ KMS/Vault 보관)
- [ ] `DB_PASSWORD` 강력 랜덤으로 교체
- [ ] `CORS_ALLOWED_ORIGINS` 실제 도메인으로 제한
- [ ] **HTTPS/TLS** 적용(nginx.https.conf + 인증서), HSTS
- [ ] db/backend 포트 외부 비노출(prod compose 사용) + 방화벽
- [ ] `JPA_DDL_AUTO=validate` (운영), 스키마는 마이그레이션 도구로 관리(Flyway 권장)

### 데이터 보호
- [ ] **DB 볼륨/디스크 암호화**(LUKS/클라우드 KMS/스토리지 암호화) — at-rest
- [ ] DB 연결 TLS(`sslmode=require`)
- [ ] 백업 암호화 + 접근통제, 정기 복구 테스트
- [ ] 보관기간·파기 정책, 수집·이용 **동의** 절차

### 접근통제 / 감사 (개인정보보호법 안전성 확보조치)
- [ ] 접근권한 최소화·주기적 점검, 계정 회수 프로세스
- [ ] **접속·조회 감사로그** 보관(개인정보 1년 / 민감·고유식별 2년), 위·변조 방지
- [ ] 로그에 민감정보(비밀번호/주민번호/응답) 미기록
- [ ] 관리자 화면 접근 IP 제한/망분리(가능 시)

### 애플리케이션 / 의존성
- [ ] 서버측 입력 검증, 에러 메시지에 내부정보 노출 금지
- [ ] `npm audit` / OWASP dependency-check, 컨테이너 이미지 스캔(Trivy)
- [ ] 컨테이너 non-root, 베이스 이미지 정기 패치

### 데스크톱(exe) 배포
- [ ] **코드 서명**(미서명 시 SmartScreen 경고·위변조 위험)
- [ ] 자동 업데이트 피드 **HTTPS** + `latest.yml` 무결성
- [ ] Electron `contextIsolation` on / `nodeIntegration` off / preload 최소 노출 점검

---

## 참고
- 이 저장소의 기본값(admin/lit123qwe!, smartqnr, change-this-*)은 **개발용**입니다. 운영 반영 시 전부 교체하세요.
- 규제: 개인정보보호법, 「개인정보 안전성 확보조치 기준」, 의료법/의료기관 개인정보 지침을 확인하세요.

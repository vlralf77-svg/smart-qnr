# DB 쿼리 연동 (API 대신 병원 DB 직접 조회)

EMR REST API 없이 **병원 DB(Oracle 등)에 직접 SELECT** 해서 문진 대상·환자 정보를 받아오는 기능이다.

- 설정 화면: 관리자 메뉴 → **DB 쿼리 연동** (`/db-link`, `계정관리` 권한 필요)
- 실행 주체: **백엔드(Spring Boot)**. 브라우저는 DB 프로토콜(TCP 1521 등)에 직접 접속할 수 없다.
- 엔드포인트: `POST /api/db-link/test` (JWT 인증 필요 — `JwtAuthFilter` 가 `/api/**` 를 보호)

## 동작 모드

| 모드               | 조건                                | 테스트 버튼 동작                    |
| ------------------ | ----------------------------------- | ----------------------------------- |
| 백엔드 연동        | `VITE_USE_BACKEND=1` (도커 웹 빌드) | **실제 DB 접속·SELECT 실행**        |
| 오프라인(데스크톱) | 기본값                              | 내장 샘플로 파이프라인만 시뮬레이션 |

화면 상단 배지로 현재 어느 모드인지 표시된다(`실제 DB 실행` / `시뮬레이션`).

## 안전장치 (서버측)

- **조회 전용**: `SELECT`·`WITH` 로 시작하는 쿼리만 허용. `INSERT/UPDATE/DELETE/MERGE/DROP/ALTER/CREATE/TRUNCATE/GRANT/REVOKE/CALL/EXEC/COMMIT/…` 차단
- **다중 문장 차단**: 중간 세미콜론(`SELECT 1; DROP TABLE t`)은 거부. 문자열 리터럴·주석 안의 금지어·세미콜론은 오탐하지 않음
- **바인드 파라미터**: `:name` → `?` 로 치환해 PreparedStatement 로 실행(SQL 인젝션 방지). PostgreSQL 캐스팅(`::type`)은 파라미터로 오인하지 않음
- **읽기전용 커넥션**(`setReadOnly(true)`), **접속 타임아웃 5초**, **쿼리 타임아웃 15초**, **최대 500행(기본 50행)**
- 비밀번호는 **저장하지 않고** 요청 처리 중에만 사용. 로그·응답의 URL 에서 자격증명은 마스킹

> 그럼에도 **읽기 전용 DB 계정**을 사용하고, 병원 정보팀/DBA 의 **DB 직접 접속 승인**을 먼저 받아야 한다.

## Oracle 대상 (드라이버 포함 빌드)

Oracle JDBC(`ojdbc11`)는 `oracle` Maven 프로파일에 분리해 두었다.

- **도커 이미지(운영 배포)**: `server/Dockerfile` 의 `MAVEN_PROFILES` 기본값이 `oracle` 이라 **드라이버가 포함된 채로 빌드**된다(CI 도 동일하게 전달). 제외하려면 `--build-arg MAVEN_PROFILES=` (빈 값).
- **로컬 빌드**: 기본 빌드에는 포함되지 않으므로 프로파일을 명시한다.

```bash
cd server
mvn -P oracle clean package     # ojdbc11 포함
mvn clean package               # 미포함(PostgreSQL 등만)
```

드라이버가 없는 빌드(구버전 이미지 포함)에서 Oracle URL 로 실행하면 다음 안내가 반환된다.

```
Oracle JDBC 드라이버가 없습니다. 서버를 -P oracle 프로파일로 빌드하거나 ojdbc11 을 클래스패스에 추가하세요.
```

접속 방식별로 생성되는 JDBC URL:

| 모드      | 입력                 | JDBC URL                                                |
| --------- | -------------------- | ------------------------------------------------------- |
| EZConnect | 호스트/포트/서비스명 | `jdbc:oracle:thin:@//db.hospital.local:1521/ORCLPDB1`   |
| TNS 별칭  | 별칭 + TNS_ADMIN     | `jdbc:oracle:thin:@EMRDB` (`oracle.net.tns_admin` 전달) |
| JDBC URL  | URL 직접 입력        | 입력값 그대로                                           |

## 로컬에서 실제 연동 테스트 (PostgreSQL)

PostgreSQL 드라이버는 기본 포함이라 별도 빌드 없이 실제 실행을 확인할 수 있다.

```bash
# 1) 테스트 DB 준비
createdb emrtest
psql -d emrtest <<'SQL'
CREATE TABLE qnr_forms (
  form_id varchar(20) PRIMARY KEY, title varchar(100) NOT NULL,
  category varchar(50), patient_no integer NOT NULL);
INSERT INTO qnr_forms VALUES
 ('F001','건강검진 사전 문진','건강검진',10001),
 ('F002','수술 전 안전 점검','수술',10001),
 ('F010','우울 척도(PHQ-9)','척도검사',20002);
CREATE USER qnr_ro WITH PASSWORD 'ro_pw_1234';       -- 읽기 전용 계정
GRANT CONNECT ON DATABASE emrtest TO qnr_ro;
GRANT USAGE ON SCHEMA public TO qnr_ro;
GRANT SELECT ON qnr_forms TO qnr_ro;
SQL

# 2) 화면 설정 — DB 쿼리 연동
#   접속 방식: JDBC URL 직접 입력
#   URL: jdbc:postgresql://127.0.0.1:5432/emrtest
#   계정: qnr_ro / ro_pw_1234
#   쿼리:
#     SELECT form_id AS "formId", title AS "title", category AS "category"
#     FROM qnr_forms WHERE patient_no = :patientNo
#   파라미터: patientNo (값을 비우면 테스트 시 입력)
#
# 3) [테스트 실행] → 실제 조회 결과 + 실행시간이 표시된다
```

컬럼 별칭(`AS "formId"`)을 앱 필드명과 맞추면 매핑 없이 그대로 쓸 수 있고, 다르면 **컬럼 → 앱 필드 매핑**에서 연결한다.

## 참고

- 서버측 구현: `server/src/main/java/com/lhospital/smartqnr/dblink/`
  (`DbLinkController` · `DbLinkService` · `DbLinkDto`)
- 쿼리 검증·파싱 단위 테스트: `server/src/test/java/com/lhospital/smartqnr/dblink/DbLinkServiceTest.java`
- 프론트 설정 화면: `src/pages/DbLinkConfig.tsx`, 설정 저장: `src/store/useDbLinkStore.ts`
- 오프라인 시뮬레이션: `src/utils/dbLinkSim.ts`

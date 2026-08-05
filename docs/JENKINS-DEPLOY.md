# SmartQnR — Jenkins 배포 가이드

형상관리(SVN)에서 소스를 받아 **관리 프로그램(Windows exe) · 백엔드(Spring Boot) · 웹 스택(Docker)** 을
빌드/배포하는 Jenkins 파이프라인 설정 방법입니다. 파이프라인 정의는 루트 `Jenkinsfile` 입니다.

---

## 1. 사전 준비 (Jenkins 관리자)

### 플러그인

- **Pipeline**, **Subversion Plugin**(SVN 체크아웃), **NodeJS Plugin**,
  **Docker Pipeline**(선택), **Credentials**.

### Global Tool Configuration 에 등록 (Jenkinsfile 의 tools 이름과 일치해야 함)

| 종류   | 이름     | 비고               |
| ------ | -------- | ------------------ |
| NodeJS | `node20` | Node.js 20.x       |
| JDK    | `jdk21`  | Java 21 (백엔드)   |
| Maven  | `maven3` | Maven 3.x (백엔드) |

### 에이전트(노드) 라벨

| 라벨      | 용도                                 | 필요 도구                       |
| --------- | ------------------------------------ | ------------------------------- |
| `windows` | exe 패키징(electron-builder NSIS)    | Node.js, (코드사이닝 시 인증서) |
| `linux`   | 프론트 검증, Maven 빌드, Docker 배포 | Docker, docker compose          |

### 자격증명(Credentials)

- **SVN 계정**: 잡 SCM 에서 사용할 SVN 사용자/비밀번호.
- (선택) 배포 대상 서버 SSH 키, 코드사이닝 인증서.

---

## 2. 파이프라인 잡 생성

1. **New Item → Pipeline** 생성 (예: `smartqnr-deploy`).
2. **Pipeline → Definition: _Pipeline script from SCM_** 선택.
3. **SCM: Subversion**
   - Repository URL: `https://svn.lhospital.local/smartqnr/trunk`
   - Credentials: 위에서 등록한 SVN 계정
   - Local module directory: `.`
4. **Script Path**: `Jenkinsfile`
5. 저장.

> 릴리스 브랜치를 빌드하려면 SCM URL 을 `branches/release-x` 로 바꾼 잡을 별도로 만들면 됩니다.

---

## 3. 자동 트리거

원하는 방식 택1:

- **SVN 폴링**: 잡 설정 → _Build Triggers_ → **Poll SCM**, 스케줄 `H/5 * * * *`(5분마다 변경 확인).
- **커밋 훅(post-commit)**: SVN 서버의 `hooks/post-commit` 에서
  `curl -X POST http://jenkins/job/smartqnr-deploy/build?token=...` 호출(즉시 빌드).

---

## 4. 파라미터

| 파라미터        | 기본값 | 설명                         |
| --------------- | ------ | ---------------------------- |
| `BUILD_EXE`     | true   | 관리 프로그램(exe) 빌드/배포 |
| `BUILD_BACKEND` | true   | 백엔드 jar 빌드              |
| `DEPLOY_WEB`    | true   | Docker 웹 스택 재빌드/기동   |
| `DEPLOY_HOST`   | was-01 | 웹 스택 배포 대상            |

## 5. 환경변수(자동 업데이트 피드)

`Jenkinsfile` 의 `environment` 에서 사내 환경에 맞게 수정:

| 변수              | 예시                                    | 설명                                       |
| ----------------- | --------------------------------------- | ------------------------------------------ |
| `UPDATE_FEED_URL` | `https://dist.lhospital.local/smartqnr` | 설치 앱이 새 버전을 확인하는 URL           |
| `UPDATE_FEED_DIR` | `/var/www/dist/smartqnr`                | 위 URL 이 서빙하는 웹 루트(배포 복사 대상) |

`electron-builder` 를 `--publish never -c.publish.provider=generic -c.publish.url=$UPDATE_FEED_URL`
로 빌드하므로, 설치 앱의 `app-update.yml` 이 이 피드를 바라봅니다.
빌드 산출물(`*.exe`, `latest.yml`, `*.blockmap`)을 `UPDATE_FEED_DIR` 로 복사하면
electron-updater 가 자동 업데이트를 수행합니다.

> 기존 GitHub Releases 기반 자동배포에서 **사내 배포로 전환**하는 설정입니다.
> GitHub 을 계속 쓰려면 `package.json` 의 `build.publish`(github) 를 유지하고
> 위 `-c.publish.*` 오버라이드를 제거하면 됩니다.

---

## 6. 파이프라인 단계 요약 (`Jenkinsfile`)

1. **프론트 검증** (`linux`): `npm ci` → `npm run lint`(tsc) → `npm run build`
2. **빌드·패키징**(병렬)
   - **Windows exe** (`windows`): `npm ci` → `npm run build` → `electron-builder --win nsis`
     → 산출물 archive + stash
   - **백엔드** (`linux`): `server/` 에서 `mvn -DskipTests package` → jar archive
3. **웹 스택 배포** (`linux`): `ci/deploy-web.sh` (docker compose build/up, DB 볼륨 유지)
4. **exe 피드 배포** (`linux`): exe/latest.yml 을 `UPDATE_FEED_DIR` 로 복사

---

## 7. 로컬에서 동일 빌드 확인

```bash
npm ci && npm run build                    # 프론트
npx electron-builder --win nsis            # exe (Windows)
cd server && mvn -DskipTests package       # 백엔드 jar
bash ci/deploy-web.sh                       # 웹 스택(docker)
```

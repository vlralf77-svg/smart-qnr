# 개발환경 설치 목록 (SmartQnR)

이 프로젝트를 빌드·실행하기 위해 개발 PC에 설치해야 하는 소프트웨어 목록이다.
버전은 저장소 실제 설정(`.nvmrc`, `package.json`, `server/pom.xml`, Docker 파일) 기준.

## 1. 필수 — 프론트엔드 / 데스크톱(Electron) 개발

| 도구        | 버전                                    | 용도                          | 설치(Windows)                                      |
| ----------- | --------------------------------------- | ----------------------------- | -------------------------------------------------- |
| **Node.js** | **22 LTS** (`.nvmrc`=22, `engines>=22`) | 프론트 빌드·개발서버·Electron | nvm-windows 로 `nvm install 22 && nvm use 22` 권장 |
| npm         | Node 22 동봉                            | 패키지 설치(`npm ci`)         | Node 설치 시 포함                                  |
| Git         | 최신                                    | 소스 형상관리                 | git-scm.com                                        |

> Node 는 반드시 22 로 통일(현재 CI·Docker 모두 22). 여러 버전이 필요하면 nvm-windows 로 전환.

## 2. 백엔드(WAS) 개발 — 서버 코드를 직접 빌드/실행할 때

| 도구              | 버전     | 용도                       | 설치                                          |
| ----------------- | -------- | -------------------------- | --------------------------------------------- |
| **JDK (Temurin)** | **25**   | Spring Boot 4 컴파일·실행  | Eclipse Temurin 25 (adoptium.net)             |
| **Maven**         | **3.9+** | 백엔드 빌드(`mvn package`) | maven.apache.org (mvnw 래퍼 없음 → 직접 설치) |
| PostgreSQL        | 16       | 개발용 DB                  | 로컬 설치 또는 Docker(권장)                   |

> 백엔드까지 로컬에서 돌릴 필요가 없다면(프론트만 개발) 2번은 생략 가능. DB·백엔드는 3번 Docker 로 띄우는 게 간편하다.

## 3. 전체 스택 실행 — 권장(가장 간단)

| 도구               | 버전        | 용도                          | 설치                               |
| ------------------ | ----------- | ----------------------------- | ---------------------------------- |
| **Docker Desktop** | 최신        | DB+백엔드+웹 한 번에 기동     | docker.com/products/docker-desktop |
| Docker Compose     | Docker 동봉 | `docker compose up` 스택 실행 | Docker Desktop 포함                |

```bash
# 전체 스택(개발): DB + 백엔드 + 웹
docker compose up -d --build
# 프론트만 개발(HMR) + 백엔드는 Docker:
docker compose up -d db backend && npm run dev:api
```

## 4. 에디터 + 확장 (권장)

| 도구        | 확장(`.vscode/extensions.json` 자동 추천)                                         |
| ----------- | --------------------------------------------------------------------------------- |
| **VS Code** | ESLint · Prettier · TypeScript Next · ES7 React snippets · GitLens · EditorConfig |

> VS Code 로 프로젝트를 열면 위 확장 설치를 자동 추천한다(저장 시 포맷·ESLint 자동 수정 설정 포함).

## 5. 선택 — 성능/검증 도구

| 도구   | 용도                                          | 설치  |
| ------ | --------------------------------------------- | ----- |
| **k6** | 동시 100명 부하 테스트(`scripts/loadtest.js`) | k6.io |

## 6. 설치 후 검증

```bash
node -v        # v22.x  (반드시 22)
npm -v         # 동봉 버전
git --version
java -version  # 25 (백엔드 개발 시)
mvn -v         # 3.9+ (백엔드 개발 시)
docker -v      # 스택 실행 시

# 프론트 의존성 설치 + 품질 게이트 확인
npm ci
npm run typecheck && npm run lint && npm run format:check && npm run build
```

## 7. 요약 (한눈에)

- **최소(프론트만):** Node 22 + Git + VS Code
- **풀스택 실행:** 위 + Docker Desktop
- **백엔드 코드 개발:** 위 + JDK 25 + Maven 3.9 (+ 로컬 PostgreSQL 또는 Docker)
- **부하 검증:** + k6

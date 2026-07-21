# SmartQnR — SVN 형상관리 설정 가이드

프로젝트 형상관리를 **Subversion(SVN)** 으로 운영하기 위한 저장소 구성·이관·운영 방법입니다.
(배포는 Jenkins — `docs/JENKINS-DEPLOY.md` 참고)

---

## 1. 저장소 레이아웃 (표준 trunk/branches/tags)

```
smartqnr/
├── trunk/          ← 개발 본류(HEAD). 여기서 빌드/배포
├── branches/       ← 기능/릴리스 브랜치
│   ├── feature-xxx
│   └── release-1.0
└── tags/           ← 릴리스 스냅샷(읽기 전용 취급)
    ├── v0.1.53
    └── v1.0.0
```

## 2. 저장소 생성(서버) 및 최초 임포트

서버 관리자가 저장소를 만든 뒤(예: `svnadmin create /repo/smartqnr`),
표준 레이아웃을 만들고 현재 소스를 `trunk` 에 임포트합니다.

```bash
# (1) 표준 폴더 생성
svn mkdir -m "init layout" \
  https://svn.lhospital.local/smartqnr/trunk \
  https://svn.lhospital.local/smartqnr/branches \
  https://svn.lhospital.local/smartqnr/tags

# (2) 현재 소스 임포트 (빌드 산출물 제외하고 임포트하는 것을 권장)
#     node_modules/dist/release/target 등을 미리 지운 상태에서:
svn import . https://svn.lhospital.local/smartqnr/trunk \
  -m "SmartQnR 최초 임포트"
```

> Git 이력을 보존하며 옮기려면 `git svn` 또는 `svn2git`/`git-svn` 브리지를 쓸 수 있으나,
> 통상은 위처럼 현재 스냅샷을 trunk 로 임포트합니다.

## 3. 체크아웃 & 무시 설정(svn:ignore)

```bash
# 작업 사본 체크아웃
svn checkout https://svn.lhospital.local/smartqnr/trunk smartqnr
cd smartqnr

# 빌드 산출물/의존성 무시(.svnignore 목록 적용)
svn propset svn:ignore -F .svnignore .
svn commit -m "chore: svn:ignore 설정"
```

`.svnignore` 에 정의된 제외 대상: `node_modules`, `dist`, `release`, `target`,
`server/target`, `.env*`, 로그/에디터 설정 등.

## 4. 일상 작업 흐름

```bash
svn update                 # 최신 반영
# ... 코드 수정 ...
svn status                 # 변경 확인
svn add <새 파일>          # 추가 파일 등록(신규만)
svn commit -m "feat: ..."  # 커밋(= 서버 반영)
```

- **브랜치 생성**: `svn copy .../trunk .../branches/feature-x -m "branch: feature-x"`
- **릴리스 태그**: `svn copy .../trunk .../tags/v1.0.0 -m "release v1.0.0"`
- **머지**: `svn merge` (trunk↔branch)

## 5. 버전 넘버링

- 앱 버전은 `package.json` 의 `version` 을 사용합니다(화면 및 exe 버전에 반영).
- 릴리스 시 해당 버전으로 **tag** 를 떠 스냅샷을 남깁니다: `tags/v<버전>`.

## 6. Jenkins 연동

Jenkins 잡의 SCM 을 **Subversion** 으로 지정하고 `trunk` URL 을 등록하면
`Jenkinsfile` 의 `checkout scm` 이 소스를 받아 빌드합니다.
자세한 설정은 `docs/JENKINS-DEPLOY.md` 참고.

# CI/CD 파이프라인

SmartQnR 의 지속적 통합·배포 구성. GitHub(현재)와 병원 Jenkins(이관 후) 양쪽을 지원한다.

## 1. 게이트형 파이프라인 (GitHub Actions — `.github/workflows/ci.yml`)

커밋(push)·PR 마다 다음 순서로 실행된다. **품질·백엔드 게이트를 모두 통과해야** 이미지 빌드로 진행한다.

```
 frontend-quality ─┐
 (format·lint·      ├─▶ docker-images   (needs: 둘 다 성공)
  type·build)       │    · server 이미지 빌드
 backend-build ─────┘    · web 이미지 빌드
 (JDK25 mvn package)     · push(브랜치/태그 push 시 GHCR, PR 은 빌드만)
```

| 단계               | 내용                                                      | 실패 시         |
| ------------------ | --------------------------------------------------------- | --------------- |
| `frontend-quality` | Node22 · `format:check` · `lint` · `typecheck` · `build`  | 파이프라인 중단 |
| `backend-build`    | Temurin JDK25 · `mvn -B -ntp -DskipTests package`         | 파이프라인 중단 |
| `docker-images`    | server(`./server`)·web(`web/Dockerfile`) 이미지 빌드→푸시 | 이미지 미배포   |

- **게이트:** `docker-images` 는 `needs: [frontend-quality, backend-build]` — 두 게이트가 성공해야만 실행.
- **PR:** 이미지는 **빌드만**(푸시 X). 브랜치/태그 **push** 시에만 레지스트리로 push.
- **캐시:** Buildx `type=gha` 레이어 캐시로 빌드 가속.

### 데스크톱 앱(별도 배포 워크플로)

`.github/workflows/build-exe.yml` — 지정 브랜치/태그 push 시 Windows `.exe` 빌드 →
GitHub Releases 발행 → `electron-updater` 자동 업데이트.

## 2. 레지스트리 (이미지 저장소)

- 현재: **GHCR**(`ghcr.io/<owner>/smartqnr-server`, `smartqnr-web`) — 데모/기본값.
- 운영: **병원 Private Registry** 로 교체. `ci.yml` 의 `ghcr.io/...` 태그와 `docker/login-action`
  의 `registry`·자격증명(secret)만 병원 레지스트리 값으로 바꾸면 된다.

## 3. 병원 Jenkins 파이프라인 (이관 후)

저장소 루트 **`Jenkinsfile`** 에 동일 개념의 파이프라인이 정의되어 있다(형상관리 SVN, 상세는
`docs/JENKINS-DEPLOY.md`). 단계 대응:

| GitHub Actions      | Jenkins 스테이지                 |
| ------------------- | -------------------------------- |
| frontend-quality    | Frontend 빌드/검증               |
| backend-build       | Backend(Maven) 빌드              |
| docker-images(push) | Docker 이미지 빌드·Registry push |
| build-exe.yml       | 관리 프로그램(exe) 빌드/배포     |

## 4. 현황 요약

| 항목                               | 상태                            |
| ---------------------------------- | ------------------------------- |
| 프론트 품질 게이트(CI)             | ✅                              |
| 백엔드 빌드 게이트(CI)             | ✅ (신규)                       |
| 게이트→이미지 빌드 순차 파이프라인 | ✅ (신규)                       |
| 컨테이너 이미지 CI 빌드/푸시       | ✅ (신규, 레지스트리 교체 가능) |
| 데스크톱 앱 자동 빌드·업데이트     | ✅                              |
| Jenkins(병원) 파이프라인 정의      | ✅                              |
| 운영 자동 배포(무중단 등)          | ➖ 병원 인프라 확정 후 연결     |

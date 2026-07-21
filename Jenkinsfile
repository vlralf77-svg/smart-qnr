// =====================================================================
// SmartQnR — Jenkins 배포 파이프라인 (형상관리: SVN)
//
//  구성 요소
//   1) 관리 프로그램(Windows .exe)  : Electron + electron-builder(NSIS)
//   2) 백엔드(WAS)                  : Spring Boot(Java 21) / Maven → jar
//   3) 웹 서버 스택                 : Docker Compose(db + backend + nginx)
//
//  형상관리는 SVN. Jenkins 잡의 SCM 을 Subversion 으로 설정하면
//  `checkout scm` 이 trunk(또는 지정 브랜치)를 체크아웃한다.
//  자세한 설정은 docs/JENKINS-DEPLOY.md, docs/SVN-SETUP.md 참고.
//
//  에이전트 라벨(조직 환경에 맞게 조정):
//   - 'windows' : Node.js + electron-builder 로 exe 패키징(Windows 필수)
//   - 'linux'   : Node 빌드/검증, Maven, Docker 배포
// =====================================================================

pipeline {
  agent none

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    timeout(time: 60, unit: 'MINUTES')
  }

  parameters {
    booleanParam(name: 'BUILD_EXE',     defaultValue: true,  description: '관리 프로그램(Windows exe) 빌드/배포')
    booleanParam(name: 'BUILD_BACKEND', defaultValue: true,  description: '백엔드(Spring Boot) 빌드')
    booleanParam(name: 'DEPLOY_WEB',    defaultValue: true,  description: 'Docker 웹 스택 빌드/배포')
    string(name: 'DEPLOY_HOST', defaultValue: 'was-01', description: 'Docker 배포 대상 호스트(에이전트 라벨 또는 SSH)')
  }

  environment {
    // 설치 앱 자동 업데이트 피드(generic). Jenkins 가 exe/latest.yml 을 이 위치로 배포하고,
    // 설치된 앱은 여기서 새 버전을 확인한다. (사내 웹서버 URL 로 교체)
    UPDATE_FEED_URL = 'https://dist.lhospital.local/smartqnr'
    // exe/latest.yml 을 복사해 둘 배포 디렉터리(위 URL 이 서빙하는 웹 루트)
    UPDATE_FEED_DIR = '/var/www/dist/smartqnr'
  }

  stages {
    // ---------------------------------------------------------------
    stage('프론트 검증(Lint/Build)') {
      agent { label 'linux' }
      tools { nodejs 'node20' } // Jenkins > Global Tool 에 NodeJS 20 등록 필요
      steps {
        checkout scm
        sh 'npm ci'
        sh 'npm run lint'      // tsc --noEmit (타입 검사)
        sh 'npm run build'     // vite 프로덕션 빌드
      }
    }

    // ---------------------------------------------------------------
    stage('빌드 · 패키징') {
      parallel {

        // (1) 관리 프로그램 Windows 설치 파일(.exe)
        stage('Windows 설치파일(exe)') {
          when { expression { return params.BUILD_EXE } }
          agent { label 'windows' }
          tools { nodejs 'node20' }
          steps {
            checkout scm
            bat 'npm ci'
            bat 'npm run build'
            // 자동 업데이트 피드를 generic 으로 지정(app-update.yml 에 기록됨).
            // 업로드는 배포 단계에서 별도로 수행하므로 --publish never.
            bat 'npx electron-builder --win nsis --publish never ' +
                '-c.publish.provider=generic -c.publish.url=%UPDATE_FEED_URL%'
          }
          post {
            success {
              archiveArtifacts artifacts: 'release/*.exe, release/latest.yml, release/*.blockmap',
                               fingerprint: true, onlyIfSuccessful: true
              // 배포 단계에서 쓰도록 산출물 보관
              stash name: 'winRelease', includes: 'release/*.exe, release/latest.yml, release/*.blockmap'
            }
          }
        }

        // (2) 백엔드(Spring Boot) jar
        stage('백엔드(Spring Boot)') {
          when { expression { return params.BUILD_BACKEND } }
          agent { label 'linux' }
          tools { jdk 'jdk21'; maven 'maven3' } // Global Tool 에 JDK21/Maven 등록 필요
          steps {
            checkout scm
            dir('server') {
              sh 'mvn -B -DskipTests clean package'
            }
          }
          post {
            success {
              archiveArtifacts artifacts: 'server/target/*.jar', fingerprint: true
            }
          }
        }
      }
    }

    // ---------------------------------------------------------------
    stage('배포 · 웹 스택(Docker)') {
      when { expression { return params.DEPLOY_WEB } }
      agent { label 'linux' }
      steps {
        checkout scm
        // db + backend + web(nginx) 재빌드 후 무중단에 가깝게 재기동.
        // (DB 볼륨은 유지 — 스키마 변경 시에만 down -v)
        sh 'bash ci/deploy-web.sh'
      }
    }

    // ---------------------------------------------------------------
    stage('배포 · 관리 프로그램 업데이트 피드') {
      when { expression { return params.BUILD_EXE } }
      agent { label 'linux' }
      steps {
        unstash 'winRelease'
        // exe/latest.yml/blockmap 을 업데이트 피드 웹 루트로 복사(electron-updater 가 조회).
        sh '''
          set -e
          mkdir -p "$UPDATE_FEED_DIR"
          cp -f release/*.exe release/latest.yml release/*.blockmap "$UPDATE_FEED_DIR"/
          echo "배포 완료 → $UPDATE_FEED_DIR ($UPDATE_FEED_URL)"
        '''
      }
    }
  }

  post {
    success { echo "SmartQnR 빌드/배포 성공 (build #${env.BUILD_NUMBER})" }
    failure { echo "SmartQnR 빌드/배포 실패 — 콘솔 로그 확인" }
    always  { echo "완료: ${currentBuild.currentResult}" }
  }
}

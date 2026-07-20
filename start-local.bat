@echo off
REM SmartQnR 로컬 실행 (Windows + Docker Desktop)
REM 더블클릭하거나 명령창에서 실행하세요. Docker Desktop 이 실행 중이어야 합니다.
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo [오류] Docker 를 찾을 수 없습니다. Docker Desktop 을 설치하고 실행한 뒤 다시 시도하세요.
  echo        https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

if not exist ".env" (
  echo .env 파일이 없어 .env.example 을 복사합니다. (필요하면 값 수정)
  copy /y ".env.example" ".env" >nul
)

echo.
echo === SmartQnR 로컬 스택 기동 (db + backend + web) ===
docker compose up -d --build
if errorlevel 1 (
  echo [오류] 기동 실패. Docker Desktop 이 켜져 있는지 확인하세요.
  pause
  exit /b 1
)

echo.
echo 완료! 잠시 후(최초 30~60초) 아래 주소로 접속하세요:
echo    웹:     http://localhost:8081
echo    API:    http://localhost:8080/api
echo 로그인: admin / lit123qwe!
echo.
echo 상태 확인:  docker compose ps
echo 중지:      stop-local.bat  (또는 docker compose down)
echo.
timeout /t 8 >nul
start "" http://localhost:8081
pause

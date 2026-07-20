@echo off
chcp 65001 >nul
REM SmartQnR local runner (Windows + Docker Desktop)
REM Double-click to run. Docker Desktop must be running first.
setlocal
cd /d "%~dp0"

where docker >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker not found. Install Docker Desktop and start it, then retry.
  echo         https://www.docker.com/products/docker-desktop/
  pause
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Docker Desktop is not running yet.
  echo         Open Docker Desktop, wait until it says "Running", then run this again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo .env not found - copying from .env.example
  copy /y ".env.example" ".env" >nul
)

echo.
echo === SmartQnR local stack (db + backend + web) ===
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo [ERROR] Startup failed. Common fixes:
  echo   1) Restart Docker Desktop (Quit, then open again).
  echo   2) Run "wsl --shutdown" in PowerShell, then restart Docker Desktop.
  echo   3) Docker Desktop - Settings - Troubleshoot - Clean / Purge data.
  pause
  exit /b 1
)

echo.
echo Done! After ~30-60s (first run may take a few minutes), open:
echo    Web:  http://localhost:8081
echo    API:  http://localhost:8080/api
echo Login: admin / lit123qwe!
echo.
echo Status: docker compose ps
echo Stop:   stop-local.bat  (or docker compose down)
echo.
timeout /t 8 >nul
start "" http://localhost:8081
pause

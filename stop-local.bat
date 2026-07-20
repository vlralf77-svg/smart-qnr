@echo off
chcp 65001 >nul
REM Stop SmartQnR local stack (data volume pgdata is kept)
setlocal
cd /d "%~dp0"
echo === Stopping SmartQnR local stack ===
docker compose down
echo Stopped. (Data kept. To wipe data: docker compose down -v)
pause

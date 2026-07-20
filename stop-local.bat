@echo off
REM SmartQnR 로컬 스택 중지 (데이터 볼륨 pgdata 는 보존됩니다)
setlocal
cd /d "%~dp0"
echo === SmartQnR 로컬 스택 중지 ===
docker compose down
echo 중지되었습니다. (데이터는 보존됨. 완전 삭제는: docker compose down -v)
pause

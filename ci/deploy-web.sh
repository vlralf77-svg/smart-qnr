#!/usr/bin/env bash
# SmartQnR 웹 스택(Docker Compose) 빌드·배포 — Jenkins '배포·웹 스택' 단계에서 호출.
#  db + backend(WAS) + web(nginx) 를 재빌드하고 재기동한다.
#  DB 데이터(볼륨)는 보존한다. 스키마 변경 시에만 RESET_DB=1 로 초기화.
set -euo pipefail

cd "$(dirname "$0")/.."   # 프로젝트 루트

# docker compose v2 우선, 없으면 docker-compose v1
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

echo "[deploy-web] 이미지 빌드…"
$DC build

if [ "${RESET_DB:-0}" = "1" ]; then
  echo "[deploy-web] DB 볼륨 초기화(RESET_DB=1)"
  $DC down -v || true
fi

echo "[deploy-web] 서비스 재기동…"
$DC up -d --remove-orphans

echo "[deploy-web] 상태:"
$DC ps
echo "[deploy-web] 완료"

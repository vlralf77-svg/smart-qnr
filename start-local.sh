#!/usr/bin/env bash
# SmartQnR 로컬 실행 (Mac/Linux + Docker)
set -e
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "[오류] Docker 를 찾을 수 없습니다. Docker Desktop 을 설치·실행 후 다시 시도하세요."
  exit 1
fi

[ -f .env ] || { echo ".env 없어 .env.example 복사"; cp .env.example .env; }

echo "=== SmartQnR 로컬 스택 기동 (db + backend + web) ==="
docker compose up -d --build

echo
echo "완료! 잠시 후 접속:"
echo "   웹:  http://localhost:8081"
echo "   API: http://localhost:8080/api"
echo "로그인: admin / lit123qwe!"
echo "중지: ./stop-local.sh (또는 docker compose down)"

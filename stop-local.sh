#!/usr/bin/env bash
# SmartQnR 로컬 스택 중지 (데이터 볼륨 보존)
set -e
cd "$(dirname "$0")"
echo "=== SmartQnR 로컬 스택 중지 ==="
docker compose down
echo "중지됨. (데이터 보존. 완전 삭제는: docker compose down -v)"

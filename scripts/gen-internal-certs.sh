#!/usr/bin/env bash
# =====================================================================
# SmartQnR 내부 서버 간 통신(HTTPS) 인증서 생성 스크립트
#   대상 구간: nginx(web) → backend(WAS)  [TLS 암호화]
#
#   산출물( ./certs/ 아래 ):
#     - internal-ca.pem        내부 사설 CA 인증서 (nginx 신뢰용, proxy_ssl_trusted_certificate)
#     - internal-ca.key        내부 CA 개인키 (보관/폐기용 — 컨테이너엔 넣지 않음)
#     - backend-keystore.p12   백엔드 TLS 키스토어 (Spring Boot server.ssl.key-store)
#     - backend.crt/backend.key  백엔드 인증서/키 (PEM, 참고용)
#
#   SAN(DNS)에 'backend' 를 넣어 compose 서비스명으로 SNI 검증이 되도록 한다.
#
#   사용:
#     SERVER_SSL_KEY_STORE_PASSWORD=... ./scripts/gen-internal-certs.sh
#   (비밀번호 미지정 시 안전한 랜덤 값을 생성해 출력한다. 운영에선 .env 에 저장할 것)
# =====================================================================
set -euo pipefail

CERT_DIR="${CERT_DIR:-./certs}"
DAYS="${CERT_DAYS:-825}"        # 내부 인증서 유효기간(일)
BACKEND_CN="${BACKEND_CN:-backend}"
KEY_ALIAS="${SERVER_SSL_KEY_ALIAS:-smartqnr-backend}"

# 키스토어 비밀번호: 미지정 시 랜덤 생성
if [[ -z "${SERVER_SSL_KEY_STORE_PASSWORD:-}" ]]; then
  SERVER_SSL_KEY_STORE_PASSWORD="$(openssl rand -base64 24 | tr -d '\n/+=' | cut -c1-24)"
  GENERATED_PW=1
fi

mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

echo "▶ 내부 CA 생성..."
openssl genrsa -out internal-ca.key 4096
openssl req -x509 -new -nodes -key internal-ca.key -sha256 -days "$DAYS" \
  -subj "/C=KR/O=SmartQnR/CN=SmartQnR Internal CA" \
  -out internal-ca.pem

echo "▶ backend 키/CSR 생성 (SAN=DNS:${BACKEND_CN})..."
openssl genrsa -out backend.key 2048
openssl req -new -key backend.key \
  -subj "/C=KR/O=SmartQnR/CN=${BACKEND_CN}" \
  -out backend.csr

cat > backend.ext <<EOF
subjectAltName = DNS:${BACKEND_CN}, DNS:localhost
extendedKeyUsage = serverAuth
EOF

echo "▶ backend 인증서 서명(CA)..."
openssl x509 -req -in backend.csr -CA internal-ca.pem -CAkey internal-ca.key \
  -CAcreateserial -days "$DAYS" -sha256 -extfile backend.ext -out backend.crt

echo "▶ PKCS12 키스토어 생성(backend-keystore.p12, alias=${KEY_ALIAS})..."
openssl pkcs12 -export \
  -inkey backend.key -in backend.crt -certfile internal-ca.pem \
  -name "$KEY_ALIAS" \
  -passout "pass:${SERVER_SSL_KEY_STORE_PASSWORD}" \
  -out backend-keystore.p12

# 정리(중간 산출물)
rm -f backend.csr backend.ext internal-ca.srl

# 컨테이너(비루트 uid 10001)에서 읽을 수 있도록 권한 조정
chmod 644 internal-ca.pem backend-keystore.p12 backend.crt || true
chmod 600 internal-ca.key backend.key || true

echo ""
echo "✅ 완료 — ${CERT_DIR}/ 에 다음 파일 생성:"
echo "   - internal-ca.pem       (nginx 신뢰 CA)"
echo "   - backend-keystore.p12  (backend TLS 키스토어)"
echo ""
if [[ "${GENERATED_PW:-0}" == "1" ]]; then
  echo "⚠ 키스토어 비밀번호(자동 생성). .env 에 아래 값을 저장하세요:"
  echo "   SERVER_SSL_KEY_STORE_PASSWORD=${SERVER_SSL_KEY_STORE_PASSWORD}"
  echo ""
fi
echo "다음 단계: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"

# HTTPS 배포 가이드 (외부 공개 서비스)

외부 사용자가 인터넷으로 접속하는 서비스를 위한 공인 SSL/TLS 적용 절차.
(내부 nginx→backend 구간 TLS 는 `docs/ENV-COMPLIANCE.md` 3-1 및 `scripts/gen-internal-certs.sh` 참고 — 여기서는 **외부 공개용 공인 인증서**를 다룬다.)

## 0. 사전 준비 (공통, 필수)

| 항목             | 내용                                                | 담당           |
| ---------------- | --------------------------------------------------- | -------------- |
| **도메인**       | 예: `qnr.hospital.co.kr`                            | 기관 보유·구매 |
| **공인 IP**      | 서버의 외부 접근 가능한 IP                          | 네트워크팀     |
| **DNS A 레코드** | 도메인 → 공인 IP 연결                               | DNS 관리자     |
| **방화벽 오픈**  | 외부 → 서버 **443**(HTTPS), **80**(리다이렉트/발급) | 네트워크팀     |

> 외부 사용자 브라우저에 경고 없이 자물쇠가 뜨려면 **"도메인 + 그 도메인용 공인 인증서"** 가 반드시 필요하다.
> IP 만으로는 공인 인증서를 받기 어렵고, 자체 서명은 외부 사용자 전원에게 경고가 뜨므로 공개 서비스에 부적합.

## 1. 공통 — nginx 설정

`web/nginx.https.conf` 의 도메인을 실제 값으로 변경:

```nginx
server_name qnr.hospital.co.kr;   # ← 실제 도메인
```

인증서는 `./certs/` 에 두 파일로 배치(운영 compose 가 `/etc/nginx/certs` 로 마운트):

```
certs/fullchain.pem   # 인증서 + 중간체인
certs/privkey.pem     # 개인키
```

---

## 방식 A) Let's Encrypt (무료·자동 갱신) — 권장

무료이며 90일마다 자동 갱신. **서버가 외부에서 80/443 으로 접근 가능해야** 발급된다(도메인 검증).

### A-1. 최초 발급 (certbot)

```bash
# 도메인이 이 서버 공인 IP 로 연결(DNS)되어 있고 80 포트가 열린 상태에서:
docker run -it --rm \
  -p 80:80 \
  -v "$PWD/certs:/etc/letsencrypt" \
  certbot/certbot certonly --standalone \
  -d qnr.hospital.co.kr \
  --email admin@hospital.co.kr --agree-tos --no-eff-email

# 발급물 위치: certs/live/qnr.hospital.co.kr/fullchain.pem, privkey.pem
# nginx 가 참조하는 경로로 연결(심볼릭 링크 또는 복사):
ln -sf live/qnr.hospital.co.kr/fullchain.pem certs/fullchain.pem
ln -sf live/qnr.hospital.co.kr/privkey.pem   certs/privkey.pem
```

### A-2. 스택 기동

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### A-3. 자동 갱신

```bash
# cron 등에 등록(월 1회 권장). 갱신 후 nginx 재적재.
docker run --rm -v "$PWD/certs:/etc/letsencrypt" certbot/certbot renew
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec web nginx -s reload
```

> 운영 파이프라인에 certbot 컨테이너를 상시 포함해 자동화할 수도 있음(요청 시 compose 에 추가).

---

## 방식 B) 상용 CA 인증서 (구매한 파일)

기관이 인증서를 구매했거나 사내 CA 가 발급한 경우.

### B-1. 파일 준비

CA 에서 받은 파일을 아래 형태로 정리:

```
certs/fullchain.pem   # 서버 인증서 + 중간(체인) 인증서를 순서대로 이어붙임
certs/privkey.pem     # 개인키(비밀번호 없는 PEM)
```

- 서버 인증서와 중간 인증서가 따로 왔다면 `cat server.crt intermediate.crt > certs/fullchain.pem` 로 결합.
- 개인키가 `.pfx/.p12` 형식이면 변환:
  `openssl pkcs12 -in cert.pfx -nocerts -nodes -out certs/privkey.pem`
  `openssl pkcs12 -in cert.pfx -clcerts -nokeys -out certs/server.crt`

### B-2. 기동

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### B-3. 갱신

만료 전 새 파일로 `certs/fullchain.pem`·`privkey.pem` 교체 후 nginx 재적재:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec web nginx -s reload
```

---

## 2. 적용 확인

```bash
# 인증서 만료일·발급자 확인
echo | openssl s_client -connect qnr.hospital.co.kr:443 -servername qnr.hospital.co.kr 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates

# HTTP → HTTPS 리다이렉트 확인(301)
curl -I http://qnr.hospital.co.kr
```

브라우저에서 자물쇠 표시 + 경고 없음 + `https://도메인/` 정상 로딩이면 완료.

## 3. 체크리스트

- [ ] 도메인 보유 및 DNS A 레코드 → 서버 공인 IP
- [ ] 방화벽 80/443 오픈
- [ ] `nginx.https.conf` `server_name` = 실제 도메인
- [ ] `certs/fullchain.pem`, `certs/privkey.pem` 배치
- [ ] `docker compose ... -f docker-compose.prod.yml up -d`
- [ ] HTTPS 접속·리다이렉트·인증서 만료일 확인
- [ ] (Let's Encrypt) 자동 갱신 cron 등록

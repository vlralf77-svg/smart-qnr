# 프론트(웹) 이미지 — Vite 빌드 후 nginx 로 서빙
# 컨텍스트는 저장소 루트(프론트 소스 전체 필요)
FROM node:22-alpine AS build
WORKDIR /app
# Electron 바이너리 다운로드 불필요(웹 빌드) — 스킵해 빌드 가속/안정화
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 브라우저에서 API 를 같은 오리진(/api)으로 호출 (nginx 가 백엔드로 프록시)
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# 웹 빌드는 백엔드 연동 활성화(데스크톱 .exe 는 미설정 → localStorage)
ENV VITE_USE_BACKEND=1
RUN npm run build

# nginx 최신 Stable(alpine) — stable 태그로 최신 안정 버전 추종
FROM nginx:stable-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

# SmartQnR 백엔드(WAS) 이미지 — 멀티스테이지 빌드
# 1) Maven 으로 jar 빌드 → 2) JRE 런타임만 담아 경량화
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
# Maven 프로파일 — 기본 oracle: DB 쿼리 연동(병원 Oracle EMR)용 ojdbc11 을 포함한다.
#   드라이버 없이 빌드하려면 --build-arg MAVEN_PROFILES= (빈 값) 으로 넘긴다.
ARG MAVEN_PROFILES=oracle
# 의존성 캐시(레이어 재사용): pom 먼저 복사 후 오프라인 준비
COPY pom.xml .
RUN mvn -q -B ${MAVEN_PROFILES:+-P${MAVEN_PROFILES}} dependency:go-offline
COPY src ./src
RUN mvn -q -B ${MAVEN_PROFILES:+-P${MAVEN_PROFILES}} -DskipTests package

FROM eclipse-temurin:25-jre
WORKDIR /app

# --- OCI 표준 이미지 메타데이터(org.opencontainers.image.*) ---
#   빌드 시 --build-arg 로 주입(compose 에서 전달). 미주입 시 기본값 사용.
ARG APP_VERSION=0.0.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="SmartQnR Server" \
      org.opencontainers.image.description="SmartQnR 병원 문진 백엔드(WAS) — Spring Boot" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/vlralf77-svg/smart-qnr" \
      org.opencontainers.image.vendor="L Hospital" \
      org.opencontainers.image.licenses="Proprietary" \
      org.opencontainers.image.base.name="docker.io/library/eclipse-temurin:25-jre"

# 최소 권한 원칙(Non-root user) — 컨테이너 프로세스가 루트로 실행되지 않도록 전용 사용자 생성
RUN groupadd -r app && useradd -r -g app -u 10001 app
# 빌드 산출물 jar 복사(소유권을 비루트 사용자로)
COPY --from=build --chown=app:app /app/target/smartqnr-server-*.jar app.jar
USER 10001
EXPOSE 8080
# JVM 컨테이너 메모리 인식 + 실행
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

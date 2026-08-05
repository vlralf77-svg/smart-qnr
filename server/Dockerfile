# SmartQnR 백엔드(WAS) 이미지 — 멀티스테이지 빌드
# 1) Maven 으로 jar 빌드 → 2) JRE 런타임만 담아 경량화
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
# 의존성 캐시(레이어 재사용): pom 먼저 복사 후 오프라인 준비
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:25-jre
WORKDIR /app
# 최소 권한 원칙(Non-root user) — 컨테이너 프로세스가 루트로 실행되지 않도록 전용 사용자 생성
RUN groupadd -r app && useradd -r -g app -u 10001 app
# 빌드 산출물 jar 복사(소유권을 비루트 사용자로)
COPY --from=build --chown=app:app /app/target/smartqnr-server-*.jar app.jar
USER 10001
EXPOSE 8080
# JVM 컨테이너 메모리 인식 + 실행
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

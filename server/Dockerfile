# SmartQnR 백엔드(WAS) 이미지 — 멀티스테이지 빌드
# 1) Maven 으로 jar 빌드 → 2) JRE 런타임만 담아 경량화
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# 의존성 캐시(레이어 재사용): pom 먼저 복사 후 오프라인 준비
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
# 빌드 산출물 jar 복사
COPY --from=build /app/target/smartqnr-server-*.jar app.jar
EXPOSE 8080
# JVM 컨테이너 메모리 인식 + 실행
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]

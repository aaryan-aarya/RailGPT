FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S railgpt && adduser -S railgpt -G railgpt \
    && apk add --no-cache curl
WORKDIR /app
COPY --from=build --chown=railgpt:railgpt /workspace/target/irctc-backend-1.0.0.jar /app/app.jar
USER railgpt
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8081/actuator/health/readiness >/dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN useradd --system --uid 10001 appuser
COPY --from=build --chown=10001:10001 /build/target/zhixu-backend-0.1.0.jar /app/app.jar
USER 10001
ENV SPRING_PROFILES_ACTIVE=production
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0 -XX:+ExitOnOutOfMemoryError"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

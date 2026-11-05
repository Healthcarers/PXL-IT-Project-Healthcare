# ==============================================================================
# Stage 1: Build the Spring Boot Application
# ==============================================================================
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# Copy Maven wrapper configuration and descriptor
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Grant execution permissions to Maven wrapper
RUN chmod +x mvnw

# Download dependencies for layer caching
RUN ./mvnw dependency:go-offline -B

# Copy application source code
COPY src ./src

# Package application into an executable jar skipping tests
RUN ./mvnw clean package -DskipTests

# ==============================================================================
# Stage 2: Minimal Runtime Environment
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine

# Security best practice: Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Download Microsoft Application Insights Java agent
# Note: GitHub release assets are version-tagged (applicationinsights-agent-<version>.jar)
ARG APPLICATIONINSIGHTS_VERSION=3.7.10
RUN wget -q -O /app/applicationinsights-agent.jar \
    https://github.com/microsoft/ApplicationInsights-Java/releases/download/${APPLICATIONINSIGHTS_VERSION}/applicationinsights-agent-${APPLICATIONINSIGHTS_VERSION}.jar

# Copy built jar from the build stage
COPY --from=build /app/target/*.jar /app/app.jar

# Set correct ownership for non-root execution
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8090

ENTRYPOINT ["java", "-javaagent:/app/applicationinsights-agent.jar", "-jar", "/app/app.jar"]

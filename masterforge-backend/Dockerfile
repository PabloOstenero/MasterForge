# Stage 1: Compile the Kotlin backend using a lightweight Gradle JDK 17 container
FROM gradle:8.5-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN ./gradlew build -x test --no-daemon

# Stage 2: Create the final lightweight runtime container
FROM eclipse-temurin:17-jre
EXPOSE 8080

# Copy the compiled jar from the build stage
COPY --from=build /home/gradle/src/build/libs/masterforge-backend-0.0.1-SNAPSHOT.jar /app/masterforge-backend.jar

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "/app/masterforge-backend.jar"]

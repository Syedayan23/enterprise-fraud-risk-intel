FROM openjdk:17-slim

WORKDIR /app

# Copy source and libs
COPY src ./src
COPY lib ./lib

# Compile
# Ensure bin directory exists
RUN mkdir bin
RUN javac -cp "lib/*:src" -d bin src/*.java

# Runtime Env
ENV DB_PATH=/data/fraud_platform.db

# Run
# Classpath includes lib jars and compiled classes
CMD ["java", "-cp", "lib/*:bin", "src.RiskApiServer"]

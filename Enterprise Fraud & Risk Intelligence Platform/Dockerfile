# Base Image: Use a full Linux distro to easily install multiple runtimes
FROM ubuntu:22.04

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install Dependencies (Java 17, Python 3, Nginx, Supervisor)
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk-headless \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    supervisor \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 2. Setup Working Directories
WORKDIR /app
RUN mkdir -p /app/java /app/python /app/frontend /data

# 3. Setup Frontend (Nginx)
# Remove default Nginx site
RUN rm /etc/nginx/sites-enabled/default
# Copy custom Nginx config
COPY nginx_antigravity.conf /etc/nginx/sites-enabled/default
# Copy Static Files
COPY web_dashboard/Dashboard /app/frontend

# 4. Setup Backend (Java)
COPY java_app/src /app/java/src
COPY java_app/lib /app/java/lib
WORKDIR /app/java
RUN mkdir bin
# Compile Java
RUN javac -cp "lib/*:src" -d bin src/*.java

# 5. Setup Risk Engine (Python)
WORKDIR /app/python
COPY python_engine/requirements.txt .
# Install Python deps globally (managed container)
RUN pip3 install --no-cache-dir -r requirements.txt
COPY python_engine/app.py .
COPY python_engine/risk_engine.py .

# 6. Setup Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 7. Final Configuration
EXPOSE 80 443
VOLUME /data

# Start Supervisor (which starts Nginx, Java, Python)
CMD ["/usr/bin/supervisord"]

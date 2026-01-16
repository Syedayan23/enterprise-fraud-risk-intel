FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install flask

# Copy source code
COPY . .

# Environment setup
ENV DOCKER_ENV=true
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["python", "app.py"]

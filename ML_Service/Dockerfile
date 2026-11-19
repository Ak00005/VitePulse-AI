# ==============================================================================
# VitaPulse AI — Standalone ML Inference Service Dockerfile
# Optimized for Render, Railway, Google Cloud Run, AWS App Runner, or Fly.io
# ==============================================================================

FROM python:3.12-slim

WORKDIR /app

# Install system build dependencies for C++ extensions if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy service source and model artifacts
COPY main.py ./
COPY models/ ./models/

# Default environment variables
ENV PORT=8000 \
    HOST=0.0.0.0

EXPOSE 8000

# Healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:' + str(8000) + '/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# ==============================================================================
# VitaPulse AI — Multi-Stage Production Dockerfile
# Provides a self-contained, reproducible container for the full-stack app
# (React 19 Frontend + Express Node.js Backend + Scikit-Learn/SHAP ML Pipeline)
#
# NOTE: The primary production deployment target for VitaPulse AI is Vercel
# Serverless Functions (see VERCEL_DEPLOYMENT.md). This Dockerfile provides an
# alternative, fully containerized target for local testing, CI/CD, or container clouds.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the React 19 Frontend
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/Frontend/lifestyleprediction

# Install frontend dependencies
COPY Frontend/lifestyleprediction/package*.json ./
RUN npm ci

# Copy frontend source and build static bundle
COPY Frontend/lifestyleprediction/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Full-Stack Runtime (Node.js 20 + Python 3)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

# Install system Python 3, pip, and venv for ML inference & SHAP
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create a virtual environment for Python packages to adhere to PEP 668
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python ML dependencies
COPY ML_Service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend application source
COPY Backend/ ./Backend/

# Copy Vercel API and model artifacts
COPY api/ ./api/
COPY ML_Model/Results/ ./ML_Model/Results/

# Copy compiled frontend from Stage 1 into the location served by Express
COPY --from=frontend-builder /app/Frontend/lifestyleprediction/dist ./Frontend/lifestyleprediction/dist

# Expose standard production port
EXPOSE 5000

# Set environment variables for production execution (NO SECRETS HARDCODED)
ENV PORT=5000 \
    NODE_ENV=production \
    PYTHON_PATH=/opt/venv/bin/python

# Healthcheck probe to verify service readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the unified Node.js server (serves React frontend + Express API + ML Inference)
CMD ["node", "Backend/index.js"]


# VitaPulse AI — Python ML Service Deployment Guide

This guide documents how to deploy the decoupled **VitaPulse AI Python Machine Learning & SHAP Service** (`ML_Service/`) independently from the Vercel Node.js frontend and API.

---

## 1. Overview & Architecture

To overcome Vercel's 225 MB uncompressed serverless bundle limit (caused by heavy scientific libraries `scipy`, `scikit-learn`, and `shap`), the Python ML inference runtime has been separated into an independent, high-performance **FastAPI microservice**:

```
[ User Browser ]
       │
       │ 1. Submits assessment (/api/predict)
       ▼
[ Vercel Edge / Node.js Express Backend ]
       │
       │ 2. Extracts JWT, estimates clinical vitals
       │ 3. HTTP POST to ${ML_SERVICE_URL}/predict
       ▼
[ Standalone Python ML Service (Render / Railway / Cloud Run) ]
       │
       │ 4. Executes Gradient Boosting + SHAP TreeExplainer
       │ 5. Returns prediction, risk score, SHAP factors, recommendations
       ▼
[ Vercel Node.js Backend ]
       │
       │ 6. Persists assessment to MongoDB Atlas (if authenticated)
       │ 7. Returns standardized response to browser
       ▼
[ React 19 Frontend Dashboard ]
```

### Key Security & Isolation Benefits
* **No Database or Auth Secrets in ML Service**: The Python service is 100% stateless. It does not require MongoDB credentials, JWT secrets, or Gemini API keys.
* **Fast Startup & Low Latency**: Pre-warms the model and SHAP TreeExplainer at startup, enabling inference responses in **< 15ms**.
* **Zero Vercel Bundle-Size Failures**: Vercel now exclusively packages the Node.js API and static React frontend, deploying in under 30 seconds.

---

## 2. Service Endpoints

| HTTP Method | Route | Description | Expected Payload | Response |
|---|---|---|---|---|
| `GET` | `/health` | Lightweight healthcheck probe | None | `{"status": "ok"}` |
| `GET` | `/` | Service info and index | None | Service status and endpoint guide |
| `POST` | `/predict` | Model inference & SHAP explanation | Lifestyle JSON object | Complete standardized prediction payload |

---

## 3. Local Development & Testing

### Step 1: Install Dependencies
```bash
cd ML_Service
pip install -r requirements.txt
```

### Step 2: Start the Service
```bash
# Starts on http://0.0.0.0:8000
python main.py
# or using uvicorn directly:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Verify with Curl or Browser
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

---

## 4. Production Deployment Options

You can deploy `ML_Service/` to any Python-compatible cloud or container platform. Recommended options:

### Option A: Render (Easiest & Free Tier Available)

1. Sign up / Log in to [Render](https://render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`Ak00005/VitePulse-AI`).
4. Configure the service:
   - **Name**: `vitapulse-ml-service`
   - **Root Directory**: `ML_Service`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **Deploy Web Service**.
6. Copy your public service URL (e.g. `https://vitapulse-ml-service.onrender.com`).

---

### Option B: Railway

1. Log in to [Railway](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select `VitePulse-AI`.
4. In Settings:
   - Set **Root Directory** to `/ML_Service`.
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Under **Networking**, click **Generate Domain**.
6. Copy the generated domain (e.g. `https://vitapulse-ml-production.up.railway.app`).

---

### Option C: Docker / Google Cloud Run / AWS App Runner

`ML_Service/Dockerfile` is already pre-configured:
```bash
cd ML_Service
docker build -t vitapulse-ml:latest .
docker run -p 8000:8000 vitapulse-ml:latest
```

---

## 5. Connecting the ML Service to Vercel

Once your Python ML Service is deployed and has a public URL:

1. Open your project on the [Vercel Dashboard](https://vercel.com/).
2. Navigate to **Settings** → **Environment Variables**.
3. Add a new variable:
   - **Key**: `ML_SERVICE_URL`
   - **Value**: `https://<your-deployed-ml-service-url>` (e.g. `https://vitapulse-ml-service.onrender.com`)
   - **Environments**: Check `Production`, `Preview`, and `Development`.
4. Click **Save** and trigger a **Redeploy** on Vercel.

---

## 6. Verification Checklist

- [ ] `GET https://<your-ml-service>/health` returns `{"status":"ok"}`.
- [ ] In Vercel Project Settings, `ML_SERVICE_URL` is set to the ML service base URL.
- [ ] Submitting an assessment from the React frontend returns the predicted risk score, gauge, and SHAP factors without errors.
- [ ] Signed-in users see the assessment saved to their MongoDB profile history.

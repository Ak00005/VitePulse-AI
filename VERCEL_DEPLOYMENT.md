# VitaPulse AI — Vercel Public Production Deployment Guide

This document provides complete instructions for deploying the **VitaPulse AI — Lifestyle-Based Health Outcome Prediction** full-stack application to **Vercel**.

---

## 1. Final Project Architecture

The application is deployed as a unified, production-grade serverless application on Vercel:

```
                            ┌───────────────────────────────────────────────┐
                            │               USER WEB BROWSER                │
                            └───────────────────────┬───────────────────────┘
                                                    │
                                                    ▼
                            ┌───────────────────────────────────────────────┐
                            │            VERCEL GLOBAL EDGE / CDN           │
                            └───────┬───────────────────────────────┬───────┘
                                    │                               │
        Static SPA Route            │                               │ API Requests
        (/, /assets/*)              │                               │ (/api/*)
                                    ▼                               ▼
    ┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐
    │          REACT 19 + VITE SPA           │  │          VERCEL REWRITE ROUTER         │
    │   Frontend/lifestyleprediction/dist    │  └───────┬────────────────────────┬───────┘
    └────────────────────────────────────────┘          │                        │
                                                        │ /api/predict           │ /api/auth/*
                                                        │                        │ /api/assessments/*
                                                        │                        │ /api/chat
                                                        │                        │ /api/health
                                                        ▼                        ▼
                                    ┌───────────────────────┐  ┌─────────────────────────┐
                                    │ VERCEL PYTHON RUNTIME │  │   VERCEL NODE RUNTIME   │
                                    │    (@vercel/python)   │  │      (@vercel/node)     │
                                    │    [api/predict.py]   │  │      [api/index.js]     │
                                    └───────────┬───────────┘  └────────────┬────────────┘
                                                │                           │
                                                ├──────────────┐            │
                                                ▼              ▼            ▼
                                    ┌───────────────────────┐  ┌─────────────────────────┐
                                    │ SCIKIT-LEARN + SHAP   │  │   MONGODB ATLAS CLOUD   │
                                    │ - Gradient Boosting   │  │   - Users & Auth        │
                                    │ - TreeExplainer       │  │   - Assessment History  │
                                    │ - Clinical Estimator  │  │   - Comparison Records  │
                                    │ - Recommendations     │  └─────────────────────────┘
                                    └───────────────────────┘               ▲
                                                                            │ (Gemini AI API)
                                                               ┌────────────┴────────────┐
                                                               │  Google Gemini 2.5/Flash │
                                                               │  (VitaPulse Assistant)  │
                                                               └─────────────────────────┘
```

---

## 2. What Was Changed & Configured

1. **Vercel Serverless Python Function (`api/predict.py`)**:
   - Replaced fragile child-process spawning (`spawn('python')`) on the serverless host with a native Vercel Python Function (`@vercel/python`).
   - Preserved the exact trained Gradient Boosting model (`best_model.pkl`), LabelEncoders, deterministic clinical vitals derivation, SHAP TreeExplainer, top risk drivers, top protective factors, and personalized recommendations.
   - Integrated optional JWT extraction and direct MongoDB Atlas assessment persistence when users are signed in.
   - Returns the exact JSON structure expected by `PredictionResults.jsx` and `App.jsx`.

2. **Model Packaging (`api/models/`)**:
   - Copied the compact trained artifacts (`best_model.pkl` [140 KB], `gender_encoder.pkl`, `target_encoder.pkl`, `model_comparison.csv`) directly into `api/models/` to ensure Vercel packages them with zero filesystem path issues on Linux.

3. **Node.js Express Serverless Entrypoint (`api/index.js`)**:
   - Exported the existing Express application as a Vercel Serverless Function without breaking local development (`require.main === module` check).
   - Preserved all routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/assessments`, `/api/assessments/:id`, `/api/chat`, `/api/health`, and `/api/model/insights`.

4. **Serverless MongoDB Connection Pooling (`Backend/Dbconnection.js`)**:
   - Implemented connection promise caching on `global.mongoose` to prevent connection spikes and memory exhaustion across serverless warm invocations.
   - Added support for standard `MONGODB_URI` alongside `MONGO_URI`.

5. **Environment-Aware CORS (`Backend/index.js`)**:
   - Replaced wildcard `*` with dynamic origin resolution supporting `localhost`, custom production domains (`FRONTEND_URL`), and Vercel preview environments (`*.vercel.app`).

6. **Frontend Central API Client (`Frontend/lifestyleprediction/src/utils/api.js`)**:
   - Created `getApiUrl()` utility supporting both unified relative routing (`/api/...`) and decoupled external backend deployments (`VITE_API_URL`).
   - Updated `App.jsx`, `AuthModal.jsx`, `HistoryView.jsx`, `AssessmentComparison.jsx`, and `VitaPulseAssistant.jsx`.

7. **Vercel Configuration (`vercel.json`)**:
   - Configured build commands, function timeouts, and precise route rewrites directing `/api/predict` to Python and all other `/api/*` requests to Express.

8. **Security & Deployment Ignores (`.gitignore` & `.vercelignore`)**:
   - Created root `.gitignore` preventing accidental commitment of `.env`, secrets, node_modules, and training datasets.
   - Created `.vercelignore` excluding non-runtime artifacts (12.7 MB raw CSV training datasets, reports, PDFs, notebook images) to keep serverless bundles lightweight and rapid.

---

## 3. Required Environment Variables

Configure the following variables in the **Vercel Project Dashboard** under **Settings → Environment Variables**:

| Variable Name | Purpose | Target Environment | Secret or Public? |
|---|---|---|---|
| `MONGODB_URI` | MongoDB Atlas database connection string | Production, Preview, Development | **Secret** |
| `JWT_SECRET` | Cryptographic secret for signing and validating auth tokens | Production, Preview, Development | **Secret** |
| `GEMINI_API_KEY` | Google Gemini API key for VitaPulse Assistant chatbot | Production, Preview, Development | **Secret** |
| `FRONTEND_URL` | *(Optional)* Custom domain if not using default Vercel domain | Production | Public |
| `VITE_API_URL` | *(Optional)* External API domain if frontend is decoupled | Production, Preview, Development | Public |

> [!IMPORTANT]
> Never prefix backend secrets (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`) with `VITE_`. Doing so would expose private database and API keys in client JavaScript bundles!

---

## 4. Vercel Project Settings

When creating a new project on Vercel:

1. **Framework Preset**: Select **Vite** (or **Other**).
2. **Root Directory**: Leave as `./` (project root).
3. **Build & Development Settings**:
   - **Build Command**: `npm --prefix Frontend/lifestyleprediction run build`
   - **Output Directory**: `Frontend/lifestyleprediction/dist`
   - **Install Command**: `npm install` (the root `postinstall` script automatically installs frontend dependencies).
4. **Node.js Version**: **20.x** or **22.x** (Vercel Project Settings → General).

---

## 5. API Route Structure on Vercel

| HTTP Method | Route | Handled By | Runtime | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | `api/index.js` | Node.js | Service probe and timestamp |
| `POST` | `/api/predict` | `api/predict.py` | Python 3.12 | Gradient Boosting inference + SHAP TreeExplainer + optional DB save |
| `POST` | `/api/auth/register` | `api/index.js` | Node.js | User registration with hashed password & JWT generation |
| `POST` | `/api/auth/login` | `api/index.js` | Node.js | User sign-in & JWT generation |
| `GET` | `/api/auth/me` | `api/index.js` | Node.js | Current authenticated user profile |
| `GET` | `/api/assessments` | `api/index.js` | Node.js | Authenticated user assessment history |
| `GET` | `/api/assessments/:id` | `api/index.js` | Node.js | Specific assessment detail |
| `DELETE` | `/api/assessments/:id` | `api/index.js` | Node.js | Delete user's own assessment |
| `POST` | `/api/chat` | `api/index.js` | Node.js | VitaPulse Assistant (Gemini AI + tool calling + fallback) |
| `GET` | `/api/model/insights` | `api/index.js` | Node.js | Research benchmarks & global feature importance |
| `GET` | `/*` | `dist/index.html` | Edge Static | Single Page Application (React) |

---

## 6. MongoDB Atlas Configuration

1. In MongoDB Atlas, go to **Network Access** → **IP Access List**.
2. Add `0.0.0.0/0` (Allow access from anywhere).
   > *Note: Vercel serverless functions use dynamic IP addresses. MongoDB Atlas requires either allowing all IPs (`0.0.0.0/0`) or configuring an Atlas Peering connection.*
3. Ensure the database user has `readWrite` permissions on the database.
4. Set the connection string format as:
   `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/lifestyle_ai?retryWrites=true&w=majority`

---

## 7. Local Testing Commands

### Run Full-Stack Locally:
```bash
# Terminal 1: Start Backend (Port 5000)
npm run dev:backend

# Terminal 2: Start Frontend (Port 5173 with Vite /api proxy)
npm run dev:frontend
```

### Test Python Prediction Function Directly:
```bash
python api/predict.py
```

### Test Production Frontend Build Locally:
```bash
npm run build
npm --prefix Frontend/lifestyleprediction run preview
```

---

## 8. Deployment Commands

### Option A: Deploy via Vercel CLI (Recommended for fast deployment)

1. Install the Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to your Vercel account:
   ```bash
   vercel login
   ```

3. Deploy to Preview:
   ```bash
   vercel
   ```
   - *Link to existing project?* **No** (for first deploy)
   - *What's your project's name?* **vitapulse-ai**
   - *In which directory is your code located?* **./**
   - *Want to modify settings?* **No**

4. Set Environment Variables on Vercel:
   ```bash
   vercel env add MONGODB_URI production
   vercel env add JWT_SECRET production
   vercel env add GEMINI_API_KEY production
   ```

5. Deploy to Production:
   ```bash
   vercel --prod
   ```

### Option B: Deploy via GitHub / GitLab / Bitbucket

1. Initialize git and commit your project:
   ```bash
   git init
   git add .
   git commit -m "Prepare VitaPulse AI for production deployment on Vercel"
   ```
2. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/vitapulse-ai.git
   git branch -M main
   git push -u origin main
   ```
3. Open [https://vercel.com/new](https://vercel.com/new) and import the repository.
4. Add the 3 environment variables: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`.
5. Click **Deploy**.

---

## 9. Production Testing Checklist

After deployment to Vercel, verify each of the following in your live deployment URL:

- [ ] **Landing Page**: App loads with clean dark glassmorphism styling and no visual glitches.
- [ ] **Health Check**: Visiting `https://<your-app>.vercel.app/api/health` returns `{"status": "online"}`.
- [ ] **Guest Assessment**: Complete an assessment without signing in; verify the risk score gauge, SHAP waterfall explanation, risk drivers, and personalized recommendations render properly.
- [ ] **User Registration**: Create a new account through the modal; verify the JWT is stored in `localStorage` and the user profile displays in the navigation bar.
- [ ] **Authenticated Assessment**: Submit an assessment while signed in; verify it confirms `Assessment saved to your profile`.
- [ ] **Assessment History**: Navigate to **Assessment History**; verify the saved assessment card appears with accurate risk level and score.
- [ ] **Assessment Comparison**: Navigate to **Assessment Comparison**; verify previous and current assessments can be selected and compared side-by-side with delta indicators.
- [ ] **VitaPulse Assistant**: Open the assistant tab and ask *"Summarize my latest assessment"*; verify the assistant correctly executes the tool and replies with your data.
- [ ] **Responsive Navigation**: Test switching between tabs on desktop and mobile viewports.

---

## 10. Common Errors and Fixes

| Issue | Root Cause | Solution |
|---|---|---|
| **MongoDB connection timeout (`MongoServerSelectionError`)** | MongoDB Atlas IP whitelist blocks Vercel serverless IPs | In MongoDB Atlas → Network Access, add `0.0.0.0/0` (Allow Access from Anywhere). |
| **Prediction returns 500 (`ModuleNotFoundError: No module named 'sklearn'`)** | Missing Python packages in Vercel build | Ensure `requirements.txt` is present at the repository root with exact pinned versions. |
| **`404 NOT_FOUND` on refreshing subpaths** | Client-side routing rewrite missing | Ensure `vercel.json` includes `{"source": "/(.*)", "destination": "/index.html"}`. |
| **Assistant replies with generic fallback** | Missing or invalid `GEMINI_API_KEY` | Set `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables and redeploy. |
| **CORS error in browser console** | Custom domain mismatch | Add your domain to `FRONTEND_URL` environment variable in Vercel. |
| **Function execution timeout** | Cold start with SHAP tree initialization or complex LLM calls | `api/predict.py` is configured with `maxDuration: 60` and `api/index.js` with `maxDuration: 30` in `vercel.json`. Once warmed, inference completes in < 250ms. |


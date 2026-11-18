# 🩺 VitaPulse AI — Lifestyle-Based Health Outcome Prediction using Explainable AI (XAI)

An end-to-end full-stack Machine Learning web application that predicts individual chronic disease risks based on lifestyle, dietary, and physiological vitals. The application integrates **Explainable AI (SHAP)** with a **Scikit-Learn Gradient Boosting** model, delivered through a modern **React** frontend, a scalable **Node.js/Express** backend, and **MongoDB** database persistence.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Lucide React, Modern Vanilla CSS Design System |
| **Backend** | Node.js, Express 5, Mongoose, JWT, Bcrypt.js, Child Process Bridge |
| **Database** | MongoDB (Assessment logs, user authentication, patient histories) |
| **Machine Learning** | Python 3.12, Scikit-Learn (Gradient Boosting), SHAP (`TreeExplainer`), Joblib, Pandas, NumPy |

---

## 📊 ML Model Analysis & Research Findings

Based on the analysis of the `ML_Model` folder and Jupyter Notebook:

### 1. Dataset Characteristics
- **Dataset Size:** ~100,000 multimodal health and lifestyle records.
- **Target Variable:** `disease_risk` (Binary: `0` = Low Risk / Healthy, `1` = Elevated Chronic Disease Risk).
- **Features Evaluated (15):**
  1. `age`: Chronological age (years)
  2. `gender`: Biological sex (Encoded via LabelEncoder)
  3. `bmi`: Body Mass Index ($kg/m^2$)
  4. `daily_steps`: Daily physical activity step volume
  5. `sleep_hours`: Circadian rest duration (hours/night)
  6. `water_intake_l`: Daily hydration volume (Liters)
  7. `calories_consumed`: Total daily dietary intake (kcal)
  8. `smoker`: Active tobacco smoking status ($0$ = No, $1$ = Yes)
  9. `alcohol`: Regular alcohol consumption ($0$ = No, $1$ = Yes)
  10. `resting_hr`: Resting heart rate (beats per minute)
  11. `systolic_bp`: Arterial pressure during cardiac contraction (mmHg)
  12. `diastolic_bp`: Arterial pressure during cardiac rest (mmHg)
  13. `cholesterol`: Total serum cholesterol concentration (mg/dL)
  14. `family_history`: Genetic predisposition ($0$ = No, $1$ = Yes)
  15. `id`: Record index

### 2. Evaluated Algorithm Benchmarks
From `ML_Model/Results/model_comparison.csv`:

| Rank | Model | Accuracy | Precision | Recall | F1-Score | Status |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| 🥇 | **Gradient Boosting** | **75.18%** | 0.565 | 0.752 | **0.645** | **Selected & Deployed** |
| 🥈 | Random Forest | 75.17% | 0.565 | 0.752 | 0.645 | Evaluated |
| 🥉 | Extra Trees Classifier | 75.17% | 0.627 | 0.752 | 0.645 | Evaluated |
| 4 | CatBoost | 75.15% | 0.648 | 0.751 | 0.646 | Evaluated |
| 5 | Multi-Layer Perceptron (MLP) | 75.11% | 0.580 | 0.751 | 0.645 | Evaluated |
| 6 | XGBoost | 74.70% | 0.623 | 0.747 | 0.647 | Evaluated |

**Gradient Boosting** achieved the top test classification performance and was persisted (`best_model.pkl`) alongside encoders (`gender_encoder.pkl`, `target_encoder.pkl`).

### 3. Explainable AI (XAI) with SHAP
- **Local Feature Attribution:** Uses `shap.TreeExplainer` on the deployed ensemble to compute individual Shapley values for each prediction.
- **Risk Drivers vs. Protective Strengths:** Differentiates factors that elevate disease probability (positive SHAP) from factors that protect the patient (negative SHAP).
- **Top Global Drivers:** Daily steps (18.7%), caloric intake (12.6%), BMI (10.6%), and systolic blood pressure (10.2%).

---

## 🏛 Architecture & Project Structure

```
HCI_Project/
├── Backend/
│   ├── .env                    # Environment variables (PORT=5000, MONGO_URI, JWT_SECRET)
│   ├── Dbconnection.js         # Mongoose MongoDB connection
│   ├── index.js                # Express app entrypoint & middleware
│   ├── ml_bridge.py            # High-performance Python inference & SHAP pipeline
│   ├── models/
│   │   ├── AssessmentSchema.js # MongoDB schema for assessment history & SHAP factors
│   │   └── UserSchema.js       # MongoDB schema with bcrypt password hashing
│   ├── Routes/
│   │   ├── AuthRoutes.js       # /api/auth/register, /api/auth/login, /api/auth/me
│   │   └── PredictRoutes.js    # /api/predict, /api/assessments, /api/model/insights
│   └── package.json
│
├── Frontend/
│   └── lifestyleprediction/
│       ├── src/
│       │   ├── App.jsx         # Main application orchestrator & tab routing
│       │   ├── index.css       # Bespoke dark glassmorphism design system
│       │   ├── components/
│       │   │   ├── Navbar.jsx           # Sticky navigation, status indicator & user modal
│       │   │   ├── PredictorForm.jsx    # 15-parameter input form with clinical presets
│       │   │   ├── PredictionResults.jsx# Risk meter, SHAP waterfall & recommendations
│       │   │   ├── ModelBenchmarks.jsx  # Research leaderboard & feature importance hub
│       │   │   ├── HistoryView.jsx      # Historical evaluations loaded from MongoDB
│       │   │   └── AuthModal.jsx        # Login/Register modal
│       ├── vite.config.js      # Vite config with /api proxy to localhost:5000
│       └── package.json
│
├── ML_Model/
│   ├── Dataset/                # CSV datasets (100k records, obesity, sleep, health)
│   ├── Images/                 # EDA plots, correlation heatmaps, SHAP summary plots
│   ├── Notebook/               # Google Colab / Jupyter research notebook
│   └── Results/                # Serialized model (.pkl) & comparison tables (.csv)
│
└── package.json                # Root package orchestration scripts
```

---

## 🚀 How to Run the Application

### Prerequisites
1. **Node.js** (v18+)
2. **Python** (v3.10+) with required libraries:
   ```bash
   pip install scikit-learn shap joblib pandas numpy
   ```
3. **MongoDB** running locally on default port `27017` (e.g., `mongodb://127.0.0.1:27017/lifestyle_ai`).

---

### Step 1: Start the Express Backend

```bash
cd Backend
npm install
npm start
```
*The Backend will start on port `5000` and automatically connect to MongoDB.*

---

### Step 2: Start the React Frontend

Open a new terminal window:
```bash
cd Frontend/lifestyleprediction
npm install
npm run dev
```
*The Frontend will launch at `http://localhost:5173/`.*

---

## 🌐 API Reference

### 1. `POST /api/predict`
Calculates disease risk probability and generates SHAP explanations.
- **Request Body:**
  ```json
  {
    "age": 45,
    "gender": "Male",
    "bmi": 28.5,
    "daily_steps": 5000,
    "sleep_hours": 6.0,
    "water_intake_l": 2.0,
    "calories_consumed": 2600,
    "smoker": 1,
    "alcohol": 1,
    "resting_hr": 85,
    "systolic_bp": 135,
    "diastolic_bp": 88,
    "cholesterol": 220,
    "family_history": 1
  }
  ```
- **Response:**
  - `disease_risk_detected`: boolean
  - `risk_score`: percentage ($0-100\%$)
  - `risk_level`: `"Low Risk"`, `"Moderate Risk"`, `"High Risk"`
  - `shap_factors`: Array of local SHAP attributions for each feature
  - `top_risk_drivers`: Top variables driving risk upwards
  - `top_protective_factors`: Top variables driving risk downwards
  - `recommendations`: Evidence-backed clinical and lifestyle interventions
  - `assessmentId`: Saved MongoDB record ID

### 2. `GET /api/assessments`
Retrieves chronological assessment history from MongoDB.

### 3. `DELETE /api/assessments/:id`
Deletes a specific assessment record.

### 4. `GET /api/model/insights`
Returns benchmark stats for the 6 evaluated ML algorithms, global feature importance distributions, and dataset metadata.

### 5. `POST /api/auth/register` & `POST /api/auth/login`
User registration and authentication returning a JWT bearer token.

---

## 📄 License
This project is open-source under the MIT License.

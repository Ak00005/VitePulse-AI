"""
VitaPulse AI — Standalone Python Machine Learning Inference & SHAP Service
Decoupled microservice for Gradient Boosting disease risk prediction and Explainable AI.

Endpoints:
  GET  /health   -> Healthcheck probe
  POST /predict  -> Executes ML model inference + SHAP TreeExplainer explanations
"""

import os
import sys
import warnings
from typing import Dict, Any
from contextlib import asynccontextmanager

warnings.filterwarnings('ignore')

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

# ==================== MODEL ARTIFACT LOADER ====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_PATHS = [
    os.path.join(BASE_DIR, 'models'),
    os.path.join(BASE_DIR, '..', 'api', 'models'),
    os.path.join(BASE_DIR, '..', 'ML_Model', 'Results'),
    os.path.join(BASE_DIR, 'ML_Model', 'Results')
]

_cached_model = None
_cached_gender_enc = None
_cached_target_enc = None
_cached_explainer = None
_cached_base_value = 0.0

def load_artifacts():
    global _cached_model, _cached_gender_enc, _cached_target_enc, _cached_explainer, _cached_base_value
    if _cached_model is not None:
        return _cached_model, _cached_gender_enc, _cached_target_enc

    model_dir = None
    for p in POSSIBLE_PATHS:
        if os.path.exists(os.path.join(p, 'best_model.pkl')):
            model_dir = p
            break

    if not model_dir:
        raise FileNotFoundError(
            f"Model artifacts (best_model.pkl) not found. Checked: {POSSIBLE_PATHS}"
        )

    model_path = os.path.join(model_dir, 'best_model.pkl')
    gender_path = os.path.join(model_dir, 'gender_encoder.pkl')
    target_path = os.path.join(model_dir, 'target_encoder.pkl')

    _cached_model = joblib.load(model_path)
    _cached_gender_enc = joblib.load(gender_path) if os.path.exists(gender_path) else None
    _cached_target_enc = joblib.load(target_path) if os.path.exists(target_path) else None

    # Pre-initialize SHAP TreeExplainer once at startup
    if HAS_SHAP and _cached_explainer is None:
        try:
            _cached_explainer = shap.TreeExplainer(_cached_model)
            dummy_sample = np.zeros((1, 15), dtype=float)
            dummy_res = _cached_explainer(dummy_sample)
            if hasattr(dummy_res, 'base_values'):
                _cached_base_value = float(dummy_res.base_values[0])
            print("SHAP TreeExplainer pre-warmed successfully.", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Failed to pre-warm SHAP TreeExplainer: {e}", file=sys.stderr)

    return _cached_model, _cached_gender_enc, _cached_target_enc

# ==================== DETERMINISTIC CLINICAL ESTIMATOR ====================
def estimate_clinical_parameters(input_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        age = float(input_data.get('age', 40))
    except (ValueError, TypeError):
        age = 40.0

    is_male = str(input_data.get('gender', 'Male')).strip().lower() == 'male'

    try:
        height = float(input_data.get('height', 175))
    except (ValueError, TypeError):
        height = 175.0

    try:
        weight = float(input_data.get('weight', 75))
    except (ValueError, TypeError):
        weight = 75.0

    try:
        bmi = float(input_data.get('bmi', round(weight / ((height / 100) ** 2), 1)))
    except (ValueError, TypeError):
        bmi = 24.5

    try:
        steps = float(input_data.get('daily_steps', 6500))
    except (ValueError, TypeError):
        steps = 6500.0

    try:
        sleep = float(input_data.get('sleep_hours', 7.0))
    except (ValueError, TypeError):
        sleep = 7.0

    smoker = 1 if int(input_data.get('smoker', 0)) == 1 else 0
    alcohol = 1 if int(input_data.get('alcohol', 0)) == 1 else 0
    fam_hist = 1 if int(input_data.get('family_history', 0)) == 1 else 0

    # 1. Systolic Blood Pressure (mmHg)
    sys_val = 112.0 + max(0.0, age - 20.0) * 0.28 + max(0.0, bmi - 22.0) * 1.2
    if is_male:
        sys_val += 2.0
    if smoker == 1:
        sys_val += 5.0
    if alcohol == 1:
        sys_val += 3.0
    if fam_hist == 1:
        sys_val += 3.0
    if steps >= 10000:
        sys_val -= 5.0
    elif steps >= 7500:
        sys_val -= 2.0
    elif steps < 4000:
        sys_val += 4.0
    if sleep < 6.0:
        sys_val += 3.0
    systolic_bp = int(round(max(95.0, min(175.0, sys_val))))

    # 2. Diastolic Blood Pressure (mmHg)
    dia_val = 72.0 + max(0.0, age - 20.0) * 0.15 + max(0.0, bmi - 22.0) * 0.75
    if is_male:
        dia_val += 1.0
    if smoker == 1:
        dia_val += 3.0
    if alcohol == 1:
        dia_val += 2.0
    if fam_hist == 1:
        dia_val += 2.0
    if steps >= 10000:
        dia_val -= 3.0
    elif steps < 4000:
        dia_val += 3.0
    if sleep < 6.0:
        dia_val += 2.0
    diastolic_bp = int(round(max(60.0, min(110.0, dia_val))))

    # 3. Resting Heart Rate (bpm)
    hr_val = 70.0 + max(0.0, bmi - 24.0) * 0.4
    if steps >= 12000:
        hr_val -= 8.0
    elif steps >= 9000:
        hr_val -= 5.0
    elif steps >= 6500:
        hr_val -= 2.0
    elif steps < 4000:
        hr_val += 6.0
    if smoker == 1:
        hr_val += 5.0
    if alcohol == 1:
        hr_val += 3.0
    if sleep < 6.0:
        hr_val += 3.0
    resting_hr = int(round(max(54.0, min(96.0, hr_val))))

    # 4. Total Serum Cholesterol (mg/dL)
    diet_pattern = input_data.get('dietaryPattern', '')
    fried_freq = input_data.get('friedFoodFrequency', '')
    chol_val = 170.0 + max(0.0, age - 20.0) * 0.65 + max(0.0, bmi - 22.0) * 2.2
    if diet_pattern in ['Frequently Street/Fast Food', 'Mostly High-Calorie / Processed Food']:
        chol_val += 20.0
    elif diet_pattern == 'Home-Cooked but Often Oily/Fried':
        chol_val += 12.0
    elif diet_pattern == 'Health-Conscious / Balanced Diet':
        chol_val -= 10.0

    if fried_freq == 'Almost Daily':
        chol_val += 12.0
    elif fried_freq == '3–4 times/week':
        chol_val += 6.0
    if smoker == 1:
        chol_val += 8.0
    if alcohol == 1:
        chol_val += 6.0
    if fam_hist == 1:
        chol_val += 14.0
    if steps >= 8000:
        chol_val -= 6.0
    elif steps < 4000:
        chol_val += 8.0
    cholesterol = int(round(max(140.0, min(280.0, chol_val))))

    provenance = {
        'age': 'user_provided',
        'gender': 'user_provided',
        'height': 'user_provided' if input_data.get('height') else 'default',
        'weight': 'user_provided' if input_data.get('weight') else 'default',
        'bmi': 'calculated_from_body_composition' if input_data.get('bmi') else 'default',
        'daily_steps': 'user_profile_derived_or_adjusted',
        'sleep_hours': 'user_profile_derived_or_adjusted',
        'calories_consumed': 'user_profile_derived_or_adjusted',
        'water_intake_l': 'user_profile_derived_or_adjusted',
        'smoker': 'user_provided',
        'alcohol': 'user_provided',
        'family_history': 'user_provided',
        'systolic_bp': 'internally_derived',
        'diastolic_bp': 'internally_derived',
        'resting_hr': 'internally_derived',
        'cholesterol': 'internally_derived'
    }

    return {
        'systolic_bp': systolic_bp,
        'diastolic_bp': diastolic_bp,
        'resting_hr': resting_hr,
        'cholesterol': cholesterol,
        'provenance': provenance
    }

# ==================== LIFESTYLE RECOMMENDATIONS ====================
def get_recommendations(data: Dict[str, Any], shap_dict: Dict[str, float], risk_score: float):
    recs = []

    systolic = data.get('systolic_bp', 120)
    diastolic = data.get('diastolic_bp', 80)
    if systolic >= 135 or diastolic >= 85:
        recs.append({
            'category': 'Cardiovascular',
            'severity': 'high',
            'title': 'Cardiovascular Wellness & Circulation',
            'advice': 'Your physiological indicators suggest prioritizing heart wellness. Engage in regular aerobic activity (150 min/week), reduce dietary sodium below 2,000 mg/day, and maintain routine checkups with your physician.'
        })
    elif systolic >= 125 or diastolic >= 80:
        recs.append({
            'category': 'Cardiovascular',
            'severity': 'medium',
            'title': 'Cardiovascular Balance Support',
            'advice': 'Support healthy arterial elasticity with daily brisk walking, stress management, and a diet rich in potassium and leafy greens.'
        })

    cholesterol = data.get('cholesterol', 190)
    if cholesterol >= 220:
        recs.append({
            'category': 'Lipid Balance',
            'severity': 'high',
            'title': 'Heart-Healthy Nutrition Focus',
            'advice': 'Emphasize foods that support clear circulation. Increase soluble fiber (oats, beans, lentils), choose healthy unsaturated fats, and limit ultra-processed or deep-fried foods.'
        })
    elif cholesterol >= 200:
        recs.append({
            'category': 'Lipid Balance',
            'severity': 'medium',
            'title': 'Dietary Lipid Optimization',
            'advice': 'Incorporate omega-3 rich foods (chia seeds, walnuts, flaxseed) and maintain diverse whole foods to optimize lipid metabolism.'
        })

    daily_steps = data.get('daily_steps', 7000)
    if daily_steps < 5000:
        recs.append({
            'category': 'Physical Activity',
            'severity': 'high',
            'title': 'Sedentary Lifestyle Risk',
            'advice': f'Averaging only {daily_steps:.0f} steps daily significantly drives up chronic disease risk. Aim for at least 8,000-10,000 steps daily (30-45 min brisk walking).'
        })
    elif daily_steps < 8000:
        recs.append({
            'category': 'Physical Activity',
            'severity': 'low',
            'title': 'Increase Daily Movement',
            'advice': f'Current activity ({daily_steps:.0f} steps) is moderate. Adding a 15-minute post-dinner walk will boost metabolic clearance.'
        })

    sleep_hours = data.get('sleep_hours', 7.0)
    if sleep_hours < 6.0:
        recs.append({
            'category': 'Sleep & Recovery',
            'severity': 'high',
            'title': 'Chronic Sleep Deprivation',
            'advice': f'Sleeping {sleep_hours:.1f} hrs/night impairs insulin sensitivity and elevates cortisol. Strive for 7.5 to 8.5 hours in a cool, dark room.'
        })
    elif sleep_hours > 9.5:
        recs.append({
            'category': 'Sleep & Recovery',
            'severity': 'medium',
            'title': 'Hypersomnia / Extended Sleep',
            'advice': f'Long sleep durations ({sleep_hours:.1f} hrs) may indicate underlying fatigue or sleep apnea. Consider a sleep hygiene assessment.'
        })

    bmi = data.get('bmi', 24.0)
    if bmi >= 30:
        recs.append({
            'category': 'Body Composition',
            'severity': 'high',
            'title': 'Obesity Management',
            'advice': f'BMI of {bmi:.1f} places substantial load on cardiovascular and endocrine systems. Aim for a gradual caloric deficit of 300-500 kcal/day.'
        })
    elif bmi >= 25:
        recs.append({
            'category': 'Body Composition',
            'severity': 'medium',
            'title': 'Overweight Threshold',
            'advice': f'BMI of {bmi:.1f} is slightly elevated. Strength training twice weekly and mindful portion control can restore metabolic balance.'
        })

    water = data.get('water_intake_l', 2.5)
    if water < 1.8:
        recs.append({
            'category': 'Hydration',
            'severity': 'medium',
            'title': 'Sub-optimal Hydration',
            'advice': f'Hydration is {water:.1f} L/day. Target 2.5-3.5 liters daily to optimize renal filtration, blood viscosity, and cellular energy.'
        })

    if data.get('smoker', 0) == 1:
        recs.append({
            'category': 'Lifestyle Habits',
            'severity': 'high',
            'title': 'Smoking Cessation Priority',
            'advice': 'Smoking is a primary catalyst for arterial endothelial damage. Explore nicotine replacement therapy and smoking cessation resources.'
        })

    if data.get('alcohol', 0) == 1:
        recs.append({
            'category': 'Lifestyle Habits',
            'severity': 'medium',
            'title': 'Alcohol Moderation',
            'advice': 'Limit alcohol consumption to under 1-2 standard drinks weekly to support hepatic metabolism and restful REM sleep.'
        })

    calories = data.get('calories_consumed', 2200)
    if calories > 3200:
        recs.append({
            'category': 'Nutrition',
            'severity': 'medium',
            'title': 'Caloric Surplus',
            'advice': f'Reported daily intake of {calories:.0f} kcal may contribute to visceral adiposity. Prioritize whole foods, fiber, and lean protein.'
        })

    rhr = data.get('resting_hr', 70)
    if rhr > 85:
        recs.append({
            'category': 'Cardiovascular',
            'severity': 'medium',
            'title': 'Aerobic Conditioning & Stress Management',
            'advice': 'Regular low-intensity aerobic conditioning (30 mins brisk walking or cycling 3-4x weekly) and consistent sleep hygiene help optimize cardiac recovery.'
        })

    if not recs:
        recs.append({
            'category': 'General Wellness',
            'severity': 'low',
            'title': 'Maintain Current Healthy Habits',
            'advice': 'Your physiological metrics align well with optimal clinical ranges. Keep maintaining balanced nutrition and active routines.'
        })

    return recs

# ==================== MAIN INFERENCE & SHAP ENGINE ====================
def predict_and_explain(input_data: Dict[str, Any]) -> Dict[str, Any]:
    model, gender_enc, _ = load_artifacts()

    # Deterministically calculate clinical parameters
    clinical_estimate = estimate_clinical_parameters(input_data)

    # Gender encoding
    gender_raw = input_data.get('gender', 'Male')
    if isinstance(gender_raw, str):
        gender_clean = gender_raw.strip().capitalize()
        if gender_enc:
            try:
                gender_val = int(gender_enc.transform([gender_clean])[0])
            except Exception:
                gender_val = 1 if 'm' in gender_clean.lower() else 0
        else:
            gender_val = 1 if 'm' in gender_clean.lower() else 0
    else:
        gender_val = int(gender_raw)

    feature_order = [
        'id', 'age', 'gender', 'bmi', 'daily_steps', 'sleep_hours',
        'water_intake_l', 'calories_consumed', 'smoker', 'alcohol',
        'resting_hr', 'systolic_bp', 'diastolic_bp', 'cholesterol', 'family_history'
    ]

    row = {
        'id': int(input_data.get('id', 1)),
        'age': float(input_data.get('age', 40)),
        'gender': gender_val,
        'bmi': float(input_data.get('bmi', 24.5)),
        'daily_steps': float(input_data.get('daily_steps', 7500)),
        'sleep_hours': float(input_data.get('sleep_hours', 7.0)),
        'water_intake_l': float(input_data.get('water_intake_l', 2.5)),
        'calories_consumed': float(input_data.get('calories_consumed', 2200)),
        'smoker': int(input_data.get('smoker', 0)),
        'alcohol': int(input_data.get('alcohol', 0)),
        'resting_hr': float(clinical_estimate['resting_hr']),
        'systolic_bp': float(clinical_estimate['systolic_bp']),
        'diastolic_bp': float(clinical_estimate['diastolic_bp']),
        'cholesterol': float(clinical_estimate['cholesterol']),
        'family_history': int(input_data.get('family_history', 0))
    }

    # Format input 2D NumPy array
    X_sample = np.array([[row[col] for col in feature_order]], dtype=float)

    # Scikit-Learn Model Inference
    pred_class = int(model.predict(X_sample)[0])
    probabilities = model.predict_proba(X_sample)[0]
    prob_risk = float(probabilities[1])
    prob_safe = float(probabilities[0])

    # SHAP Explanations
    shap_factors = []
    base_val = _cached_base_value
    shap_computed = False

    global _cached_explainer
    if HAS_SHAP:
        try:
            if _cached_explainer is None:
                _cached_explainer = shap.TreeExplainer(model)
            shap_res = _cached_explainer(X_sample)
            shap_vals = shap_res.values[0]
            if hasattr(shap_res, 'base_values'):
                base_val = float(shap_res.base_values[0])

            values_list = [row[col] for col in feature_order]
            for col, sval, ival in zip(feature_order, shap_vals, values_list):
                if col == 'id':
                    continue
                shap_factors.append({
                    'feature': col,
                    'user_value': float(ival),
                    'shap_value': round(float(sval), 4),
                    'direction': 'increases_risk' if sval > 0 else 'decreases_risk' if sval < 0 else 'neutral',
                    'impact': abs(round(float(sval), 4))
                })
            shap_computed = True
        except Exception as e:
            print(f"SHAP TreeExplainer error (using feature importance fallback): {e}", file=sys.stderr)

    if not shap_computed:
        values_list = [row[col] for col in feature_order]
        importances = getattr(model, 'feature_importances_', [1.0 / len(feature_order)] * len(feature_order))
        for col, imp, ival in zip(feature_order, importances, values_list):
            if col == 'id':
                continue
            shap_factors.append({
                'feature': col,
                'user_value': float(ival),
                'shap_value': round(float(imp), 4),
                'direction': 'increases_risk' if prob_risk > 0.5 else 'decreases_risk',
                'impact': round(float(imp), 4)
            })

    shap_factors.sort(key=lambda x: x['impact'], reverse=True)

    # Risk categorization
    if prob_risk >= 0.65:
        risk_level = 'High Risk'
        color = 'red'
    elif prob_risk >= 0.40:
        risk_level = 'Moderate Risk'
        color = 'amber'
    else:
        risk_level = 'Low Risk'
        color = 'emerald'

    recommendations = get_recommendations(row, {f['feature']: f['shap_value'] for f in shap_factors}, prob_risk)

    CLINICAL_FEATURES = {'systolic_bp', 'diastolic_bp', 'resting_hr', 'cholesterol'}
    user_shap_factors = [f for f in shap_factors if f['feature'] not in CLINICAL_FEATURES]

    sanitized_inputs = dict(row)
    for cf in CLINICAL_FEATURES:
        sanitized_inputs.pop(cf, None)

    return {
        'success': True,
        'prediction': pred_class,
        'disease_risk_detected': bool(pred_class == 1),
        'risk_score': round(prob_risk * 100, 2),
        'safe_score': round(prob_safe * 100, 2),
        'risk_level': risk_level,
        'risk_color': color,
        'base_value': round(base_val, 4),
        'shap_factors': user_shap_factors,
        'model_shap_factors': shap_factors,
        'top_risk_drivers': [f for f in user_shap_factors if f['direction'] == 'increases_risk'][:4],
        'top_protective_factors': [f for f in user_shap_factors if f['direction'] == 'decreases_risk'][:4],
        'recommendations': recommendations,
        'inputs_processed': sanitized_inputs,
        'raw_inputs_with_vitals': row,
        'provenance': clinical_estimate['provenance']
    }

# ==================== FASTAPI APP LIFECYCLE ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload model artifacts and warm up SHAP explainer on startup
    load_artifacts()
    yield

app = FastAPI(
    title="VitaPulse AI — ML Inference Service",
    version="1.0.0",
    description="Dedicated microservice for Gradient Boosting disease risk inference & SHAP explainability",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== SERVICE ENDPOINTS ====================
@app.get("/health")
async def health():
    """Simple healthcheck probe."""
    return {"status": "ok"}

@app.get("/")
async def root():
    return {
        "service": "VitaPulse AI ML Inference Service",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "predict": "POST /predict"
        }
    }

@app.post("/predict")
async def predict_endpoint(request: Request):
    """
    Receives lifestyle & biometric input payload.
    Executes Gradient Boosting inference + SHAP TreeExplainer.
    Returns standardized prediction and explanation dictionary.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    try:
        result = predict_and_explain(body)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    host = os.environ.get('HOST', '0.0.0.0')
    print(f"Starting VitaPulse AI ML Service on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=False)

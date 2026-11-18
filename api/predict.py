"""
VitaPulse AI — Serverless Prediction & Explainable AI (SHAP) Function
Designed for public production deployment on Vercel (@vercel/python runtime).

Preserves exact ML inference pipeline, SHAP tree explainer, deterministic clinical
parameter estimation, personalized lifestyle recommendations, and optional JWT/MongoDB
assessment history persistence.
"""

import sys
import os
import json
import warnings
from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone

warnings.filterwarnings('ignore')

import joblib
import numpy as np

# Optional dependencies imported safely
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

try:
    import jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False

try:
    from pymongo import MongoClient
    from bson import ObjectId
    HAS_MONGO = True
except ImportError:
    HAS_MONGO = False

# ==================== ENVIRONMENT CONFIGURATION ====================
JWT_SECRET = os.environ.get('JWT_SECRET', 'lifestyle_ai_jwt_secret_key_2026')
MONGO_URI = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URI')

# Global cached database client across serverless warm invocations
_mongo_client = None

def get_mongo_db():
    global _mongo_client
    uri = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URI')
    if not HAS_MONGO or not uri:
        return None
    try:
        if _mongo_client is None:
            _mongo_client = MongoClient(
                uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
        db_name = None
        try:
            db_name = _mongo_client.get_default_database().name
        except Exception:
            db_name = 'lifestyle_ai'
        return _mongo_client[db_name or 'lifestyle_ai']
    except Exception as e:
        print(f"MongoDB connection warning: {e}", file=sys.stderr)
        return None

# ==================== MODEL ARTIFACT LOADER ====================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_PATHS = [
    os.path.join(BASE_DIR, 'models'),
    os.path.join(BASE_DIR, '..', 'ML_Model', 'Results'),
    os.path.join(BASE_DIR, 'ML_Model', 'Results')
]

_cached_model = None
_cached_gender_enc = None
_cached_target_enc = None

def load_artifacts():
    global _cached_model, _cached_gender_enc, _cached_target_enc
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

    return _cached_model, _cached_gender_enc, _cached_target_enc

# ==================== DETERMINISTIC CLINICAL ESTIMATOR ====================
def estimate_clinical_parameters(input_data):
    """
    Deterministically derives model-supporting internal parameters:
    systolic_bp, diastolic_bp, resting_hr, cholesterol.
    Identical logic to clinicalEstimator.js.
    """
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
def get_recommendations(data, shap_dict, risk_score):
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

# ==================== MAIN PREDICTION & SHAP CORE ====================
def predict_and_explain(input_data):
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

    # Format input for model
    if HAS_PANDAS:
        X_sample = pd.DataFrame([row], columns=feature_order)
    else:
        X_sample = np.array([[row[col] for col in feature_order]], dtype=float)

    # Scikit-Learn Model Inference
    pred_class = int(model.predict(X_sample)[0])
    probabilities = model.predict_proba(X_sample)[0]
    prob_risk = float(probabilities[1])
    prob_safe = float(probabilities[0])

    # SHAP Explanations
    shap_factors = []
    base_val = 0.0
    shap_computed = False

    if HAS_SHAP:
        try:
            explainer = shap.TreeExplainer(model)
            shap_res = explainer(X_sample)
            shap_vals = shap_res.values[0]
            base_val = float(shap_res.base_values[0]) if hasattr(shap_res, 'base_values') else 0.0

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
            print(f"SHAP explainer warning (using feature importances): {e}", file=sys.stderr)

    if not shap_computed:
        # Fallback to feature importance weighting if SHAP fails or is missing
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

    # Sort factors by absolute impact
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

    # Sanitize inputs for user-facing response
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

# ==================== AUTHENTICATION & MONGODB HANDLER ====================
def extract_user_id(auth_header):
    if not auth_header or not auth_header.startswith('Bearer ') or not HAS_JWT:
        return None
    token = auth_header.split(' ')[1].strip()
    secret = os.environ.get('JWT_SECRET', 'lifestyle_ai_jwt_secret_key_2026')
    try:
        decoded = jwt.decode(token, secret, algorithms=['HS256'])
        return decoded.get('id')
    except Exception:
        return None

def save_assessment_record(user_id, result_data):
    db = get_mongo_db()
    if db is None or not user_id:
        return None

    try:
        raw_inputs = result_data.get('raw_inputs_with_vitals', {})
        provenance = result_data.get('provenance', {})

        doc = {
            'userId': ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id,
            'guestId': None,
            'inputs': {
                'age': raw_inputs.get('age', 40),
                'gender': 'Male' if raw_inputs.get('gender') == 1 else 'Female',
                'bmi': raw_inputs.get('bmi', 24.5),
                'daily_steps': raw_inputs.get('daily_steps', 7500),
                'sleep_hours': raw_inputs.get('sleep_hours', 7.0),
                'water_intake_l': raw_inputs.get('water_intake_l', 2.5),
                'calories_consumed': raw_inputs.get('calories_consumed', 2200),
                'smoker': raw_inputs.get('smoker', 0),
                'alcohol': raw_inputs.get('alcohol', 0),
                'resting_hr': raw_inputs.get('resting_hr', 70),
                'systolic_bp': raw_inputs.get('systolic_bp', 120),
                'diastolic_bp': raw_inputs.get('diastolic_bp', 80),
                'cholesterol': raw_inputs.get('cholesterol', 190),
                'family_history': raw_inputs.get('family_history', 0)
            },
            'provenance': provenance,
            'prediction': {
                'disease_risk_detected': result_data.get('disease_risk_detected'),
                'prediction_code': result_data.get('prediction'),
                'risk_score': result_data.get('risk_score'),
                'safe_score': result_data.get('safe_score'),
                'risk_level': result_data.get('risk_level'),
                'risk_color': result_data.get('risk_color'),
                'base_value': result_data.get('base_value')
            },
            'shap_factors': result_data.get('shap_factors', []),
            'top_risk_drivers': result_data.get('top_risk_drivers', []),
            'top_protective_factors': result_data.get('top_protective_factors', []),
            'recommendations': result_data.get('recommendations', []),
            'createdAt': datetime.now(timezone.utc)
        }

        insert_result = db['assessments'].insert_one(doc)
        return str(insert_result.inserted_id)
    except Exception as e:
        print(f"Failed to persist assessment to MongoDB: {e}", file=sys.stderr)
        return None

# ==================== VERCEL HTTP REQUEST HANDLER ====================
class handler(BaseHTTPRequestHandler):
    """
    Vercel Serverless Function entry point.
    Handles /api/predict requests over HTTP.
    """
    def _send_cors_headers(self):
        origin = self.headers.get('Origin', '*')
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-guest-id')
        self.send_header('Access-Control-Allow-Credentials', 'true')

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        res = {
            'status': 'online',
            'service': 'VitaPulse AI Prediction & XAI API (Vercel Serverless Python)',
            'endpoint': '/api/predict',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        self.wfile.write(json.dumps(res).encode('utf-8'))

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                raw_body = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(raw_body)
            else:
                payload = {}

            # Execute ML model + SHAP pipeline
            result = predict_and_explain(payload)

            # Check authentication
            auth_header = self.headers.get('Authorization')
            user_id = extract_user_id(auth_header)

            saved_id = None
            is_saved = False
            is_guest = True

            if user_id:
                saved_id = save_assessment_record(user_id, result)
                if saved_id:
                    is_saved = True
                    is_guest = False

            # Remove raw internal tracking before output
            result.pop('raw_inputs_with_vitals', None)

            response_payload = {
                **result,
                'assessmentId': saved_id,
                'savedAt': datetime.now(timezone.utc).isoformat() if is_saved else None,
                'isSaved': is_saved,
                'isGuest': is_guest
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))

        except Exception as exc:
            print(f"Error handling /api/predict: {exc}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            err_res = {
                'error': str(exc) if os.environ.get('NODE_ENV') != 'production' else 'An error occurred during prediction calculation.'
            }
            self.wfile.write(json.dumps(err_res).encode('utf-8'))

    def log_message(self, format, *args):
        # Suppress verbose standard HTTP request logs
        return

# ==================== CLI / TEST RUNNER ====================
if __name__ == '__main__':
    test_data = {
        'age': 45, 'gender': 'Male', 'bmi': 28.5, 'daily_steps': 5000,
        'sleep_hours': 6.0, 'water_intake_l': 2.0, 'calories_consumed': 2600,
        'smoker': 1, 'alcohol': 1, 'family_history': 1
    }
    print("Testing api/predict.py locally...")
    res = predict_and_explain(test_data)
    print("Prediction Result:")
    print(json.dumps(res, indent=2))

import sys
import os
import json
import warnings
warnings.filterwarnings('ignore')

import joblib
import pandas as pd
import numpy as np

# Path to the trained artifacts
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_RESULTS = [
    os.path.join(BASE_DIR, '..', 'ML_Model', 'Results'),
    os.path.join(BASE_DIR, '..', 'api', 'models'),
    os.path.join(BASE_DIR, 'ML_Model', 'Results')
]
RESULTS_DIR = next((p for p in POSSIBLE_RESULTS if os.path.exists(os.path.join(p, 'best_model.pkl'))), POSSIBLE_RESULTS[0])

MODEL_PATH = os.path.join(RESULTS_DIR, 'best_model.pkl')
GENDER_ENC_PATH = os.path.join(RESULTS_DIR, 'gender_encoder.pkl')
TARGET_ENC_PATH = os.path.join(RESULTS_DIR, 'target_encoder.pkl')

def load_artifacts():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    gender_enc = joblib.load(GENDER_ENC_PATH)
    target_enc = joblib.load(TARGET_ENC_PATH)
    return model, gender_enc, target_enc

def get_recommendations(data, shap_dict, risk_score):
    recs = []
    
    # Cardiovascular & Blood Pressure Lifestyle Indicators
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

    # Lipids & Dietary Fats Indicators
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

    # Daily Steps
    daily_steps = data.get('daily_steps', 7000)
    if daily_steps < 5000:
        recs.append({
            'category': 'Physical Activity',
            'severity': 'high',
            'title': 'Sedentary Lifestyle Risk',
            'advice': f'Averaging only {daily_steps} steps daily significantly drives up chronic disease risk. Aim for at least 8,000-10,000 steps daily (30-45 min brisk walking).'
        })
    elif daily_steps < 8000:
        recs.append({
            'category': 'Physical Activity',
            'severity': 'low',
            'title': 'Increase Daily Movement',
            'advice': f'Current activity ({daily_steps} steps) is moderate. Adding a 15-minute post-dinner walk will boost metabolic clearance.'
        })

    # Sleep
    sleep_hours = data.get('sleep_hours', 7.0)
    if sleep_hours < 6.0:
        recs.append({
            'category': 'Sleep & Recovery',
            'severity': 'high',
            'title': 'Chronic Sleep Deprivation',
            'advice': f'Sleeping {sleep_hours} hrs/night impairs insulin sensitivity and elevates cortisol. Strive for 7.5 to 8.5 hours in a cool, dark room.'
        })
    elif sleep_hours > 9.5:
        recs.append({
            'category': 'Sleep & Recovery',
            'severity': 'medium',
            'title': 'Hypersomnia / Extended Sleep',
            'advice': f'Long sleep durations ({sleep_hours} hrs) may indicate underlying fatigue or sleep apnea. Consider a sleep hygiene assessment.'
        })

    # BMI
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

    # Hydration
    water = data.get('water_intake_l', 2.5)
    if water < 1.8:
        recs.append({
            'category': 'Hydration',
            'severity': 'medium',
            'title': 'Sub-optimal Hydration',
            'advice': f'Hydration is {water} L/day. Target 2.5-3.5 liters daily to optimize renal filtration, blood viscosity, and cellular energy.'
        })

    # Smoking & Alcohol
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

    # Caloric intake
    calories = data.get('calories_consumed', 2200)
    if calories > 3200:
        recs.append({
            'category': 'Nutrition',
            'severity': 'medium',
            'title': 'Caloric Surplus',
            'advice': f'Reported daily intake of {calories} kcal may contribute to visceral adiposity. Prioritize whole foods, fiber, and lean protein.'
        })

    # Resting HR Indicator
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

def predict_single(input_data):
    model, gender_enc, target_enc = load_artifacts()

    # Normalize gender
    gender_raw = input_data.get('gender', 'Male')
    if isinstance(gender_raw, str):
        gender_clean = gender_raw.strip().capitalize()
        try:
            gender_val = int(gender_enc.transform([gender_clean])[0])
        except Exception:
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
        'resting_hr': float(input_data.get('resting_hr', 72)),
        'systolic_bp': float(input_data.get('systolic_bp', 120)),
        'diastolic_bp': float(input_data.get('diastolic_bp', 80)),
        'cholesterol': float(input_data.get('cholesterol', 190)),
        'family_history': int(input_data.get('family_history', 0))
    }

    df_sample = pd.DataFrame([row], columns=feature_order)

    # Predictions
    pred_class = int(model.predict(df_sample)[0])
    probabilities = model.predict_proba(df_sample)[0]
    prob_risk = float(probabilities[1])
    prob_safe = float(probabilities[0])

    # SHAP explanations
    shap_factors = []
    base_val = 0.0
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_res = explainer(df_sample)
        shap_vals = shap_res.values[0]
        base_val = float(shap_res.base_values[0]) if hasattr(shap_res, 'base_values') else 0.0

        for col, sval, ival in zip(feature_order, shap_vals, df_sample.iloc[0]):
            if col == 'id':
                continue # do not display artificial id in patient explanations
            shap_factors.append({
                'feature': col,
                'user_value': float(ival),
                'shap_value': round(float(sval), 4),
                'direction': 'increases_risk' if sval > 0 else 'decreases_risk' if sval < 0 else 'neutral',
                'impact': abs(round(float(sval), 4))
            })
    except Exception as e:
        # Fallback to feature importance weighting if shap encounters issue
        for col, imp, ival in zip(feature_order, model.feature_importances_, df_sample.iloc[0]):
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

    result = {
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
        'inputs_processed': row
    }

    return result

if __name__ == '__main__':
    try:
        raw_input = None
        if len(sys.argv) > 1:
            arg = sys.argv[1]
            if arg == '--stdin':
                raw_input = sys.stdin.read().strip()
            elif arg == '--test':
                raw_input = "{}"
            elif os.path.exists(arg):
                with open(arg, 'r', encoding='utf-8') as f:
                    raw_input = f.read().strip()
            else:
                raw_input = arg

        if not raw_input or raw_input == "{}":
            # Test default run
            test_data = {
                'age': 45, 'gender': 'Male', 'bmi': 28.5, 'daily_steps': 5000,
                'sleep_hours': 6.0, 'water_intake_l': 2.0, 'calories_consumed': 2600,
                'smoker': 1, 'alcohol': 1, 'resting_hr': 85, 'systolic_bp': 135,
                'diastolic_bp': 88, 'cholesterol': 220, 'family_history': 1
            }
            res = predict_single(test_data)
        else:
            parsed = json.loads(raw_input)
            res = predict_single(parsed)

        print(json.dumps(res, indent=2))
    except Exception as exc:
        err_out = {
            'success': False,
            'error': str(exc)
        }
        print(json.dumps(err_out))
        sys.exit(1)

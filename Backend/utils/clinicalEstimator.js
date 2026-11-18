/**
 * Centralized Clinical Parameters Estimator
 *
 * Deterministically derives model-supporting internal parameters:
 * - systolic_bp
 * - diastolic_bp
 * - resting_hr
 * - cholesterol
 *
 * Grounded in epidemiology (age, biological sex, BMI, activity, sleep, smoking,
 * alcohol, dietary habits, and family history). These values are NOT actual
 * medical measurements and are used strictly as internal ML model-supporting
 * features so the user is never asked to manually enter cardiovascular vitals.
 */

function estimateClinicalParameters(inputData = {}) {
    const age = Number(inputData.age) || 40;
    const isMale = String(inputData.gender || 'Male').toLowerCase() === 'male';
    const height = Number(inputData.height) || 175;
    const weight = Number(inputData.weight) || 75;
    const bmi = Number(inputData.bmi) || parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
    const steps = Number(inputData.daily_steps) || 6500;
    const sleep = Number(inputData.sleep_hours) || 7.0;
    const smoker = Number(inputData.smoker) || 0;
    const alcohol = Number(inputData.alcohol) || 0;
    const famHist = Number(inputData.family_history) || 0;

    // 1. Systolic Blood Pressure (mmHg)
    // Healthy young baseline ~112 mmHg. Gradual upward vascular stiffness curve with age & BMI.
    let sys = 112 + Math.max(0, age - 20) * 0.28 + Math.max(0, bmi - 22) * 1.2;
    if (isMale) sys += 2;
    if (smoker === 1) sys += 5;
    if (alcohol === 1) sys += 3;
    if (famHist === 1) sys += 3;
    if (steps >= 10000) sys -= 5;
    else if (steps >= 7500) sys -= 2;
    else if (steps < 4000) sys += 4;
    if (sleep < 6) sys += 3;
    const systolic_bp = Math.round(Math.max(95, Math.min(175, sys)));

    // 2. Diastolic Blood Pressure (mmHg)
    // Healthy baseline ~72 mmHg.
    let dia = 72 + Math.max(0, age - 20) * 0.15 + Math.max(0, bmi - 22) * 0.75;
    if (isMale) dia += 1;
    if (smoker === 1) dia += 3;
    if (alcohol === 1) dia += 2;
    if (famHist === 1) dia += 2;
    if (steps >= 10000) dia -= 3;
    else if (steps < 4000) dia += 3;
    if (sleep < 6) dia += 2;
    const diastolic_bp = Math.round(Math.max(60, Math.min(110, dia)));

    // 3. Resting Heart Rate (bpm)
    // Healthy baseline ~70 bpm. Influenced strongly by physical conditioning and stimulants.
    let hr = 70 + Math.max(0, bmi - 24) * 0.4;
    if (steps >= 12000) hr -= 8;
    else if (steps >= 9000) hr -= 5;
    else if (steps >= 6500) hr -= 2;
    else if (steps < 4000) hr += 6;
    if (smoker === 1) hr += 5;
    if (alcohol === 1) hr += 3;
    if (sleep < 6) hr += 3;
    const resting_hr = Math.round(Math.max(54, Math.min(96, hr)));

    // 4. Total Serum Cholesterol (mg/dL)
    // Baseline ~170 mg/dL.
    let chol = 170 + Math.max(0, age - 20) * 0.65 + Math.max(0, bmi - 22) * 2.2;
    if (inputData.dietaryPattern === 'Frequently Street/Fast Food' || inputData.dietaryPattern === 'Mostly High-Calorie / Processed Food') {
        chol += 20;
    } else if (inputData.dietaryPattern === 'Home-Cooked but Often Oily/Fried') {
        chol += 12;
    } else if (inputData.dietaryPattern === 'Health-Conscious / Balanced Diet') {
        chol -= 10;
    }
    if (inputData.friedFoodFrequency === 'Almost Daily') chol += 12;
    else if (inputData.friedFoodFrequency === '3–4 times/week') chol += 6;
    if (smoker === 1) chol += 8;
    if (alcohol === 1) chol += 6;
    if (famHist === 1) chol += 14;
    if (steps >= 8000) chol -= 6;
    else if (steps < 4000) chol += 8;
    const cholesterol = Math.round(Math.max(140, Math.min(280, chol)));

    // Internal data provenance map for debugging and auditing
    const provenance = {
        age: 'user_provided',
        gender: 'user_provided',
        height: inputData.height ? 'user_provided' : 'default',
        weight: inputData.weight ? 'user_provided' : 'default',
        bmi: inputData.bmi ? 'calculated_from_body_composition' : 'default',
        daily_steps: 'user_profile_derived_or_adjusted',
        sleep_hours: 'user_profile_derived_or_adjusted',
        calories_consumed: 'user_profile_derived_or_adjusted',
        water_intake_l: 'user_profile_derived_or_adjusted',
        smoker: 'user_provided',
        alcohol: 'user_provided',
        family_history: 'user_provided',
        systolic_bp: 'internally_derived',
        diastolic_bp: 'internally_derived',
        resting_hr: 'internally_derived',
        cholesterol: 'internally_derived'
    };

    return {
        systolic_bp,
        diastolic_bp,
        resting_hr,
        cholesterol,
        provenance
    };
}

module.exports = {
    estimateClinicalParameters
};


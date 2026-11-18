const Assessment = require('../models/AssessmentSchema');

// Whitelisted pages for navigation
const ALLOWED_PAGES = ['predictor', 'dashboard', 'history', 'comparison', 'assistant'];

// Parameter metadata for human-readable comparisons
const PARAM_META = {
    age: { label: 'Age', unit: 'years', lowerIsBetter: null },
    gender: { label: 'Gender', unit: '', isCategorical: true },
    bmi: { label: 'BMI', unit: 'kg/m²', lowerIsBetter: true, ideal: [18.5, 24.9] },
    daily_steps: { label: 'Daily Steps', unit: 'steps', lowerIsBetter: false },
    sleep_hours: { label: 'Sleep Duration', unit: 'hrs', lowerIsBetter: null, ideal: [7, 9] },
    water_intake_l: { label: 'Water Intake', unit: 'L', lowerIsBetter: false },
    calories_consumed: { label: 'Caloric Intake', unit: 'kcal', lowerIsBetter: true, ideal: [1800, 2400] },
    smoker: { label: 'Smoking Status', unit: '', isCategorical: true },
    alcohol: { label: 'Alcohol Intake', unit: '', isCategorical: true },
    family_history: { label: 'Family History', unit: '', isCategorical: true }
};

const CLINICAL_FEATURES = new Set(['systolic_bp', 'diastolic_bp', 'resting_hr', 'cholesterol']);

function interpretChange(key, prevVal, curVal) {
    const meta = PARAM_META[key];
    if (!meta || meta.isCategorical || prevVal == null || curVal == null) return 'neutral';
    const diff = curVal - prevVal;
    if (Math.abs(diff) < 0.01) return 'stable';

    if (meta.ideal) {
        const [lo, hi] = meta.ideal;
        const prevDist = prevVal < lo ? lo - prevVal : prevVal > hi ? prevVal - hi : 0;
        const curDist = curVal < lo ? lo - curVal : curVal > hi ? curVal - hi : 0;
        if (curDist < prevDist) return 'improved';
        if (curDist > prevDist) return 'worsened';
        return 'stable';
    }

    if (meta.lowerIsBetter === true) return diff < 0 ? 'improved' : 'worsened';
    if (meta.lowerIsBetter === false) return diff > 0 ? 'improved' : 'worsened';
    return 'neutral';
}

/**
 * Controlled Tool 1: getAssessmentHistory
 */
async function getAssessmentHistory(userId, { limit = 5, startDate, endDate } = {}) {
    if (!userId) {
        return { error: 'Authentication required. Please sign in to view your assessment history.' };
    }

    const query = { userId };
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 20);
    const assessments = await Assessment.find(query)
        .sort({ createdAt: -1 })
        .limit(maxLimit)
        .select('inputs prediction shap_factors top_risk_drivers top_protective_factors recommendations createdAt');

    return {
        totalFound: assessments.length,
        assessments: assessments.map(a => ({
            id: a._id.toString(),
            date: a.createdAt ? a.createdAt.toISOString().split('T')[0] : 'Unknown',
            riskScore: a.prediction?.risk_score,
            riskLevel: a.prediction?.risk_level,
            diseaseRiskDetected: a.prediction?.disease_risk_detected,
            lifestyleMetrics: {
                bmi: a.inputs?.bmi,
                steps: a.inputs?.daily_steps,
                sleep: a.inputs?.sleep_hours,
                water: a.inputs?.water_intake_l,
                calories: a.inputs?.calories_consumed
            }
        }))
    };
}

/**
 * Controlled Tool 2: getLatestAssessment
 */
async function getLatestAssessment(userId) {
    if (!userId) {
        return { error: 'Authentication required. Please sign in to view your latest assessment.' };
    }

    const latest = await Assessment.findOne({ userId })
        .sort({ createdAt: -1 });

    if (!latest) {
        return { message: 'No assessments found on record. You can take a new assessment on the Risk Predictor page.' };
    }

    const sanitizedInputs = { ...(latest.inputs?.toObject ? latest.inputs.toObject() : latest.inputs || {}) };
    delete sanitizedInputs.systolic_bp;
    delete sanitizedInputs.diastolic_bp;
    delete sanitizedInputs.resting_hr;
    delete sanitizedInputs.cholesterol;

    return {
        id: latest._id.toString(),
        date: latest.createdAt ? latest.createdAt.toISOString().split('T')[0] : 'Unknown',
        riskScore: latest.prediction?.risk_score,
        riskLevel: latest.prediction?.risk_level,
        diseaseRiskDetected: latest.prediction?.disease_risk_detected,
        inputs: sanitizedInputs,
        topRiskDrivers: (latest.top_risk_drivers || [])
            .filter(f => !CLINICAL_FEATURES.has(f.feature))
            .map(f => ({
                feature: PARAM_META[f.feature]?.label || f.feature,
                value: f.user_value,
                impact: f.impact,
                direction: f.direction
            })),
        topProtectiveFactors: (latest.top_protective_factors || [])
            .filter(f => !CLINICAL_FEATURES.has(f.feature))
            .map(f => ({
                feature: PARAM_META[f.feature]?.label || f.feature,
                value: f.user_value,
                impact: f.impact,
                direction: f.direction
            })),
        recommendations: (latest.recommendations || []).map(r => ({
            category: r.category,
            severity: r.severity,
            title: r.title,
            advice: r.advice
        }))
    };
}

/**
 * Controlled Tool 3: getAssessmentById
 */
async function getAssessmentById(userId, { assessmentId }) {
    if (!userId) {
        return { error: 'Authentication required. Please sign in.' };
    }
    if (!assessmentId) {
        return { error: 'assessmentId is required.' };
    }

    const assessment = await Assessment.findOne({ _id: assessmentId, userId });
    if (!assessment) {
        return { error: 'Assessment record not found or access denied.' };
    }

    const sanitizedInputs = { ...(assessment.inputs?.toObject ? assessment.inputs.toObject() : assessment.inputs || {}) };
    delete sanitizedInputs.systolic_bp;
    delete sanitizedInputs.diastolic_bp;
    delete sanitizedInputs.resting_hr;
    delete sanitizedInputs.cholesterol;

    return {
        id: assessment._id.toString(),
        date: assessment.createdAt ? assessment.createdAt.toISOString().split('T')[0] : 'Unknown',
        riskScore: assessment.prediction?.risk_score,
        riskLevel: assessment.prediction?.risk_level,
        inputs: sanitizedInputs,
        topRiskDrivers: (assessment.top_risk_drivers || []).filter(f => !CLINICAL_FEATURES.has(f.feature)),
        topProtectiveFactors: (assessment.top_protective_factors || []).filter(f => !CLINICAL_FEATURES.has(f.feature))
    };
}

/**
 * Controlled Tool 4: compareAssessments
 */
async function compareAssessments(userId, { previousAssessmentId, currentAssessmentId } = {}) {
    if (!userId) {
        return { error: 'Authentication required. Please sign in to compare assessments.' };
    }

    let prev, cur;

    if (previousAssessmentId && currentAssessmentId) {
        [prev, cur] = await Promise.all([
            Assessment.findOne({ _id: previousAssessmentId, userId }),
            Assessment.findOne({ _id: currentAssessmentId, userId })
        ]);
        if (!prev || !cur) {
            return { error: 'One or both assessment records were not found or access was denied.' };
        }
    } else {
        const lastTwo = await Assessment.find({ userId })
            .sort({ createdAt: -1 })
            .limit(2);

        if (lastTwo.length < 2) {
            return {
                message: 'At least two saved assessments are required to perform a comparison. Complete a new assessment to see your progress.'
            };
        }
        cur = lastTwo[0];
        prev = lastTwo[1];
    }

    const prevScore = prev.prediction?.risk_score ?? 0;
    const curScore = cur.prediction?.risk_score ?? 0;
    const riskChange = curScore - prevScore;

    const improvements = [];
    const worsening = [];
    const stable = [];

    const prevInputs = prev.inputs || {};
    const curInputs = cur.inputs || {};

    for (const [key, meta] of Object.entries(PARAM_META)) {
        if (meta.isCategorical) continue;
        const pv = prevInputs[key];
        const cv = curInputs[key];
        if (pv == null || cv == null) continue;

        const diff = cv - pv;
        const status = interpretChange(key, pv, cv);
        const entry = {
            parameter: meta.label,
            previous: pv,
            current: cv,
            change: diff > 0 ? `+${diff.toFixed(1)} ${meta.unit}` : `${diff.toFixed(1)} ${meta.unit}`
        };

        if (status === 'improved') improvements.push(entry);
        else if (status === 'worsened') worsening.push(entry);
        else stable.push(entry);
    }

    return {
        previousAssessment: {
            id: prev._id.toString(),
            date: prev.createdAt ? prev.createdAt.toISOString().split('T')[0] : 'Unknown',
            riskScore: prevScore,
            riskLevel: prev.prediction?.risk_level
        },
        currentAssessment: {
            id: cur._id.toString(),
            date: cur.createdAt ? cur.createdAt.toISOString().split('T')[0] : 'Unknown',
            riskScore: curScore,
            riskLevel: cur.prediction?.risk_level
        },
        riskChangePercentagePoints: riskChange,
        trajectory: riskChange < -2 ? 'improving' : riskChange > 2 ? 'worsening' : 'stable',
        majorImprovements: improvements,
        areasThatWorsened: worsening,
        stableParameters: stable
    };
}

/**
 * Controlled Tool 5: getRiskTrend
 */
async function getRiskTrend(userId) {
    if (!userId) {
        return { error: 'Authentication required. Please sign in to view your risk trend.' };
    }

    const assessments = await Assessment.find({ userId })
        .sort({ createdAt: 1 })
        .select('createdAt prediction inputs')
        .limit(20);

    if (assessments.length === 0) {
        return { message: 'No assessment history found to plot trend.' };
    }

    const trend = assessments.map(a => ({
        date: a.createdAt ? a.createdAt.toISOString().split('T')[0] : 'Unknown',
        riskScore: a.prediction?.risk_score,
        riskLevel: a.prediction?.risk_level,
        bmi: a.inputs?.bmi,
        steps: a.inputs?.daily_steps
    }));

    const firstScore = trend[0].riskScore;
    const latestScore = trend[trend.length - 1].riskScore;
    const totalChange = latestScore - firstScore;

    return {
        totalAssessments: trend.length,
        trend,
        overallChange: totalChange,
        trajectory: totalChange < -2 ? 'improving' : totalChange > 2 ? 'worsening' : 'stable'
    };
}

/**
 * Controlled Tool 6: getLatestSHAP
 */
async function getLatestSHAP(userId) {
    if (!userId) {
        return { error: 'Authentication required. Please sign in to view your SHAP explanation.' };
    }

    const latest = await Assessment.findOne({ userId })
        .sort({ createdAt: -1 })
        .select('prediction shap_factors top_risk_drivers top_protective_factors inputs createdAt');

    if (!latest) {
        return { message: 'No assessments available to retrieve SHAP explanations.' };
    }

    return {
        assessmentDate: latest.createdAt ? latest.createdAt.toISOString().split('T')[0] : 'Unknown',
        riskScore: latest.prediction?.risk_score,
        riskLevel: latest.prediction?.risk_level,
        baseValue: latest.prediction?.base_value,
        topRiskDrivers: (latest.top_risk_drivers || []).map(f => ({
            parameter: PARAM_META[f.feature]?.label || f.feature,
            measuredValue: `${f.user_value} ${PARAM_META[f.feature]?.unit || ''}`.trim(),
            shapValue: f.shap_value,
            impact: f.impact,
            explanation: 'Increases estimated risk probability in Gradient Boosting model'
        })),
        topProtectiveFactors: (latest.top_protective_factors || []).map(f => ({
            parameter: PARAM_META[f.feature]?.label || f.feature,
            measuredValue: `${f.user_value} ${PARAM_META[f.feature]?.unit || ''}`.trim(),
            shapValue: f.shap_value,
            impact: f.impact,
            explanation: 'Lowers estimated risk probability in Gradient Boosting model'
        })),
        disclaimer: 'SHAP (SHapley Additive exPlanations) values quantify local statistical attributions to the ML model output, not direct medical causation.'
    };
}

/**
 * Controlled Tool 7: navigateTo
 */
function navigateTo({ page }) {
    const normalizedPage = (page || '').toLowerCase().trim();
    const target = normalizedPage === 'dashboard' ? 'predictor' : normalizedPage;

    if (!ALLOWED_PAGES.includes(target)) {
        return {
            success: false,
            error: `Page "${page}" is not a valid destination. Allowed destinations: ${ALLOWED_PAGES.join(', ')}`
        };
    }

    return {
        success: true,
        page: target,
        message: `Navigating to ${target} page.`
    };
}

// Declarations formatted for Gemini Function Calling
const toolDeclarations = [
    {
        name: 'getLatestAssessment',
        description: 'Retrieves the authenticated user\'s most recent health risk assessment, vitals, risk score, and recommendations.'
    },
    {
        name: 'getAssessmentHistory',
        description: 'Retrieves a list of previous health assessments for the authenticated user.',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: { type: 'INTEGER', description: 'Number of assessments to retrieve (default 5, max 20).' }
            }
        }
    },
    {
        name: 'compareAssessments',
        description: 'Compares two health assessments (or the last two if IDs are omitted), analyzing changes in risk score, lifestyle metrics, and vitals.',
        parameters: {
            type: 'OBJECT',
            properties: {
                previousAssessmentId: { type: 'STRING', description: 'Optional ID of the older assessment.' },
                currentAssessmentId: { type: 'STRING', description: 'Optional ID of the newer assessment.' }
            }
        }
    },
    {
        name: 'getRiskTrend',
        description: 'Retrieves chronological risk scores and trajectory across all past assessments for the user.'
    },
    {
        name: 'getLatestSHAP',
        description: 'Retrieves the Explainable AI (SHAP) feature attribution factors explaining why the model predicted the user\'s latest risk score.'
    },
    {
        name: 'navigateTo',
        description: 'Navigates the user to a specific tab/page in the VitaPulse AI application. Allowed pages: predictor, history, comparison, assistant.',
        parameters: {
            type: 'OBJECT',
            properties: {
                page: {
                    type: 'STRING',
                    description: 'The destination tab to open. Must be one of: "predictor", "history", "comparison", "assistant".'
                }
            },
            required: ['page']
        }
    }
];

module.exports = {
    ALLOWED_PAGES,
    getAssessmentHistory,
    getLatestAssessment,
    getAssessmentById,
    compareAssessments,
    getRiskTrend,
    getLatestSHAP,
    navigateTo,
    toolDeclarations
};


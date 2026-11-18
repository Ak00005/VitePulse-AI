const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Assessment = require('../models/AssessmentSchema');
const { verifyToken, optionalToken } = require('../middleware/auth');
const { estimateClinicalParameters } = require('../utils/clinicalEstimator');

// Helper to execute Python ML Bridge (supports both local child_process spawn and HTTP serverless function)
const runMLInference = async (inputPayload) => {
    // If an external or Vercel Python prediction endpoint is configured
    if (process.env.PYTHON_PREDICT_URL) {
        const response = await fetch(process.env.PYTHON_PREDICT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputPayload)
        });
        const data = await response.json();
        if (!response.ok || data.error) {
            throw new Error(data.error || 'Serverless ML inference failed');
        }
        return data;
    }

    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '..', 'ml_bridge.py');
        const jsonString = JSON.stringify(inputPayload);

        // Run python with json argument (cross-platform executable detection)
        const pythonBin = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
        const pyProcess = spawn(pythonBin, [pythonScript, jsonString]);

        let stdoutData = '';
        let stderrData = '';

        pyProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pyProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pyProcess.on('close', (code) => {
            if (code !== 0 && !stdoutData.trim()) {
                return reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
            }

            try {
                // Find json object in stdout
                const firstBrace = stdoutData.indexOf('{');
                const lastBrace = stdoutData.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1) {
                    return reject(new Error(`Invalid response format from ML script: ${stdoutData}`));
                }

                const jsonSub = stdoutData.substring(firstBrace, lastBrace + 1);
                const parsed = JSON.parse(jsonSub);
                if (parsed.error) {
                    return reject(new Error(parsed.error));
                }
                resolve(parsed);
            } catch (err) {
                reject(new Error(`Failed to parse ML output: ${err.message}. Raw output: ${stdoutData}`));
            }
        });

        pyProcess.on('error', (err) => {
            reject(new Error(`Failed to spawn Python process: ${err.message}`));
        });
    });
};

// POST /api/predict
// Calculates ML prediction for all users. Only stores history in MongoDB if the user is authenticated with a valid JWT.
router.post('/predict', optionalToken, async (req, res) => {
    try {
        const inputData = req.body;
        const userId = req.userId; // Set by optionalToken middleware if valid JWT provided

        // Derive clinical parameters deterministically (never requires manual user entry)
        const clinicalEstimate = estimateClinicalParameters(inputData);

        const enrichedInputData = {
            ...inputData,
            systolic_bp: clinicalEstimate.systolic_bp,
            diastolic_bp: clinicalEstimate.diastolic_bp,
            resting_hr: clinicalEstimate.resting_hr,
            cholesterol: clinicalEstimate.cholesterol
        };

        // Run ML inference with SHAP XAI
        const mlResult = await runMLInference(enrichedInputData);

        // Strip internal clinical vitals from user-facing inputs_processed
        const sanitizedInputs = { ...(mlResult.inputs_processed || enrichedInputData) };
        delete sanitizedInputs.systolic_bp;
        delete sanitizedInputs.diastolic_bp;
        delete sanitizedInputs.resting_hr;
        delete sanitizedInputs.cholesterol;

        const publicResult = {
            ...mlResult,
            inputs_processed: sanitizedInputs,
            provenance: clinicalEstimate.provenance
        };

        let savedDoc = null;

        // ONLY save history if the user is authenticated
        if (userId) {
            const assessmentDoc = new Assessment({
                userId: userId,
                guestId: null,
                inputs: {
                    age: Number(enrichedInputData.age || 40),
                    gender: String(enrichedInputData.gender || 'Male'),
                    bmi: Number(enrichedInputData.bmi || 24.5),
                    daily_steps: Number(enrichedInputData.daily_steps || 7500),
                    sleep_hours: Number(enrichedInputData.sleep_hours || 7.0),
                    water_intake_l: Number(enrichedInputData.water_intake_l || 2.5),
                    calories_consumed: Number(enrichedInputData.calories_consumed || 2200),
                    smoker: Number(enrichedInputData.smoker || 0),
                    alcohol: Number(enrichedInputData.alcohol || 0),
                    resting_hr: Number(clinicalEstimate.resting_hr),
                    systolic_bp: Number(clinicalEstimate.systolic_bp),
                    diastolic_bp: Number(clinicalEstimate.diastolic_bp),
                    cholesterol: Number(clinicalEstimate.cholesterol),
                    family_history: Number(enrichedInputData.family_history || 0)
                },
                provenance: clinicalEstimate.provenance,
                prediction: {
                    disease_risk_detected: mlResult.disease_risk_detected,
                    prediction_code: mlResult.prediction,
                    risk_score: mlResult.risk_score,
                    safe_score: mlResult.safe_score,
                    risk_level: mlResult.risk_level,
                    risk_color: mlResult.risk_color,
                    base_value: mlResult.base_value
                },
                shap_factors: mlResult.shap_factors || [],
                top_risk_drivers: mlResult.top_risk_drivers || [],
                top_protective_factors: mlResult.top_protective_factors || [],
                recommendations: mlResult.recommendations || []
            });

            try {
                savedDoc = await assessmentDoc.save();
            } catch (dbErr) {
                console.warn('Could not save to MongoDB (proceeding with result):', dbErr.message);
            }

            return res.json({
                ...publicResult,
                assessmentId: savedDoc ? savedDoc._id : null,
                savedAt: savedDoc ? savedDoc.createdAt : new Date(),
                isSaved: !!savedDoc,
                isGuest: false
            });
        }

        // GUEST USER: Return full prediction & SHAP results, but do NOT store to MongoDB
        return res.json({
            ...publicResult,
            assessmentId: null,
            savedAt: null,
            isSaved: false,
            isGuest: true
        });

    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({
            error: error.message || 'An error occurred during prediction'
        });
    }
});

// GET /api/assessments (History)
// Strictly requires valid JWT. Only returns assessments belonging to the logged-in user.
router.get('/assessments', verifyToken, async (req, res) => {
    try {
        const userId = req.userId;

        const assessments = await Assessment.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            count: assessments.length,
            assessments
        });
    } catch (error) {
        console.error('Fetch assessments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/assessments/:id
// Strictly requires valid JWT. Only allows access to the user's own assessment.
router.get('/assessments/:id', verifyToken, async (req, res) => {
    try {
        const assessment = await Assessment.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!assessment) {
            return res.status(404).json({ error: 'Assessment record not found' });
        }
        res.json(assessment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/assessments/:id
// Strictly requires valid JWT. Only allows deletion of the user's own assessment.
router.delete('/assessments/:id', verifyToken, async (req, res) => {
    try {
        const deleted = await Assessment.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Assessment record not found' });
        }
        res.json({ message: 'Assessment record deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET /api/model/insights (Research, Benchmark & Feature Insights)
router.get('/model/insights', (req, res) => {
    try {
        const csvPath = path.join(__dirname, '..', '..', 'ML_Model', 'Results', 'model_comparison.csv');
        let modelsComparison = [
            { model: 'Gradient Boosting', accuracy: 75.18, precision: 0.565, recall: 0.752, f1: 0.645, isBest: true },
            { model: 'Random Forest', accuracy: 75.17, precision: 0.565, recall: 0.752, f1: 0.645, isBest: false },
            { model: 'Extra Trees', accuracy: 75.17, precision: 0.627, recall: 0.752, f1: 0.645, isBest: false },
            { model: 'CatBoost', accuracy: 75.15, precision: 0.648, recall: 0.751, f1: 0.646, isBest: false },
            { model: 'MLP Classifier', accuracy: 75.11, precision: 0.580, recall: 0.751, f1: 0.645, isBest: false },
            { model: 'XGBoost', accuracy: 74.70, precision: 0.623, recall: 0.747, f1: 0.647, isBest: false }
        ];

        if (fs.existsSync(csvPath)) {
            const raw = fs.readFileSync(csvPath, 'utf-8');
            const lines = raw.trim().split('\n');
            if (lines.length > 1) {
                const parsed = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',').map(s => s.trim());
                    if (cols.length >= 5) {
                        parsed.push({
                            model: cols[0],
                            accuracy: parseFloat((parseFloat(cols[1]) * (parseFloat(cols[1]) <= 1 ? 100 : 1)).toFixed(2)),
                            precision: parseFloat(parseFloat(cols[2]).toFixed(3)),
                            recall: parseFloat(parseFloat(cols[3]).toFixed(3)),
                            f1: parseFloat(parseFloat(cols[4]).toFixed(3)),
                            isBest: i === 1
                        });
                    }
                }
                if (parsed.length > 0) modelsComparison = parsed;
            }
        }

        const globalFeatureImportance = [
            { feature: 'Daily Steps', importance: 18.66, category: 'Lifestyle', desc: 'Primary physical activity indicator' },
            { feature: 'Calories Consumed', importance: 12.56, category: 'Nutrition', desc: 'Daily dietary energy balance' },
            { feature: 'BMI', importance: 10.62, category: 'Physiological', desc: 'Body mass to height ratio' },
            { feature: 'Systolic Blood Pressure', importance: 10.16, category: 'Cardiovascular', desc: 'Arterial pressure during contraction' },
            { feature: 'Cholesterol', importance: 8.54, category: 'Lipids', desc: 'Serum cholesterol concentration' },
            { feature: 'Sleep Duration', importance: 6.53, category: 'Recovery', desc: 'Circadian rest and recuperation' },
            { feature: 'Diastolic Blood Pressure', importance: 5.53, category: 'Cardiovascular', desc: 'Arterial pressure during rest' },
            { feature: 'Resting Heart Rate', importance: 5.07, category: 'Cardiovascular', desc: 'Baseline cardiac efficiency' },
            { feature: 'Age', importance: 4.20, category: 'Demographics', desc: 'Chronological biological age' },
            { feature: 'Water Intake', importance: 3.85, category: 'Hydration', desc: 'Daily fluid volume' },
            { feature: 'Alcohol Intake', importance: 0.61, category: 'Habits', desc: 'Ethanol intake frequency' },
            { feature: 'Smoking Status', importance: 0.40, category: 'Habits', desc: 'Nicotine and smoke exposure' },
            { feature: 'Family History', importance: 0.35, category: 'Genetics', desc: 'Hereditary cardiovascular/metabolic risks' }
        ];

        res.json({
            modelsComparison,
            globalFeatureImportance,
            datasetStats: {
                totalSamples: 100000,
                targetVariable: 'Disease Risk (Binary)',
                positiveClassRatio: '24.8%',
                bestModel: 'Gradient Boosting (Scikit-Learn)',
                xaiFramework: 'SHAP (SHapley Additive exPlanations)',
                trainingSplit: '80% Train, 20% Stratified Test'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

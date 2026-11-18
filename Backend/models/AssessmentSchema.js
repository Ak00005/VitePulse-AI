const mongoose = require('mongoose');
const { Schema } = mongoose;

const assessmentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    guestId: {
        type: String,
        default: null
    },
    inputs: {
        age: Number,
        gender: String,
        bmi: Number,
        daily_steps: Number,
        sleep_hours: Number,
        water_intake_l: Number,
        calories_consumed: Number,
        smoker: Number,
        alcohol: Number,
        resting_hr: Number,
        systolic_bp: Number,
        diastolic_bp: Number,
        cholesterol: Number,
        family_history: Number
    },
    provenance: {
        type: Schema.Types.Mixed,
        default: {}
    },
    prediction: {
        disease_risk_detected: Boolean,
        prediction_code: Number,
        risk_score: Number,
        safe_score: Number,
        risk_level: String,
        risk_color: String,
        base_value: Number
    },
    shap_factors: [{
        feature: String,
        user_value: Number,
        shap_value: Number,
        direction: String,
        impact: Number
    }],
    top_risk_drivers: [{
        feature: String,
        user_value: Number,
        shap_value: Number,
        direction: String,
        impact: Number
    }],
    top_protective_factors: [{
        feature: String,
        user_value: Number,
        shap_value: Number,
        direction: String,
        impact: Number
    }],
    recommendations: [{
        category: String,
        severity: String,
        title: String,
        advice: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

assessmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);

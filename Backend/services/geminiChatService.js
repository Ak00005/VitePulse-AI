require('dotenv').config();
const assistantTools = require('./assistantTools');

const SYSTEM_INSTRUCTION = `You are VitaPulse Assistant, the intelligent, supportive companion inside the VitaPulse AI lifestyle health platform.

Your capabilities:
1. Explain how VitaPulse AI works: it evaluates 14 lifestyle and biometric parameters using a trained Gradient Boosting classifier and SHAP (SHapley Additive exPlanations) to estimate lifestyle-based disease risk.
2. Retrieve and summarize the user's assessments, risk score trends, and SHAP explanations using your provided tools.
3. Compare the user's assessments and explain what lifestyle factors improved or need attention.
4. Navigate the user to relevant tabs (predictor, history, comparison, assistant) using the navigateTo tool.

CRITICAL SECURITY AND SAFETY RULES:
- You must NEVER attempt to modify, override, or fake any assessment data, risk scores, or database records. If asked to change a score or delete records, explain politely that you cannot modify or delete assessment results.
- You must NEVER make definitive medical diagnoses or prescribe medications/treatments. Always clarify that scores are AI-generated estimates based on self-reported lifestyle factors, not medical diagnoses.
- Never quote or present internal clinical vital estimates (such as blood pressure, resting heart rate, or cholesterol numbers) as measured clinical lab tests. Always focus explanations and summaries on reported lifestyle behaviors: physical activity, sleep quality, dietary balance, hydration, and habits.
- When summarizing or comparing, keep responses concise, formatted with clear bullet points, and avoid raw database dumps.
- When the user asks to open or view a page (e.g. "open comparison", "take me to predictor", "show my history"), ALWAYS call the navigateTo tool.
- If a tool reports that authentication is required or no assessments are found, gently guide the user to sign in or complete their first assessment.`;

/**
 * Execute a specific tool safely with the verified userId
 */
async function executeTool(name, args, userId) {
    switch (name) {
        case 'getLatestAssessment':
            return await assistantTools.getLatestAssessment(userId);
        case 'getAssessmentHistory':
            return await assistantTools.getAssessmentHistory(userId, args);
        case 'getAssessmentById':
            return await assistantTools.getAssessmentById(userId, args);
        case 'compareAssessments':
            return await assistantTools.compareAssessments(userId, args);
        case 'getRiskTrend':
            return await assistantTools.getRiskTrend(userId);
        case 'getLatestSHAP':
            return await assistantTools.getLatestSHAP(userId);
        case 'navigateTo':
            return assistantTools.navigateTo(args);
        default:
            return { error: `Unknown tool: ${name}` };
    }
}

/**
 * Fallback intent engine in case Gemini API is unreachable or rate-limited
 */
async function fallbackIntentEngine(message, userId) {
    const text = (message || '').toLowerCase();
    const actions = [];
    let toolResult = null;
    let reply = '';

    // Check for dangerous requests
    if (text.includes('change my risk') || text.includes('override') || text.includes('modify score') || text.includes('set my score')) {
        return {
            message: "I can't manually change or override an AI assessment result. Your risk score is computed objectively by the trained machine learning model based on your vitals and lifestyle inputs.",
            actions: [{ type: 'navigate', page: 'predictor', label: 'Take New Assessment' }]
        };
    }
    if (text.includes('delete') && (text.includes('assessment') || text.includes('all') || text.includes('record') || text.includes('history'))) {
        return {
            message: "Deleting assessments or modifying records is not available through the assistant for safety and record integrity. You can manage individual records directly from the Assessment History page.",
            actions: [{ type: 'navigate', page: 'history', label: 'Open Assessment History' }]
        };
    }

    // Navigation requests (flexible phrase detection)
    const isNavigationIntent = text.includes('open') || text.includes('go to') || text.includes('navigate') || text.includes('take me to') || text.includes('show me');
    
    if (text.includes('comparison') && isNavigationIntent) {
        return {
            message: "Sure — I've opened your Assessment Comparison tab so you can visually inspect your lifestyle changes.",
            action: { type: 'navigate', page: 'comparison' },
            actions: [{ type: 'navigate', page: 'comparison', label: 'Open Assessment Comparison' }]
        };
    }
    if ((text.includes('predictor') || text.includes('assessment form') || text.includes('new assessment') || text.includes('take assessment')) && isNavigationIntent) {
        return {
            message: "Opening the Risk Predictor form for you. Enter your current vitals and daily habits to calculate a fresh assessment.",
            action: { type: 'navigate', page: 'predictor' },
            actions: [{ type: 'navigate', page: 'predictor', label: 'Open Risk Predictor' }]
        };
    }
    if ((text.includes('history') || text.includes('records') || text.includes('past assessments')) && isNavigationIntent) {
        return {
            message: "Navigating to your Assessment History where all your past evaluations are securely saved.",
            action: { type: 'navigate', page: 'history' },
            actions: [{ type: 'navigate', page: 'history', label: 'Open Assessment History' }]
        };
    }

    // Comparison requests
    if (text.includes('compare') || text.includes('what changed') || text.includes('difference')) {
        toolResult = await executeTool('compareAssessments', {}, userId);
        if (toolResult.error || toolResult.message) {
            return {
                message: toolResult.error || toolResult.message,
                actions: [{ type: 'navigate', page: 'predictor', label: 'Take Assessment' }]
            };
        }
        const sign = toolResult.riskChangePercentagePoints < 0 ? '↓' : toolResult.riskChangePercentagePoints > 0 ? '↑' : '';
        const absDiff = Math.abs(toolResult.riskChangePercentagePoints);
        reply = `**Your Assessment Comparison**\n\n` +
            `• **Previous:** ${toolResult.previousAssessment.riskScore}% (${toolResult.previousAssessment.riskLevel})\n` +
            `• **Current:** ${toolResult.currentAssessment.riskScore}% (${toolResult.currentAssessment.riskLevel})\n` +
            `• **Change:** ${sign}${absDiff} percentage points (${toolResult.trajectory})\n\n`;

        if (toolResult.majorImprovements?.length > 0) {
            reply += `**Top Improvements:**\n` + toolResult.majorImprovements.slice(0, 3).map(i => `• ${i.parameter}: ${i.previous} → ${i.current} (${i.change})`).join('\n') + '\n\n';
        }
        if (toolResult.areasThatWorsened?.length > 0) {
            reply += `**Areas to Watch:**\n` + toolResult.areasThatWorsened.slice(0, 3).map(w => `• ${w.parameter}: ${w.previous} → ${w.current} (${w.change})`).join('\n') + '\n\n';
        }
        reply += `*VitaPulse AI provides an estimated score based on self-reported data and is not a clinical diagnosis.*`;
        return {
            message: reply,
            action: { type: 'navigate', page: 'comparison' },
            actions: [{ type: 'navigate', page: 'comparison', label: 'Open Assessment Comparison' }]
        };
    }

    // Risk trend / progress
    if (text.includes('trend') || text.includes('progress') || text.includes('am i improving') || text.includes('getting better') || text.includes('how am i doing')) {
        toolResult = await executeTool('getRiskTrend', {}, userId);
        if (toolResult.error || toolResult.message) {
            return {
                message: toolResult.error || toolResult.message,
                actions: [{ type: 'navigate', page: 'predictor', label: 'Run Assessment' }]
            };
        }
        const trendList = toolResult.trend.map(t => `${t.date}: **${t.riskScore}%** (${t.riskLevel})`).join(' → ');
        reply = `**Your Risk Score Trajectory**\n\n` +
            `Across your saved assessments: ${trendList}\n\n` +
            `Overall trajectory: **${toolResult.trajectory.toUpperCase()}** (${toolResult.overallChange > 0 ? '+' : ''}${toolResult.overallChange} percentage points net change).\n\n` +
            `*Tip: Maintain consistent physical activity and optimal sleep to sustain positive health trajectories.*`;
        return {
            message: reply,
            actions: [
                { type: 'navigate', page: 'comparison', label: 'Compare Assessments' },
                { type: 'navigate', page: 'history', label: 'View Full History' }
            ]
        };
    }

    // SHAP / explanation requests
    if (text.includes('shap') || text.includes('explain') || text.includes('why') || text.includes('factors') || text.includes('drivers')) {
        toolResult = await executeTool('getLatestSHAP', {}, userId);
        if (toolResult.error || toolResult.message) {
            return {
                message: toolResult.error || toolResult.message,
                actions: [{ type: 'navigate', page: 'predictor', label: 'Run Assessment' }]
            };
        }
        reply = `**Your AI Model Explanation (SHAP)**\n\n` +
            `Your latest estimated risk is **${toolResult.riskScore}%** (${toolResult.riskLevel}). Here is what influenced the machine learning model:\n\n`;
        if (toolResult.topRiskDrivers?.length > 0) {
            reply += `🔴 **Key Risk Drivers (Escalating Factors):**\n` + toolResult.topRiskDrivers.slice(0, 3).map(d => `• **${d.parameter}** (Measured: ${d.measuredValue})`).join('\n') + '\n\n';
        }
        if (toolResult.topProtectiveFactors?.length > 0) {
            reply += `🟢 **Key Protective Factors:**\n` + toolResult.topProtectiveFactors.slice(0, 3).map(p => `• **${p.parameter}** (Measured: ${p.measuredValue})`).join('\n') + '\n\n';
        }
        reply += `*Note: SHAP values represent statistical feature attribution in the Gradient Boosting model, not direct biological causation.*`;
        return {
            message: reply,
            actions: [{ type: 'navigate', page: 'predictor', label: 'View Full Diagnostic' }]
        };
    }

    // Latest assessment / score
    if (text.includes('latest') || text.includes('last score') || text.includes('last assessment') || text.includes('recent')) {
        toolResult = await executeTool('getLatestAssessment', {}, userId);
        if (toolResult.error || toolResult.message) {
            return {
                message: toolResult.error || toolResult.message,
                actions: [{ type: 'navigate', page: 'predictor', label: 'Run Assessment' }]
            };
        }
        reply = `**Your Latest Assessment (${toolResult.date})**\n\n` +
            `• **Estimated Risk:** ${toolResult.riskScore}% (${toolResult.riskLevel})\n` +
            `• **Daily Steps:** ${toolResult.inputs?.daily_steps ? toolResult.inputs.daily_steps.toLocaleString() : 'N/A'} steps\n` +
            `• **BMI:** ${toolResult.inputs?.bmi || 'N/A'} kg/m²\n` +
            `• **Sleep:** ${toolResult.inputs?.sleep_hours || 'N/A'} hrs/night\n` +
            `• **Caloric Intake:** ${toolResult.inputs?.calories_consumed ? toolResult.inputs.calories_consumed.toLocaleString() : 'N/A'} kcal\n\n`;
        if (toolResult.topRiskDrivers?.length > 0) {
            reply += `Primary risk driver: **${toolResult.topRiskDrivers[0].feature}**.\n`;
        }
        return {
            message: reply,
            actions: [
                { type: 'navigate', page: 'comparison', label: 'Compare With Previous' },
                { type: 'navigate', page: 'history', label: 'View Assessment History' }
            ]
        };
    }

    // General Educational / FAQ responses
    if (text.includes('bmi')) {
        return {
            message: "Body Mass Index (BMI) is a screening ratio calculated as weight in kilograms divided by height in meters squared (kg/m²). Normal range is typically 18.5–24.9. In VitaPulse AI, BMI is one of the foundational indicators evaluated by the Gradient Boosting model alongside physical activity and diet.",
            actions: [{ type: 'navigate', page: 'predictor', label: 'Check Your BMI' }]
        };
    }
    if (text.includes('blood pressure') || text.includes('systolic') || text.includes('diastolic')) {
        return {
            message: "In VitaPulse AI, you don't need to manually enter blood pressure or clinical vitals. The platform automatically derives baseline metabolic load internally from your age, body composition, physical activity, and dietary habits so you can focus on lifestyle improvements.",
            actions: [{ type: 'navigate', page: 'predictor', label: 'Take an Assessment' }]
        };
    }

    return {
        message: "Hello! I am your VitaPulse Assistant. I can help you understand your health risk assessments, compare your progress over time, explain SHAP model factors, or navigate through the dashboard. Try asking: *'Summarize my latest assessment'* or *'Compare my last two assessments'*.",
        actions: [
            { type: 'navigate', page: 'predictor', label: 'Open Predictor' },
            { type: 'navigate', page: 'comparison', label: 'Open Comparison' }
        ]
    };
}

/**
 * Main chat handler: orchestrates Gemini API call with function calling, falls back seamlessly
 */
async function processChatMessage({ message, history = [], userId }) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return await fallbackIntentEngine(message, userId);
    }

    try {
        // Build contents history
        const contents = [];

        // Add sanitized previous turns (last 6 messages max for context)
        const recentHistory = (history || []).slice(-6);
        for (const item of recentHistory) {
            if (item.sender === 'user') {
                contents.push({ role: 'user', parts: [{ text: item.text }] });
            } else if (item.sender === 'assistant' || item.sender === 'bot') {
                contents.push({ role: 'model', parts: [{ text: item.text }] });
            }
        }

        // Add current user message
        contents.push({ role: 'user', parts: [{ text: message }] });

        const requestBody = {
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            contents,
            tools: [{
                functionDeclarations: assistantTools.toolDeclarations
            }]
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        if (!geminiRes.ok) {
            const errData = await geminiRes.text();
            console.warn('Gemini API returned error, activating fallback:', errData);
            return await fallbackIntentEngine(message, userId);
        }

        const data = await geminiRes.json();
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content) {
            return await fallbackIntentEngine(message, userId);
        }

        const actions = [];
        let primaryAction = null;
        const functionCallPart = candidate.content.parts?.find(p => p.functionCall);

        // If Gemini requested a tool execution
        if (functionCallPart && functionCallPart.functionCall) {
            const { name, args } = functionCallPart.functionCall;
            const toolResult = await executeTool(name, args || {}, userId);

            // Handle navigation action
            if (name === 'navigateTo' && toolResult.success) {
                primaryAction = { type: 'navigate', page: toolResult.page };
                actions.push({ type: 'navigate', page: toolResult.page, label: `Go to ${toolResult.page}` });
            } else if (name === 'compareAssessments') {
                actions.push({ type: 'navigate', page: 'comparison', label: 'Open Assessment Comparison' });
            } else if (name === 'getLatestAssessment' || name === 'getLatestSHAP') {
                actions.push({ type: 'navigate', page: 'predictor', label: 'View in Predictor' });
            } else if (name === 'getRiskTrend' || name === 'getAssessmentHistory') {
                actions.push({ type: 'navigate', page: 'history', label: 'Open Assessment History' });
            }

            // Send tool result back to Gemini for natural language synthesis
            const secondTurnContents = [
                ...contents,
                candidate.content,
                {
                    role: 'user',
                    parts: [{
                        functionResponse: {
                            name,
                            response: toolResult
                        }
                    }]
                }
            ];

            const secondController = new AbortController();
            const secondTimeout = setTimeout(() => secondController.abort(), 10000);

            const secondRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                        contents: secondTurnContents
                    }),
                    signal: secondController.signal
                }
            );

            clearTimeout(secondTimeout);

            if (secondRes.ok) {
                const secondData = await secondRes.json();
                const textPart = secondData.candidates?.[0]?.content?.parts?.find(p => p.text);
                if (textPart && textPart.text) {
                    return {
                        message: textPart.text,
                        action: primaryAction,
                        actions,
                        toolExecuted: name
                    };
                }
            }

            // If second call failed, format a clear fallback response using the tool output
            return await fallbackIntentEngine(message, userId);
        }

        // Direct text response from Gemini (e.g. general FAQ question)
        const textPart = candidate.content.parts?.find(p => p.text);
        if (textPart && textPart.text) {
            return {
                message: textPart.text,
                action: primaryAction,
                actions
            };
        }

        return await fallbackIntentEngine(message, userId);
    } catch (err) {
        console.warn('Gemini chat error, running fallback:', err.message);
        return await fallbackIntentEngine(message, userId);
    }
}

module.exports = {
    processChatMessage,
    executeTool,
    fallbackIntentEngine
};

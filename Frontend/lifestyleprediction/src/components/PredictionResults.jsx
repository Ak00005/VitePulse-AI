import React, { useState } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  Sparkles, CheckCircle2, ChevronRight, Activity, Printer, RotateCcw,
  Info, ExternalLink
} from 'lucide-react';

function PredictionResults({ result, onRetest, user, onOpenAuth, onNavigateHistory }) {
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'risk', 'protective'

  if (!result) return null;

  const {
    disease_risk_detected,
    risk_score,
    safe_score,
    risk_level,
    risk_color,
    shap_factors = [],
    top_risk_drivers = [],
    top_protective_factors = [],
    recommendations = [],
    inputs_processed = {},
    isGuest,
    isSaved
  } = result;

  const isGuestMode = isGuest !== undefined ? isGuest : !user;

  const CLINICAL_FEATURES = new Set(['systolic_bp', 'diastolic_bp', 'resting_hr', 'cholesterol']);

  const visibleShapFactors = (shap_factors || []).filter(f => !CLINICAL_FEATURES.has(f.feature));
  const visibleRiskDrivers = (top_risk_drivers || []).filter(f => !CLINICAL_FEATURES.has(f.feature));
  const visibleProtectiveFactors = (top_protective_factors || []).filter(f => !CLINICAL_FEATURES.has(f.feature));

  const filteredFactors = visibleShapFactors.filter(f => {
    if (filterMode === 'risk') return f.direction === 'increases_risk';
    if (filterMode === 'protective') return f.direction === 'decreases_risk';
    return true;
  });

  // Friendly feature labels and units
  const featureMeta = {
    daily_steps: { label: 'Daily Steps', unit: 'steps' },
    calories_consumed: { label: 'Calories Consumed', unit: 'kcal' },
    bmi: { label: 'Body Mass Index', unit: 'kg/m²' },
    sleep_hours: { label: 'Sleep Duration', unit: 'hours' },
    water_intake_l: { label: 'Water Intake', unit: 'L' },
    age: { label: 'Age', unit: 'years' },
    alcohol: { label: 'Alcohol Intake', unit: inputs_processed.alcohol ? 'Regular' : 'None' },
    smoker: { label: 'Smoking Status', unit: inputs_processed.smoker ? 'Smoker' : 'Non-smoker' },
    gender: { label: 'Biological Sex', unit: inputs_processed.gender === 1 ? 'Male' : 'Female' },
    family_history: { label: 'Family History', unit: inputs_processed.family_history ? 'Positive' : 'None' }
  };

  // Find max impact for proportional bar rendering
  const maxImpact = Math.max(...visibleShapFactors.map(f => f.impact || 0.01), 0.01);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Account & Storage Status Banner */}
      {isGuestMode ? (
        <div className="glass-panel" style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(30, 41, 59, 0.75)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Info size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                Guest Mode — Real-time Results Only
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                You can view complete results and SHAP factors, but your history is not stored in the database.
              </div>
            </div>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <span>Sign In to Save History</span>
            </button>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderLeft: '4px solid #10b981',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                Stored to Personal Medical History ({user ? user.username : 'Authenticated User'})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                This diagnostic record is linked to your account via JWT authentication and available in your history.
              </div>
            </div>
          </div>
          {onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <span>View Assessment History</span>
            </button>
          )}
        </div>
      )}
      
      {/* Top Banner: Verdict & Gauge */}
      <div className="glass-panel" style={{
        padding: '32px',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `6px solid ${disease_risk_detected ? '#ef4444' : '#10b981'}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          {/* Verdict Info */}
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '9999px',
                background: disease_risk_detected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: disease_risk_detected ? '#f87171' : '#34d399',
                border: `1px solid ${disease_risk_detected ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {disease_risk_detected ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                {risk_level.toUpperCase()}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Gradient Boosting Model Output
              </span>
            </div>

            <h2 style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '10px',
              lineHeight: 1.2
            }}>
              {disease_risk_detected 
                ? 'Elevated Lifestyle & Disease Risk Detected'
                : 'Optimal Health Profile — Low Disease Risk'}
            </h2>

            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {disease_risk_detected
                ? `Based on multimodal evaluation of your lifestyle profile, activity, and daily habits, the AI model estimates an elevated likelihood of lifestyle-related disease (${risk_score}% probability). Key contributors include lifestyle strain or activity deficits.`
                : `Your biometrics and lifestyle habits align favorably with a low-risk profile (${safe_score}% healthy probability). Continuing regular physical movement and balanced nutrition strongly defends against metabolic chronic illness.`}
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={onRetest}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                <RotateCcw size={14} />
                <span>Adjust Parameters & Retest</span>
              </button>
              <button
                onClick={() => window.print()}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                <Printer size={14} />
                <span>Print Diagnostic Summary</span>
              </button>
            </div>
          </div>

          {/* Risk Gauge Meter */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 32px',
            borderRadius: '20px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: '220px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Risk Probability
            </span>
            <div style={{
              fontSize: '52px',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: disease_risk_detected ? '#ef4444' : '#10b981',
              lineHeight: 1,
              margin: '10px 0'
            }}>
              {risk_score}%
            </div>
            
            {/* Visual Risk Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              borderRadius: '9999px',
              background: '#334155',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(risk_score, 100)}%`,
                background: disease_risk_detected 
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  : 'linear-gradient(90deg, #10b981, #06b6d4)',
                borderRadius: '9999px',
                transition: 'width 0.8s ease'
              }} />
            </div>

            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Confidence Baseline: 75.2% Accuracy
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side: Top Risk Drivers vs Top Protective Factors */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {/* Risk Drivers */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <ArrowUpRight size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#f87171' }}>Key Risk Drivers (Escalating Factors)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Variables shifting prediction toward disease risk</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleRiskDrivers.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                No significant risk escalators identified.
              </p>
            ) : (
              visibleRiskDrivers.map((factor, idx) => {
                const meta = featureMeta[factor.feature] || { label: factor.feature, unit: '' };
                return (
                  <div key={idx} style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{meta.label}</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        Value: {factor.user_value} {meta.unit}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#f87171',
                        background: 'rgba(239, 68, 68, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        +{factor.impact.toFixed(4)} SHAP
                      </span>
                      <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Increases Risk</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Protective Factors */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <ArrowDownRight size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', margin: 0, color: '#34d399' }}>Protective Strengths (Mitigating Factors)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Variables pulling prediction toward health baseline</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleProtectiveFactors.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                No significant protective factors detected.
              </p>
            ) : (
              visibleProtectiveFactors.map((factor, idx) => {
                const meta = featureMeta[factor.feature] || { label: factor.feature, unit: '' };
                return (
                  <div key={idx} style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{meta.label}</span>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        Value: {factor.user_value} {meta.unit}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#34d399',
                        background: 'rgba(16, 185, 129, 0.15)',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        -{factor.impact.toFixed(4)} SHAP
                      </span>
                      <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>Lowers Risk</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SHAP Explainable AI Waterfall / Feature Contribution Chart */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#06b6d4" />
              <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Explainable AI (XAI) — Local Feature Attribution</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Exact SHapley Additive exPlanations (SHAP) quantifying how each parameter influenced the final risk determination.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px' }}>
            {[
              { id: 'all', label: 'All Factors' },
              { id: 'risk', label: 'Risk Drivers (+)' },
              { id: 'protective', label: 'Protective (-)' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setFilterMode(pill.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: filterMode === pill.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: filterMode === pill.id ? '#ffffff' : 'var(--text-dim)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Contribution Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredFactors.map((factor, idx) => {
            const meta = featureMeta[factor.feature] || { label: factor.feature, unit: '' };
            const isRisk = factor.direction === 'increases_risk';
            const barWidthPercent = Math.min((factor.impact / maxImpact) * 100, 100);

            return (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr 140px',
                alignItems: 'center',
                gap: '16px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.4)'
              }}>
                {/* Feature Label & Value */}
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'block' }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {factor.user_value} {meta.unit}
                  </span>
                </div>

                {/* Relative Contribution Bar */}
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{
                    width: '100%',
                    height: '10px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${barWidthPercent}%`,
                      background: isRisk
                        ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.4), #ef4444)'
                        : factor.direction === 'decreases_risk'
                        ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), #10b981)'
                        : '#64748b',
                      borderRadius: '9999px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* SHAP Value Metric */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: isRisk ? '#f87171' : factor.direction === 'decreases_risk' ? '#34d399' : 'var(--text-dim)'
                  }}>
                    {factor.shap_value > 0 ? `+${factor.shap_value}` : factor.shap_value}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    marginLeft: '6px',
                    color: 'var(--text-dim)'
                  }}>
                    SHAP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tailored Lifestyle & Clinical Action Plan */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>Tailored Clinical & Lifestyle Recommendations</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Evidence-backed modifications prioritized by severity</p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {recommendations.map((rec, idx) => {
            const isHigh = rec.severity === 'high';
            const isMed = rec.severity === 'medium';
            const badgeColor = isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981';

            return (
              <div key={idx} style={{
                padding: '18px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      {rec.category}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: `${badgeColor}20`,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}40`
                    }}>
                      {rec.severity.toUpperCase()} PRIORITY
                    </span>
                  </div>

                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                    {rec.title}
                  </h4>

                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {rec.advice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default PredictionResults;

import React, { useState, useEffect, useMemo } from 'react';
import {
  GitCompareArrows, ArrowRight, Activity, AlertCircle, Lock, UserCheck,
  TrendingUp, TrendingDown, Minus, Award, AlertTriangle, ChevronDown,
  Calendar, ShieldCheck, ShieldAlert, RefreshCw, Sparkles, Info,
  CheckCircle2, Heart, Footprints, Moon as MoonIcon, Droplets, Flame,
  Cigarette, Wine, Dna
} from 'lucide-react';
import { getApiUrl } from '../utils/api';

// ─── Parameter metadata for labelling, units, and interpretation ────────────
const PARAM_META = {
  age:               { label: 'Age',                     unit: 'years',  category: 'Demographics',    isCategorical: false, lowerIsBetter: null },
  gender:            { label: 'Gender',                   unit: '',       category: 'Demographics',    isCategorical: true },
  bmi:               { label: 'BMI',                      unit: 'kg/m²',  category: 'Body Composition', isCategorical: false, lowerIsBetter: true,  idealRange: [18.5, 25] },
  daily_steps:       { label: 'Daily Steps',              unit: 'steps',  category: 'Physical Activity', isCategorical: false, lowerIsBetter: false },
  sleep_hours:       { label: 'Sleep Duration',           unit: 'hrs',    category: 'Sleep',           isCategorical: false, lowerIsBetter: null,  idealRange: [7, 9] },
  water_intake_l:    { label: 'Water Intake',             unit: 'L',      category: 'Hydration',       isCategorical: false, lowerIsBetter: false },
  calories_consumed: { label: 'Caloric Intake',           unit: 'kcal',   category: 'Diet',            isCategorical: false, lowerIsBetter: true,  idealRange: [1800, 2400] },
  smoker:            { label: 'Smoking',                  unit: '',       category: 'Habits',          isCategorical: true },
  alcohol:           { label: 'Alcohol',                  unit: '',       category: 'Habits',          isCategorical: true },
  family_history:    { label: 'Family History',           unit: '',       category: 'Genetics',        isCategorical: true }
};

// Lifestyle categories we aggregate for the "Lifestyle Progress" section
const LIFESTYLE_GROUPS = {
  'Physical Activity': ['daily_steps'],
  'Sleep':             ['sleep_hours'],
  'Body Composition':  ['bmi'],
  'Diet':              ['calories_consumed', 'water_intake_l'],
  'Habits':            ['smoker', 'alcohol']
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const fmtNum = (v) => {
  if (v == null) return '—';
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return String(v);
};

const binaryLabel = (key, val) => {
  if (key === 'smoker') return val ? 'Yes' : 'No';
  if (key === 'alcohol') return val ? 'Yes' : 'No';
  if (key === 'family_history') return val ? 'Yes' : 'No';
  return String(val);
};

/**
 * Determine whether a change in a parameter is beneficial, harmful, or neutral.
 * Returns 'good', 'bad', or 'neutral'.
 */
function interpretChange(key, prevVal, curVal) {
  const meta = PARAM_META[key];
  if (!meta || meta.isCategorical) return 'neutral';
  const diff = curVal - prevVal;
  if (Math.abs(diff) < 0.001) return 'neutral';

  // Sleep has an ideal range — too much or too little is not great
  if (meta.idealRange) {
    const [lo, hi] = meta.idealRange;
    // Moving closer to ideal range is good
    const prevDist = prevVal < lo ? lo - prevVal : prevVal > hi ? prevVal - hi : 0;
    const curDist  = curVal < lo  ? lo - curVal  : curVal > hi  ? curVal - hi  : 0;
    if (curDist < prevDist) return 'good';
    if (curDist > prevDist) return 'bad';
    return 'neutral';
  }

  if (meta.lowerIsBetter === true)  return diff < 0 ? 'good' : 'bad';
  if (meta.lowerIsBetter === false) return diff > 0 ? 'good' : 'bad';
  return 'neutral'; // age, etc.
}

function getRiskStatusMeta(riskScore) {
  if (riskScore <= 40) return { level: 'Low Risk', color: '#10b981' };
  if (riskScore <= 65) return { level: 'Moderate Risk', color: '#f59e0b' };
  return { level: 'High Risk', color: '#ef4444' };
}

// ─── Skeleton loader ────────────────────────────────────────────────────────
function SkeletonCard({ height = 120 }) {
  return (
    <div className="glass-panel" style={{
      padding: '24px',
      minHeight: `${height}px`,
      background: 'var(--bg-card)'
    }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{
          height: '14px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.06)',
          marginBottom: '12px',
          width: `${80 - i * 18}%`,
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      ))}
    </div>
  );
}

// ─── Assessment selector dropdown ───────────────────────────────────────────
function AssessmentSelector({ label, accentColor, assessments, selectedId, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = assessments.find(a => a._id === selectedId);

  return (
    <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
      <label style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 700,
        color: accentColor,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '8px'
      }}>{label}</label>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${accentColor}44`,
          background: `${accentColor}0a`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'left'
        }}
      >
        {selected ? (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              {fmtDate(selected.createdAt)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {selected.prediction?.risk_level || 'Unknown'} — {selected.prediction?.risk_score}%
            </div>
          </div>
        ) : (
          <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Select an assessment...</span>
        )}
        <ChevronDown size={16} color="var(--text-dim)" style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          background: 'rgba(15, 23, 42, 0.97)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          maxHeight: '260px',
          overflowY: 'auto',
          zIndex: 50
        }}>
          {assessments.map(a => {
            const isSelected = a._id === selectedId;
            const riskMeta = getRiskStatusMeta(a.prediction?.risk_score ?? 50);
            return (
              <button
                key={a._id}
                onClick={() => { onChange(a._id); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: isSelected ? `${accentColor}18` : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {fmtDate(a.createdAt)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {a.inputs?.gender || ''}, {a.inputs?.age}y • BMI {a.inputs?.bmi}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: `${riskMeta.color}20`,
                  color: riskMeta.color,
                  border: `1px solid ${riskMeta.color}44`,
                  whiteSpace: 'nowrap'
                }}>
                  {a.prediction?.risk_score}% {riskMeta.level}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
function AssessmentComparison({ user, onOpenAuth, onNavigatePredictor }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prevId, setPrevId] = useState(null);
  const [curId, setCurId] = useState(null);

  // ── Fetch assessments ──────────────────────────────────────────────────
  const fetchAssessments = () => {
    const token = localStorage.getItem('lifestyle_token');
    if (!token) { setAssessments([]); return; }
    setLoading(true);
    setError(null);

    fetch(getApiUrl('/api/assessments'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load assessments');
        return data;
      })
      .then(data => {
        const sorted = (data.assessments || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setAssessments(sorted);
        // Auto-select the two most recent
        if (sorted.length >= 2) {
          setPrevId(sorted[sorted.length - 2]._id);
          setCurId(sorted[sorted.length - 1]._id);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) fetchAssessments();
    else { setAssessments([]); setPrevId(null); setCurId(null); }
  }, [user]);

  // ── Derived state ─────────────────────────────────────────────────────
  const prevAssessment = useMemo(() => assessments.find(a => a._id === prevId), [assessments, prevId]);
  const curAssessment  = useMemo(() => assessments.find(a => a._id === curId), [assessments, curId]);

  const comparison = useMemo(() => {
    if (!prevAssessment || !curAssessment) return null;

    const prevInputs = prevAssessment.inputs || {};
    const curInputs  = curAssessment.inputs  || {};
    const prevPred   = prevAssessment.prediction || {};
    const curPred    = curAssessment.prediction  || {};

    // Parameter diffs
    const paramKeys = Object.keys(PARAM_META);
    const params = paramKeys.map(key => {
      const meta = PARAM_META[key];
      const pv = prevInputs[key];
      const cv = curInputs[key];
      const diff = !meta.isCategorical && pv != null && cv != null ? cv - pv : null;
      const interpretation = !meta.isCategorical ? interpretChange(key, pv, cv) : 'neutral';
      return { key, meta, prevVal: pv, curVal: cv, diff, interpretation };
    });

    // Risk delta
    const riskDiff = (curPred.risk_score ?? 0) - (prevPred.risk_score ?? 0);
    let overallStatus = 'stable';
    if (riskDiff <= -5) overallStatus = 'improving';
    else if (riskDiff >= 5) overallStatus = 'worsening';

    // Top improvements & areas to watch
    const numericParams = params.filter(p => p.diff != null && !p.meta.isCategorical);
    const improvements = numericParams
      .filter(p => p.interpretation === 'good')
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    const concerns = numericParams
      .filter(p => p.interpretation === 'bad')
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    // Lifestyle group progress
    const lifestyleProgress = Object.entries(LIFESTYLE_GROUPS).map(([group, keys]) => {
      const groupParams = params.filter(p => keys.includes(p.key));
      const categorical = groupParams.every(p => p.meta.isCategorical);
      if (categorical) {
        const changed = groupParams.some(p => p.prevVal !== p.curVal);
        return { group, status: changed ? 'changed' : 'no_change' };
      }
      const interpretations = groupParams.map(p => p.interpretation);
      if (interpretations.every(i => i === 'neutral')) return { group, status: 'stable' };
      if (interpretations.some(i => i === 'good') && !interpretations.some(i => i === 'bad')) return { group, status: 'improved' };
      if (interpretations.some(i => i === 'bad') && !interpretations.some(i => i === 'good')) return { group, status: 'declined' };
      return { group, status: 'mixed' };
    });
    const improvedCount = lifestyleProgress.filter(l => l.status === 'improved').length;

    // SHAP comparison (if data exists)
    const prevShap = prevAssessment.shap_factors || [];
    const curShap  = curAssessment.shap_factors  || [];
    const hasShap  = prevShap.length > 0 && curShap.length > 0;

    let shapComparison = [];
    if (hasShap) {
      const shapMap = {};
      prevShap.forEach(s => { shapMap[s.feature] = { prev: s }; });
      curShap.forEach(s => {
        if (!shapMap[s.feature]) shapMap[s.feature] = {};
        shapMap[s.feature].cur = s;
      });
      shapComparison = Object.entries(shapMap)
        .filter(([, v]) => v.prev && v.cur)
        .map(([feature, v]) => ({
          feature,
          label: PARAM_META[feature]?.label || feature,
          prevDirection: v.prev.direction,
          curDirection: v.cur.direction,
          prevImpact: v.prev.impact,
          curImpact: v.cur.impact,
          prevShap: v.prev.shap_value,
          curShap: v.cur.shap_value
        }))
        .sort((a, b) => Math.abs(b.curImpact) - Math.abs(a.curImpact));
    }

    return {
      params,
      prevPred,
      curPred,
      riskDiff,
      overallStatus,
      improvements,
      concerns,
      lifestyleProgress,
      improvedCount,
      hasShap,
      shapComparison
    };
  }, [prevAssessment, curAssessment]);

  // ── Generate recommendations text ─────────────────────────────────────
  const recommendationText = useMemo(() => {
    if (!comparison) return '';
    const { improvements, concerns, overallStatus } = comparison;

    const parts = [];
    if (overallStatus === 'improving') {
      parts.push('Your estimated risk score has decreased since your previous assessment.');
    } else if (overallStatus === 'worsening') {
      parts.push('Your estimated risk score has increased since your previous assessment.');
    } else {
      parts.push('Your estimated risk score has remained relatively stable between these assessments.');
    }

    if (improvements.length > 0) {
      const names = improvements.slice(0, 3).map(p => p.meta.label.toLowerCase());
      parts.push(`Your ${names.join(' and ')} ${improvements.length === 1 ? 'has' : 'have'} shown positive changes. Continue maintaining these habits and reassess periodically.`);
    }
    if (concerns.length > 0) {
      const names = concerns.slice(0, 3).map(p => p.meta.label.toLowerCase());
      parts.push(`Your ${names.join(' and ')} moved in a less favorable direction. Consider gradually adjusting these areas.`);
    }

    return parts.join(' ');
  }, [comparison]);

  // ─── Guest state ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: '720px',
          margin: '20px auto 0 auto',
          border: '1px solid rgba(255,255,255,0.12)'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(59,130,246,0.2) 100%)',
            border: '1px solid rgba(6,182,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px auto', color: '#22d3ee'
          }}>
            <Lock size={32} />
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '9999px',
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
            color: '#fbbf24', fontSize: '12px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px'
          }}>
            <span>Guest Evaluation Mode</span>
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
            Assessment Comparison Requires an Account
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto 28px auto' }}>
            Sign in to track your health assessments over time and compare how your lifestyle and estimated risk have changed.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button onClick={onOpenAuth} className="btn-primary" style={{ fontSize: '14px', padding: '12px 24px' }}>
              <UserCheck size={18} />
              <span>Sign In / Create Account</span>
            </button>
            <button onClick={onNavigatePredictor} className="btn-secondary" style={{ fontSize: '14px', padding: '12px 24px' }}>
              <span>Run Guest Prediction</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SkeletonCard height={80} />
        <SkeletonCard height={160} />
        <SkeletonCard height={200} />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{
          padding: '48px 32px', textAlign: 'center', maxWidth: '600px', margin: '20px auto 0 auto'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto', color: '#ef4444'
          }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '8px' }}>
            We couldn't load your assessment history
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Please check your connection and try again.
          </p>
          <button onClick={fetchAssessments} className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px' }}>
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── No assessments ───────────────────────────────────────────────────
  if (assessments.length === 0) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <PageHeader />
        <div className="glass-panel" style={{ padding: '50px 30px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.05)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto', color: 'var(--text-dim)'
          }}>
            <Activity size={28} />
          </div>
          <h3 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '8px' }}>
            No assessments found
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            Complete your first health assessment on the Risk Predictor tab to get started.
          </p>
          <button onClick={onNavigatePredictor} className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px' }}>
            <span>Take Your First Assessment</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Only 1 assessment ────────────────────────────────────────────────
  if (assessments.length < 2) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <PageHeader />
        <div className="glass-panel" style={{ padding: '50px 30px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'rgba(6,182,212,0.12)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto', color: '#22d3ee'
          }}>
            <GitCompareArrows size={28} />
          </div>
          <h3 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '8px' }}>
            Complete one more assessment to unlock Assessment Comparison
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 20px auto' }}>
            You have 1 assessment on record. Complete at least two health assessments to compare your progress over time.
          </p>
          <button onClick={onNavigatePredictor} className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px' }}>
            <span>Take Another Assessment</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Full comparison view ─────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader />

      {/* ── Assessment Selectors ───────────────────────────────────── */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'flex-start'
      }}>
        <AssessmentSelector
          label="Previous Assessment"
          accentColor="#8b5cf6"
          assessments={assessments}
          selectedId={prevId}
          onChange={setPrevId}
        />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          alignSelf: 'center', padding: '10px',
          borderRadius: '50%', background: 'rgba(255,255,255,0.06)'
        }}>
          <ArrowRight size={20} color="var(--text-dim)" />
        </div>

        <AssessmentSelector
          label="Current Assessment"
          accentColor="#06b6d4"
          assessments={assessments}
          selectedId={curId}
          onChange={setCurId}
        />
      </div>

      {/* Show comparison only when two different assessments are selected */}
      {prevId && curId && prevId !== curId && comparison && (
        <>
          {/* ── Overall Improvement Summary ─────────────────────────── */}
          <div className="glass-panel" style={{
            padding: '32px',
            textAlign: 'center',
            borderLeft: `6px solid ${
              comparison.overallStatus === 'improving' ? '#10b981'
              : comparison.overallStatus === 'worsening' ? '#ef4444'
              : '#f59e0b'
            }`
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>
              {comparison.overallStatus === 'improving' ? '🎉'
               : comparison.overallStatus === 'worsening' ? '⚠️'
               : '📊'}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
              {comparison.overallStatus === 'improving'
                ? 'Your estimated risk is improving'
                : comparison.overallStatus === 'worsening'
                ? 'Your estimated risk needs attention'
                : 'Your estimated risk has remained stable'}
            </h2>

            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: '12px', marginTop: '16px', flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-muted)' }}>
                {comparison.prevPred.risk_score}%
              </span>
              <ArrowRight size={24} color="var(--text-dim)" />
              <span style={{
                fontSize: '28px', fontWeight: 800,
                color: comparison.overallStatus === 'improving' ? '#10b981'
                     : comparison.overallStatus === 'worsening' ? '#ef4444'
                     : '#f59e0b'
              }}>
                {comparison.curPred.risk_score}%
              </span>
            </div>

            <p style={{
              fontSize: '15px', fontWeight: 600, marginTop: '10px',
              color: comparison.overallStatus === 'improving' ? '#34d399'
                   : comparison.overallStatus === 'worsening' ? '#f87171'
                   : '#fbbf24'
            }}>
              {Math.abs(comparison.riskDiff)} percentage point {comparison.riskDiff < 0 ? 'improvement' : comparison.riskDiff > 0 ? 'increase' : 'no change'}
            </p>

            {/* Status indicator */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '9999px', marginTop: '14px',
              background: comparison.overallStatus === 'improving' ? 'rgba(16,185,129,0.15)'
                       : comparison.overallStatus === 'worsening' ? 'rgba(239,68,68,0.15)'
                       : 'rgba(245,158,11,0.15)',
              border: `1px solid ${
                comparison.overallStatus === 'improving' ? 'rgba(16,185,129,0.3)'
                : comparison.overallStatus === 'worsening' ? 'rgba(239,68,68,0.3)'
                : 'rgba(245,158,11,0.3)'
              }`
            }}>
              <span style={{ fontSize: '14px' }}>
                {comparison.overallStatus === 'improving' ? '🟢'
                 : comparison.overallStatus === 'worsening' ? '🔴'
                 : '🟡'}
              </span>
              <span style={{
                fontSize: '13px', fontWeight: 700,
                color: comparison.overallStatus === 'improving' ? '#34d399'
                     : comparison.overallStatus === 'worsening' ? '#f87171'
                     : '#fbbf24'
              }}>
                {comparison.overallStatus === 'improving' ? 'Improving'
                 : comparison.overallStatus === 'worsening' ? 'Needs Attention'
                 : 'Stable'}
              </span>
            </div>
          </div>

          {/* ── Risk Score Visual Comparison ────────────────────────── */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
              Estimated Risk Score Comparison
            </h3>

            {/* Previous bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Previous</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {comparison.prevPred.risk_score}%
                </span>
              </div>
              <div style={{
                height: '14px', borderRadius: '9999px',
                background: 'rgba(255,255,255,0.06)', overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(comparison.prevPred.risk_score, 100)}%`,
                  background: 'linear-gradient(90deg, rgba(139,92,246,0.5), #8b5cf6)',
                  borderRadius: '9999px',
                  transition: 'width 0.8s ease'
                }} />
              </div>
            </div>

            {/* Current bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Current</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {comparison.curPred.risk_score}%
                </span>
              </div>
              <div style={{
                height: '14px', borderRadius: '9999px',
                background: 'rgba(255,255,255,0.06)', overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(comparison.curPred.risk_score, 100)}%`,
                  background: comparison.riskDiff <= 0
                    ? 'linear-gradient(90deg, rgba(16,185,129,0.5), #10b981)'
                    : 'linear-gradient(90deg, rgba(239,68,68,0.5), #ef4444)',
                  borderRadius: '9999px',
                  transition: 'width 0.8s ease'
                }} />
              </div>
            </div>

            <div style={{
              textAlign: 'center', fontSize: '14px', fontWeight: 600,
              color: comparison.riskDiff < 0 ? '#34d399' : comparison.riskDiff > 0 ? '#f87171' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              {comparison.riskDiff < 0 ? <TrendingDown size={16} /> : comparison.riskDiff > 0 ? <TrendingUp size={16} /> : <Minus size={16} />}
              {comparison.riskDiff !== 0
                ? `${comparison.riskDiff < 0 ? '↓' : '↑'} ${Math.abs(comparison.riskDiff)} percentage points`
                : 'No change'}
            </div>
          </div>

          {/* ── Parameter Comparison Table ──────────────────────────── */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
              Lifestyle & Health Parameter Comparison
            </h3>

            {/* Desktop table */}
            <div className="comparison-table-desktop" style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px'
              }}>
                <thead>
                  <tr>
                    {['Parameter', 'Previous', 'Current', 'Change'].map(h => (
                      <th key={h} style={{
                        textAlign: h === 'Parameter' ? 'left' : 'right',
                        padding: '8px 14px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-dim)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.params.map(p => {
                    const indicatorColor = p.interpretation === 'good' ? '#10b981'
                                         : p.interpretation === 'bad'  ? '#ef4444'
                                         : 'var(--text-dim)';
                    return (
                      <tr key={p.key} style={{
                        background: 'rgba(15,23,42,0.4)',
                        borderRadius: '8px'
                      }}>
                        <td style={{
                          padding: '12px 14px', fontSize: '13px', fontWeight: 600,
                          color: 'var(--text-main)', borderRadius: '8px 0 0 8px'
                        }}>
                          {p.meta.label}
                          {p.meta.unit && (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '6px' }}>
                              ({p.meta.unit})
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: '12px 14px', textAlign: 'right',
                          fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)'
                        }}>
                          {p.meta.isCategorical ? binaryLabel(p.key, p.prevVal) : fmtNum(p.prevVal)}
                        </td>
                        <td style={{
                          padding: '12px 14px', textAlign: 'right',
                          fontSize: '13px', fontWeight: 600, color: 'var(--text-main)'
                        }}>
                          {p.meta.isCategorical ? binaryLabel(p.key, p.curVal) : fmtNum(p.curVal)}
                        </td>
                        <td style={{
                          padding: '12px 14px', textAlign: 'right',
                          fontSize: '13px', fontWeight: 700,
                          color: indicatorColor,
                          borderRadius: '0 8px 8px 0',
                          whiteSpace: 'nowrap'
                        }}>
                          {p.meta.isCategorical ? (
                            p.prevVal !== p.curVal
                              ? `${binaryLabel(p.key, p.prevVal)} → ${binaryLabel(p.key, p.curVal)}`
                              : 'No Change'
                          ) : p.diff != null ? (
                            <>
                              {p.interpretation === 'good' ? '🟢 ' : p.interpretation === 'bad' ? '🔴 ' : ''}
                              {p.diff > 0 ? '↑' : p.diff < 0 ? '↓' : '—'}{' '}
                              {Math.abs(p.diff).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (shown via CSS at narrow widths) */}
            <div className="comparison-cards-mobile" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
              {comparison.params.map(p => {
                const indicatorColor = p.interpretation === 'good' ? '#10b981'
                                     : p.interpretation === 'bad'  ? '#ef4444'
                                     : 'var(--text-dim)';
                return (
                  <div key={p.key} style={{
                    padding: '14px 16px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(15,23,42,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {p.meta.label}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: indicatorColor }}>
                        {!p.meta.isCategorical && p.diff != null ? (
                          <>
                            {p.interpretation === 'good' ? '🟢 ' : p.interpretation === 'bad' ? '🔴 ' : ''}
                            {p.diff > 0 ? '↑' : p.diff < 0 ? '↓' : '—'}{' '}
                            {Math.abs(p.diff).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            {p.meta.unit ? ` ${p.meta.unit}` : ''}
                          </>
                        ) : p.meta.isCategorical && p.prevVal !== p.curVal ? 'Changed' : 'No Change'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Previous: {p.meta.isCategorical ? binaryLabel(p.key, p.prevVal) : `${fmtNum(p.prevVal)} ${p.meta.unit}`}</span>
                      <span>Current: {p.meta.isCategorical ? binaryLabel(p.key, p.curVal) : `${fmtNum(p.curVal)} ${p.meta.unit}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Biggest Improvements & Areas to Watch ─── side by side ─ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {/* Biggest Improvements */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  <Award size={18} />
                </div>
                <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: '#34d399' }}>Your Biggest Improvements</h3>
              </div>

              {comparison.improvements.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  No significant positive changes detected between these assessments.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {comparison.improvements.slice(0, 3).map((p, idx) => {
                    const medal = ['🥇', '🥈', '🥉'][idx] || '';
                    const sign = p.diff > 0 ? '+' : '';
                    return (
                      <div key={p.key} style={{
                        padding: '12px 14px', borderRadius: '10px',
                        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>{medal}</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{p.meta.label}</span>
                        </div>
                        <span style={{
                          fontSize: '13px', fontWeight: 700, color: '#34d399',
                          background: 'rgba(16,185,129,0.15)', padding: '3px 10px', borderRadius: '6px'
                        }}>
                          {sign}{p.diff.toLocaleString(undefined, { maximumFractionDigits: 1 })} {p.meta.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Areas to Watch */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                  <AlertTriangle size={18} />
                </div>
                <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: '#fbbf24' }}>Areas to Watch</h3>
              </div>

              {comparison.concerns.length === 0 ? (
                <div style={{
                  padding: '16px', borderRadius: '10px',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  <CheckCircle2 size={18} color="#34d399" />
                  <span style={{ fontSize: '13px', color: '#34d399', fontWeight: 600 }}>
                    Great! No major negative changes were detected between these assessments.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {comparison.concerns.slice(0, 5).map(p => {
                    const sign = p.diff > 0 ? '+' : '';
                    return (
                      <div key={p.key} style={{
                        padding: '12px 14px', borderRadius: '10px',
                        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '16px' }}>⚠️</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{p.meta.label}</span>
                        </div>
                        <span style={{
                          fontSize: '13px', fontWeight: 700, color: '#fbbf24',
                          background: 'rgba(245,158,11,0.15)', padding: '3px 10px', borderRadius: '6px'
                        }}>
                          {sign}{p.diff.toLocaleString(undefined, { maximumFractionDigits: 1 })} {p.meta.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Lifestyle Progress ──────────────────────────────────── */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Lifestyle Progress</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  A simple comparison of your entered values — not a medical measurement
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              marginBottom: '16px'
            }}>
              {comparison.lifestyleProgress.map(lp => {
                const statusLabel = lp.status === 'improved' ? '↑ Improved'
                  : lp.status === 'declined' ? '↓ Declined'
                  : lp.status === 'mixed' ? '↕ Mixed'
                  : lp.status === 'changed' ? '⟳ Changed'
                  : lp.status === 'stable' ? '→ Stable'
                  : '→ No Change';
                const statusColor = lp.status === 'improved' ? '#10b981'
                  : lp.status === 'declined' ? '#ef4444'
                  : lp.status === 'mixed' ? '#f59e0b'
                  : 'var(--text-dim)';
                return (
                  <div key={lp.group} style={{
                    padding: '12px 16px', borderRadius: '10px',
                    background: 'rgba(15,23,42,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{lp.group}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: statusColor }}>{statusLabel}</span>
                  </div>
                );
              })}
            </div>

            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              fontSize: '14px', fontWeight: 600, color: '#93c5fd', textAlign: 'center'
            }}>
              {comparison.improvedCount} of {comparison.lifestyleProgress.length} lifestyle indicators improved
            </div>
          </div>

          {/* ── SHAP Comparison (if available) ──────────────────────── */}
          {comparison.hasShap && (
            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>What Changed in Your AI Explanation?</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    SHAP-based feature attribution comparison between assessments
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '20px'
              }}>
                {/* Previous SHAP */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Previous Assessment
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {comparison.shapComparison.slice(0, 6).map(s => (
                      <div key={`prev-${s.feature}`} style={{
                        padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(15,23,42,0.4)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{s.label}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          color: s.prevDirection === 'increases_risk' ? '#f87171' : '#34d399'
                        }}>
                          {s.prevDirection === 'increases_risk' ? 'Risk contributor' : 'Protective factor'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current SHAP */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Current Assessment
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {comparison.shapComparison.slice(0, 6).map(s => (
                      <div key={`cur-${s.feature}`} style={{
                        padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(15,23,42,0.4)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{s.label}</span>
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          color: s.curDirection === 'increases_risk' ? '#f87171' : '#34d399'
                        }}>
                          {s.curDirection === 'increases_risk'
                            ? (s.curImpact < s.prevImpact ? 'Smaller risk contribution' : 'Risk contributor')
                            : (s.curImpact > s.prevImpact ? 'Stronger protective factor' : 'Protective factor')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Assessment Timeline ─────────────────────────────────── */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>
              Assessment Timeline
            </h3>

            <div style={{
              display: 'flex', flexDirection: 'column',
              paddingLeft: '20px',
              borderLeft: '3px solid rgba(255,255,255,0.1)'
            }}>
              {assessments.map((a, idx) => {
                const isSelected = a._id === prevId || a._id === curId;
                const riskMeta = getRiskStatusMeta(a.prediction?.risk_score ?? 50);
                return (
                  <div key={a._id} style={{
                    position: 'relative',
                    paddingBottom: idx < assessments.length - 1 ? '24px' : '0',
                    paddingLeft: '20px'
                  }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: '-12px', top: '4px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: isSelected ? riskMeta.color : 'rgba(255,255,255,0.15)',
                      border: `3px solid ${isSelected ? riskMeta.color : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: isSelected ? `0 0 10px ${riskMeta.color}44` : 'none'
                    }} />

                    <div style={{
                      fontSize: '14px', fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--text-main)' : 'var(--text-muted)'
                    }}>
                      {fmtDate(a.createdAt)}
                    </div>
                    <div style={{
                      fontSize: '12px', color: isSelected ? riskMeta.color : 'var(--text-dim)',
                      fontWeight: isSelected ? 600 : 400, marginTop: '2px'
                    }}>
                      {a.prediction?.risk_score}% {a.prediction?.risk_level || riskMeta.level}
                    </div>

                    {/* Show delta arrow between selected assessments */}
                    {a._id === prevId && idx < assessments.length - 1 && (
                      <div style={{
                        position: 'absolute', left: '-7px',
                        top: '34px', bottom: '-6px',
                        width: '8px',
                        background: `linear-gradient(to bottom, #8b5cf644, #06b6d444)`,
                        borderRadius: '4px'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {prevAssessment && curAssessment && comparison.riskDiff !== 0 && (
              <div style={{
                textAlign: 'center', marginTop: '16px', padding: '10px 16px',
                borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
                fontSize: '14px', fontWeight: 600,
                color: comparison.riskDiff < 0 ? '#34d399' : '#f87171'
              }}>
                {Math.abs(comparison.riskDiff)} point {comparison.riskDiff < 0 ? 'improvement' : 'increase'} between selected assessments
              </div>
            )}
          </div>

          {/* ── Recommendations ─────────────────────────────────────── */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <Heart size={18} />
              </div>
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>
                {comparison.overallStatus === 'worsening' ? 'Areas for Improvement' : 'Keep It Up!'}
              </h3>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '16px' }}>
              {recommendationText}
            </p>

            {/* Disclaimer */}
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'flex-start', gap: '10px'
            }}>
              <Info size={16} color="var(--text-dim)" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                VitaPulse AI provides an estimated result based on the information entered and is not a medical diagnosis. 
                Changes shown reflect differences in your self-reported data across assessments. 
                Consult a healthcare professional for medical advice.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Handle same assessment selected */}
      {prevId && curId && prevId === curId && (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <Info size={24} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            Please select two <strong>different</strong> assessments to compare.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Reusable page header ───────────────────────────────────────────────────
function PageHeader() {
  return (
    <div className="glass-panel" style={{
      padding: '28px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        padding: '8px', borderRadius: '12px',
        background: 'rgba(6,182,212,0.15)', color: '#22d3ee'
      }}>
        <GitCompareArrows size={22} />
      </div>
      <div>
        <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 800 }}>
          Assessment Comparison
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Track how your lifestyle and estimated risk change over time
        </p>
      </div>
    </div>
  );
}

export default AssessmentComparison;


import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Activity, Moon, Droplets, Flame, 
  Cigarette, Wine, Dna, User, Scale, ArrowRight, RotateCcw,
  Briefcase, Utensils, Edit3, AlertTriangle, Info, Check
} from 'lucide-react';

import {
  PROFESSIONS,
  ACTIVITY_LEVELS,
  DIET_PATTERNS,
  OUTSIDE_FOOD_FREQ,
  FRIED_FOOD_FREQ,
  SLEEP_PATTERNS,
  estimateLifestyleParameters,
  DEFAULT_LIFESTYLE_PROFILE
} from '../utils/lifestyleEstimator';

const PRESETS = [
  {
    name: 'Balanced Lifestyle',
    badge: 'Optimal',
    color: '#10b981',
    profile: {
      profession: 'Healthcare Worker',
      activityIntensity: 'Very Active',
      dietaryPattern: 'Health-Conscious / Balanced Diet',
      outsideFoodFrequency: 'Rarely',
      friedFoodFrequency: 'Rarely',
      sleepPattern: '7–8 hours'
    },
    data: {
      age: 28,
      gender: 'Female',
      height: 168,
      weight: 60.7,
      bmi: 21.5,
      daily_steps: 11000,
      sleep_hours: 8.0,
      water_intake_l: 3.2,
      calories_consumed: 1950,
      smoker: 0,
      alcohol: 0,
      family_history: 0
    }
  },
  {
    name: 'Sedentary Desk Worker',
    badge: 'Moderate Strain',
    color: '#f59e0b',
    profile: {
      profession: 'Desk / IT Professional',
      activityIntensity: 'Mostly Sedentary',
      dietaryPattern: 'Mixed Home-Cooked & Outside Food',
      outsideFoodFrequency: '3–4 times/week',
      friedFoodFrequency: '1–2 times/week',
      sleepPattern: '5–6 hours'
    },
    data: {
      age: 44,
      gender: 'Male',
      height: 178,
      weight: 88.0,
      bmi: 27.8,
      daily_steps: 4200,
      sleep_hours: 5.8,
      water_intake_l: 1.5,
      calories_consumed: 2650,
      smoker: 0,
      alcohol: 1,
      family_history: 0
    }
  },
  {
    name: 'Elevated Risk Profile',
    badge: 'High Alert',
    color: '#ef4444',
    profile: {
      profession: 'Driver',
      activityIntensity: 'Mostly Sedentary',
      dietaryPattern: 'Frequently Street/Fast Food',
      outsideFoodFrequency: '5+ times/week',
      friedFoodFrequency: 'Almost Daily',
      sleepPattern: '5–6 hours'
    },
    data: {
      age: 56,
      gender: 'Male',
      height: 175,
      weight: 99.2,
      bmi: 32.4,
      daily_steps: 2800,
      sleep_hours: 5.1,
      water_intake_l: 1.2,
      calories_consumed: 3200,
      smoker: 1,
      alcohol: 1,
      family_history: 1
    }
  },
  {
    name: 'Active Senior',
    badge: 'Healthy Longevity',
    color: '#06b6d4',
    profile: {
      profession: 'Homemaker',
      activityIntensity: 'Moderately Active',
      dietaryPattern: 'Mostly Home-Cooked & Balanced',
      outsideFoodFrequency: 'Rarely',
      friedFoodFrequency: 'Rarely',
      sleepPattern: '7–8 hours'
    },
    data: {
      age: 65,
      gender: 'Female',
      height: 162,
      weight: 60.9,
      bmi: 23.2,
      daily_steps: 9500,
      sleep_hours: 7.5,
      water_intake_l: 2.8,
      calories_consumed: 2100,
      smoker: 0,
      alcohol: 0,
      family_history: 0
    }
  }
];

// Helper to calculate BMI from height (cm) and weight (kg)
const calculateBMI = (heightCm, weightKg) => {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return 22.0;
  const heightM = h / 100;
  const bmiVal = w / (heightM * heightM);
  return parseFloat(bmiVal.toFixed(1));
};

const getInitialFormState = (init) => {
  const defaultHeight = 175;
  const defaultWeight = 77.8;
  const height = init?.height || defaultHeight;
  const weight = init?.weight || (init?.bmi ? parseFloat((init.bmi * Math.pow(height / 100, 2)).toFixed(1)) : defaultWeight);
  const bmi = init?.bmi || calculateBMI(height, weight);

  return {
    age: 38,
    gender: 'Male',
    height,
    weight,
    bmi,
    daily_steps: 6500,
    sleep_hours: 6.5,
    water_intake_l: 2.2,
    calories_consumed: 2350,
    smoker: 0,
    alcohol: 0,
    family_history: 0,
    ...(init || {})
  };
};

function PredictorForm({ onSubmit, isLoading, initialValues }) {
  const [formData, setFormData] = useState(() => getInitialFormState(initialValues));
  const [lifestyleProfile, setLifestyleProfile] = useState(DEFAULT_LIFESTYLE_PROFILE);
  
  // Track which parameters were manually adjusted by the user
  const [manualOverrides, setManualOverrides] = useState({
    daily_steps: false,
    sleep_hours: false,
    calories_consumed: false,
    water_intake_l: false
  });

  const [showRecalculateModal, setShowRecalculateModal] = useState(false);

  // Synchronize initial values if provided externally (e.g. from history view)
  useEffect(() => {
    if (initialValues) {
      setFormData(prev => {
        const height = initialValues.height || prev.height || 175;
        const weight = initialValues.weight || (initialValues.bmi ? parseFloat((initialValues.bmi * Math.pow(height / 100, 2)).toFixed(1)) : prev.weight || 77.8);
        const bmi = initialValues.bmi || calculateBMI(height, weight);
        return {
          ...prev,
          ...initialValues,
          height,
          weight,
          bmi
        };
      });
    }
  }, [initialValues]);

  // General field handler
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Dedicated manual parameter change handler
  const handleManualParamChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setManualOverrides(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Height / Weight change updates BMI and recalculates calories if not manually edited
  const handleHeightWeightChange = (field, value) => {
    setFormData(prev => {
      const updatedHeight = field === 'height' ? value : (prev.height || 175);
      const updatedWeight = field === 'weight' ? value : (prev.weight || 77.8);
      const computedBmi = calculateBMI(updatedHeight, updatedWeight);
      
      const nextData = {
        ...prev,
        [field]: value,
        bmi: computedBmi
      };

      // If calories were not manually overridden, update with new body composition
      if (!manualOverrides.calories_consumed) {
        const newEstimates = estimateLifestyleParameters(lifestyleProfile, nextData);
        nextData.calories_consumed = newEstimates.calories_consumed;
      }

      return nextData;
    });
  };

  // Lifestyle profile change: automatically re-estimates parameters that haven't been manually adjusted
  const handleProfileChange = (key, value) => {
    const updatedProfile = {
      ...lifestyleProfile,
      [key]: value
    };
    setLifestyleProfile(updatedProfile);

    // Calculate new deterministic estimates
    const estimates = estimateLifestyleParameters(updatedProfile, formData);

    setFormData(prev => {
      const next = { ...prev };
      if (!manualOverrides.daily_steps) {
        next.daily_steps = estimates.daily_steps;
      }
      if (!manualOverrides.sleep_hours) {
        next.sleep_hours = estimates.sleep_hours;
      }
      if (!manualOverrides.calories_consumed) {
        next.calories_consumed = estimates.calories_consumed;
      }
      if (!manualOverrides.water_intake_l) {
        next.water_intake_l = estimates.water_intake_l;
      }
      return next;
    });
  };

  // Recalculate button handler
  const handleRecalculateClick = () => {
    const hasManualEdits = Object.values(manualOverrides).some(v => v === true);
    if (hasManualEdits) {
      setShowRecalculateModal(true);
    } else {
      executeRecalculate();
    }
  };

  const executeRecalculate = () => {
    const freshEstimates = estimateLifestyleParameters(lifestyleProfile, formData);
    setFormData(prev => ({
      ...prev,
      daily_steps: freshEstimates.daily_steps,
      sleep_hours: freshEstimates.sleep_hours,
      calories_consumed: freshEstimates.calories_consumed,
      water_intake_l: freshEstimates.water_intake_l
    }));
    setManualOverrides({
      daily_steps: false,
      sleep_hours: false,
      calories_consumed: false,
      water_intake_l: false
    });
    setShowRecalculateModal(false);
  };

  // Preset application
  const handleApplyPreset = (preset) => {
    const height = preset.data.height || 175;
    const weight = preset.data.weight || (preset.data.bmi ? parseFloat((preset.data.bmi * Math.pow(height / 100, 2)).toFixed(1)) : 75);
    const bmi = calculateBMI(height, weight);
    
    setFormData({
      ...preset.data,
      height,
      weight,
      bmi
    });

    if (preset.profile) {
      setLifestyleProfile(preset.profile);
    }

    setManualOverrides({
      daily_steps: false,
      sleep_hours: false,
      calories_consumed: false,
      water_intake_l: false
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Helper for BMI category
  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#38bdf8' };
    if (bmi < 25) return { label: 'Normal Weight', color: '#10b981' };
    if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
    return { label: 'Obese', color: '#ef4444' };
  };

  const bmiCat = getBMICategory(formData.bmi);

  // Compute live sources for badge descriptions
  const currentEstimates = estimateLifestyleParameters(lifestyleProfile, formData);

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Preset Banner */}
      <div className="glass-panel" style={{ padding: '20px 26px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="#10b981" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Smart Clinical Presets</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              (1-click prefill with realistic cohort archetypes)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleApplyPreset(PRESETS[0])}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw size={12} /> Reset to Baseline
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = preset.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{preset.name}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: `${preset.color}20`,
                  color: preset.color,
                  border: `1px solid ${preset.color}50`
                }}>
                  {preset.badge}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                {preset.data.gender}, {preset.data.age}y • {preset.data.height}cm, {preset.data.weight}kg • BMI {preset.data.bmi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Demographics & Body Composition */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <User size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', margin: 0 }}>Demographics & Body Composition</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Foundational biological determinants used for metabolic baselines</p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {/* Age */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>Age</label>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>{formData.age} years</span>
            </div>
            <input
              type="range"
              min="18"
              max="90"
              value={formData.age}
              onChange={(e) => handleChange('age', parseInt(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>18y</span>
              <span>50y</span>
              <span>90y</span>
            </div>
          </div>

          {/* Gender */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Biological Sex</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {['Male', 'Female'].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => handleChange('gender', gender)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: formData.gender === gender ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: formData.gender === gender ? 'rgba(59, 130, 246, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                    color: formData.gender === gender ? '#93c5fd' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          {/* Height (cm) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>Height</label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>{formData.height} cm</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  ({Math.floor(formData.height / 30.48)}&apos;{Math.round((formData.height % 30.48) / 2.54)}&quot;)
                </span>
              </div>
            </div>
            <input
              type="range"
              min="120"
              max="220"
              step="1"
              value={formData.height}
              onChange={(e) => handleHeightWeightChange('height', parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>120 cm (Short)</span>
              <span>170 cm (Average)</span>
              <span>220 cm (Tall)</span>
            </div>
          </div>

          {/* Weight (kg) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={14} color="#10b981" />
                <span>Weight</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>{formData.weight} kg</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  ({(formData.weight * 2.20462).toFixed(1)} lbs)
                </span>
              </div>
            </div>
            <input
              type="range"
              min="35"
              max="180"
              step="0.5"
              value={formData.weight}
              onChange={(e) => handleHeightWeightChange('weight', parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>35 kg</span>
              <span>80 kg</span>
              <span>180 kg</span>
            </div>
          </div>
        </div>

        {/* Calculated BMI Spectrum Gauge */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${bmiCat.color}40`,
          borderRadius: '12px',
          padding: '14px 18px',
          marginTop: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Body Mass Index (BMI)</span>
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-dim)'
              }}>
                Auto-Calculated
              </span>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: `${bmiCat.color}22`,
              color: bmiCat.color,
              border: `1px solid ${bmiCat.color}44`
            }}>
              {bmiCat.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: bmiCat.color }}>
                {formData.bmi.toFixed(1)}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                kg/m²
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {formData.weight} kg ÷ ({(formData.height / 100).toFixed(2)} m)²
            </span>
          </div>

          <div style={{
            position: 'relative',
            height: '6px',
            borderRadius: '3px',
            background: 'linear-gradient(to right, #38bdf8 0%, #38bdf8 20%, #10b981 20%, #10b981 45%, #f59e0b 45%, #f59e0b 70%, #ef4444 70%, #ef4444 100%)',
            marginBottom: '6px'
          }}>
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: `${Math.min(97, Math.max(3, ((formData.bmi - 15) / (40 - 15)) * 100))}%`,
              transform: 'translateX(-50%)',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: `0 0 8px ${bmiCat.color}, 0 0 2px #000`,
              border: `2px solid ${bmiCat.color}`,
              transition: 'left 0.15s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-dim)' }}>
            <span>&lt;18.5 Underweight</span>
            <span>18.5–24.9 Normal</span>
            <span>25–29.9 Overweight</span>
            <span>≥30 Obese</span>
          </div>
        </div>
      </div>

      {/* Section 2: NEW Lifestyle Profile Section (Placed directly above numerical fields) */}
      <div className="glass-panel" style={{ padding: '26px', borderLeft: '4px solid #10b981' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '22px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', margin: 0, fontWeight: 800, color: '#f8fafc' }}>
                Lifestyle Profile
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tell us about your typical lifestyle and VitaPulse will estimate the health parameters needed for your assessment.
              </p>
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            color: '#10b981',
            background: 'rgba(16, 185, 129, 0.12)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={12} />
            <span>AI Automated Inference</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* 1. Profession Selection */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Briefcase size={14} color="#10b981" />
              <span>What best describes your profession?</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px'
            }}>
              {PROFESSIONS.map((p) => {
                const isSelected = lifestyleProfile.profession === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProfileChange('profession', p.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                      color: isSelected ? '#34d399' : 'var(--text-muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                        {p.label}
                      </span>
                      {isSelected && <Check size={14} color="#10b981" />}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Daily Activity Intensity */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Activity size={14} color="#06b6d4" />
              <span>How physically active are you on a typical day?</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '10px'
            }}>
              {ACTIVITY_LEVELS.map((act) => {
                const isSelected = lifestyleProfile.activityIntensity === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleProfileChange('activityIntensity', act.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                      color: isSelected ? '#38bdf8' : 'var(--text-muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                        {act.label}
                      </span>
                      {isSelected && <Check size={14} color="#06b6d4" />}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      {act.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Dietary Pattern */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Utensils size={14} color="#f59e0b" />
              <span>What best describes your typical diet?</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '8px'
            }}>
              {DIET_PATTERNS.map((diet) => {
                const isSelected = lifestyleProfile.dietaryPattern === diet.id;
                return (
                  <button
                    key={diet.id}
                    type="button"
                    onClick={() => handleProfileChange('dietaryPattern', diet.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.16)' : 'rgba(15, 23, 42, 0.6)',
                      color: isSelected ? '#fbbf24' : 'var(--text-muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                        {diet.label}
                      </span>
                      {isSelected && <Check size={14} color="#f59e0b" />}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                      {diet.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 & 5. Outside Food & Fried Food Frequencies */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '18px'
          }}>
            {/* Outside food */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                How often do you eat outside or street/fast food?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {OUTSIDE_FOOD_FREQ.map((f) => {
                  const isSelected = lifestyleProfile.outsideFoodFrequency === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleProfileChange('outsideFoodFrequency', f.id)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                        color: isSelected ? '#fbbf24' : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Oily / Fried food */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                How often do you eat oily/fried food?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {FRIED_FOOD_FREQ.map((f) => {
                  const isSelected = lifestyleProfile.friedFoodFrequency === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleProfileChange('friedFoodFrequency', f.id)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                        color: isSelected ? '#f87171' : 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6. Sleep Pattern */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Moon size={14} color="#818cf8" />
              <span>How much do you usually sleep?</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '8px'
            }}>
              {SLEEP_PATTERNS.map((s) => {
                const isSelected = lifestyleProfile.sleepPattern === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleProfileChange('sleepPattern', s.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(129, 140, 248, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                      color: isSelected ? '#a5b4fc' : 'var(--text-muted)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      (~{s.hours} hrs)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Section 3: Generated / Estimated Lifestyle Parameters (User Reviews & Can Manually Edit) */}
      <div className="glass-panel" style={{ padding: '26px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Activity size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Your Estimated Lifestyle Parameters</h3>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textTransform: 'uppercase'
                }}>
                  Auto-Populated
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Populated from your lifestyle profile. You can freely adjust any slider or number if you know your exact measurements.
              </p>
            </div>
          </div>

          {/* Recalculate Button */}
          <button
            type="button"
            onClick={handleRecalculateClick}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '7px 14px', gap: '6px' }}
            title="Recalculate estimates based on current lifestyle profile"
          >
            <RotateCcw size={13} />
            <span>Recalculate Estimates</span>
          </button>
        </div>

        {/* 4 Estimated Parameter Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>

          {/* 1. Daily Steps */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: manualOverrides.daily_steps ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={15} color="#10b981" />
                  <span>Daily Physical Activity (Steps)</span>
                </label>
                <div style={{
                  fontSize: '11px',
                  color: manualOverrides.daily_steps ? '#38bdf8' : 'var(--text-dim)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{manualOverrides.daily_steps ? '✏️ Manually adjusted by user' : `🧠 ${currentEstimates.sources.daily_steps}`}</span>
                </div>
              </div>

              {/* Status Badge */}
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: manualOverrides.daily_steps ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: manualOverrides.daily_steps ? '#38bdf8' : '#34d399',
                border: manualOverrides.daily_steps ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                {manualOverrides.daily_steps ? 'MANUALLY ADJUSTED' : 'ESTIMATED'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: formData.daily_steps >= 8000 ? '#10b981' : '#f59e0b' }}>
                {formData.daily_steps.toLocaleString()}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '6px' }}>steps/day</span>
              </span>
            </div>

            <input
              type="range"
              min="1000"
              max="25000"
              step="250"
              value={formData.daily_steps}
              onChange={(e) => handleManualParamChange('daily_steps', parseInt(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>1,000 (Sedentary)</span>
              <span>8,000 (Target)</span>
              <span>25,000 (Athletic)</span>
            </div>
          </div>

          {/* 2. Sleep Duration */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: manualOverrides.sleep_hours ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(129, 140, 248, 0.3)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Moon size={15} color="#818cf8" />
                  <span>Sleep Duration</span>
                </label>
                <div style={{
                  fontSize: '11px',
                  color: manualOverrides.sleep_hours ? '#38bdf8' : 'var(--text-dim)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{manualOverrides.sleep_hours ? '✏️ Manually adjusted by user' : `🧠 ${currentEstimates.sources.sleep_hours}`}</span>
                </div>
              </div>

              {/* Status Badge */}
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: manualOverrides.sleep_hours ? 'rgba(56, 189, 248, 0.15)' : 'rgba(129, 140, 248, 0.15)',
                color: manualOverrides.sleep_hours ? '#38bdf8' : '#a5b4fc',
                border: manualOverrides.sleep_hours ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(129, 140, 248, 0.3)'
              }}>
                {manualOverrides.sleep_hours ? 'MANUALLY ADJUSTED' : 'ESTIMATED'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: (formData.sleep_hours >= 7 && formData.sleep_hours <= 9) ? '#10b981' : '#f59e0b' }}>
                {formData.sleep_hours.toFixed(1)}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '6px' }}>hours/night</span>
              </span>
            </div>

            <input
              type="range"
              min="3.0"
              max="12.0"
              step="0.5"
              value={formData.sleep_hours}
              onChange={(e) => handleManualParamChange('sleep_hours', parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>3.0h (Deprivation)</span>
              <span>7.5h (Optimal)</span>
              <span>12.0h</span>
            </div>
          </div>

          {/* 3. Daily Calorie Intake */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: manualOverrides.calories_consumed ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={15} color="#f59e0b" />
                  <span>Daily Calorie Intake</span>
                </label>
                <div style={{
                  fontSize: '11px',
                  color: manualOverrides.calories_consumed ? '#38bdf8' : 'var(--text-dim)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{manualOverrides.calories_consumed ? '✏️ Manually adjusted by user' : `🧠 ${currentEstimates.sources.calories_consumed}`}</span>
                </div>
              </div>

              {/* Status Badge */}
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: manualOverrides.calories_consumed ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: manualOverrides.calories_consumed ? '#38bdf8' : '#fbbf24',
                border: manualOverrides.calories_consumed ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                {manualOverrides.calories_consumed ? 'MANUALLY ADJUSTED' : 'ESTIMATED'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>
                ~{formData.calories_consumed.toLocaleString()}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '6px' }}>kcal/day</span>
              </span>
            </div>

            <input
              type="range"
              min="1200"
              max="4500"
              step="50"
              value={formData.calories_consumed}
              onChange={(e) => handleManualParamChange('calories_consumed', parseInt(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>1,200 kcal</span>
              <span>2,200 kcal (Average)</span>
              <span>4,500 kcal</span>
            </div>
          </div>

          {/* 4. Hydration (Water Intake) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: manualOverrides.water_intake_l ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplets size={15} color="#38bdf8" />
                  <span>Hydration (Water Intake)</span>
                </label>
                <div style={{
                  fontSize: '11px',
                  color: manualOverrides.water_intake_l ? '#38bdf8' : 'var(--text-dim)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{manualOverrides.water_intake_l ? '✏️ Manually adjusted by user' : `🧠 ${currentEstimates.sources.water_intake_l}`}</span>
                </div>
              </div>

              {/* Status Badge */}
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: manualOverrides.water_intake_l ? 'rgba(56, 189, 248, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                color: manualOverrides.water_intake_l ? '#38bdf8' : '#22d3ee',
                border: manualOverrides.water_intake_l ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)'
              }}>
                {manualOverrides.water_intake_l ? 'MANUALLY ADJUSTED' : 'ESTIMATED'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8' }}>
                {formData.water_intake_l.toFixed(1)}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '6px' }}>Liters/day</span>
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.1"
              value={formData.water_intake_l}
              onChange={(e) => handleManualParamChange('water_intake_l', parseFloat(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>0.5 L</span>
              <span>2.5 L (Standard)</span>
              <span>6.0 L</span>
            </div>
          </div>

        </div>

        {/* Small Disclaimer */}
        <div style={{
          marginTop: '18px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Info size={16} color="var(--text-dim)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
            <strong>Note:</strong> These values are estimates based on your reported lifestyle. You can edit them if you know your actual measurements.
          </span>
        </div>
      </div>

      {/* Section 4: Habits & Genetic Predisposition */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Dna size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', margin: 0 }}>Habits & Genetic Predisposition</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Exposures and hereditary factors</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Smoker Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cigarette size={18} color={formData.smoker ? '#ef4444' : 'var(--text-dim)'} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Tobacco Smoking</span>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Active tobacco cigarette usage</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 1].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleChange('smoker', val)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: formData.smoker === val ? (val === 1 ? '#ef4444' : '#10b981') : 'rgba(255, 255, 255, 0.05)',
                    color: formData.smoker === val ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {val === 1 ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {/* Alcohol Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wine size={18} color={formData.alcohol ? '#f59e0b' : 'var(--text-dim)'} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Alcohol Consumption</span>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Regular or elevated alcohol intake</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 1].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleChange('alcohol', val)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: formData.alcohol === val ? (val === 1 ? '#f59e0b' : '#10b981') : 'rgba(255, 255, 255, 0.05)',
                    color: formData.alcohol === val ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {val === 1 ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {/* Family History Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Dna size={18} color={formData.family_history ? '#a855f7' : 'var(--text-dim)'} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Family History of Disease</span>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>First-degree hereditary incidence</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 1].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleChange('family_history', val)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: formData.family_history === val ? (val === 1 ? '#a855f7' : '#10b981') : 'rgba(255, 255, 255, 0.05)',
                    color: formData.family_history === val ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {val === 1 ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Action Bar */}
      <div className="glass-panel" style={{
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h4 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Ready for Explainable AI Evaluation</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Executes Scikit-Learn Gradient Boosting & calculates SHAP Shapley values for transparent decision factors.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
          style={{ minWidth: '240px' }}
        >
          {isLoading ? (
            <>
              <span style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Analyzing Biometrics & SHAP...</span>
            </>
          ) : (
            <>
              <span>Predict Disease Risk & Explain</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Recalculate Confirmation Modal */}
      {showRecalculateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#f8fafc' }}>
              Overwrite Manual Adjustments?
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Some values were manually adjusted. Recalculating will replace those values with new estimates based on your current lifestyle profile. Continue?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRecalculateModal(false)}
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRecalculate}
                className="btn-primary"
                style={{
                  fontSize: '13px',
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
                }}
              >
                Recalculate All
              </button>
            </div>
          </div>
        </div>
      )}

    </form>
  );
}

export default PredictorForm;

import React, { useState, useEffect } from 'react';
import { 
  History, Calendar, Trash2, ArrowRight, ShieldAlert, 
  ShieldCheck, Activity, RefreshCw, AlertCircle, Lock, UserCheck
} from 'lucide-react';
import { getApiUrl } from '../utils/api';

function HistoryView({ user, onOpenAuth, onLoadAssessment, onNavigatePredictor }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = () => {
    const token = localStorage.getItem('lifestyle_token');
    if (!token) {
      setAssessments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(getApiUrl('/api/assessments'), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load history');
        }
        return data;
      })
      .then(data => {
        setAssessments(data.assessments || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('History fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setAssessments([]);
      setLoading(false);
    }
  }, [user]);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this assessment record from your history?')) return;

    const token = localStorage.getItem('lifestyle_token');
    fetch(getApiUrl(`/api/assessments/${id}`), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete record');
        }
        return data;
      })
      .then(() => {
        setAssessments(prev => prev.filter(a => a._id !== id));
      })
      .catch(err => alert('Failed to delete: ' + err.message));
  };

  // If user is a Guest (not logged in)
  if (!user) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel" style={{
          padding: '48px 32px',
          textAlign: 'center',
          maxWidth: '720px',
          margin: '20px auto 0 auto',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#a78bfa'
          }}>
            <Lock size={32} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '16px'
          }}>
            <span>Guest Evaluation Mode</span>
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
            Personal History is Reserved for Logged-In Users
          </h2>

          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto 28px auto' }}>
            As a guest user, you can freely use the <strong>Risk Predictor</strong> to calculate your real-time risk scores and view Explainable AI (SHAP) factors. However, guest assessments are <em>never stored</em> in the database.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={onOpenAuth}
              className="btn-primary"
              style={{ fontSize: '14px', padding: '12px 24px' }}
            >
              <UserCheck size={18} />
              <span>Sign In / Create Account</span>
            </button>

            <button
              onClick={onNavigatePredictor}
              className="btn-secondary"
              style={{ fontSize: '14px', padding: '12px 24px' }}
            >
              <span>Run Guest Prediction</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{
        padding: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <History size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 800 }}>
              {user.username}'s Assessment Trajectory
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Securely stored evaluations authenticated with JWT token
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="btn-secondary"
          style={{ fontSize: '13px', padding: '8px 14px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Records</span>
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          borderLeft: '4px solid #ef4444',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px auto'
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading your personal records...</p>
        </div>
      ) : assessments.length === 0 ? (
        <div className="glass-panel" style={{ padding: '50px 30px', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: 'var(--text-dim)'
          }}>
            <Activity size={28} />
          </div>
          <h3 style={{ fontSize: '18px', color: '#f8fafc', marginBottom: '8px' }}>
            No Saved Assessments for {user.username}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            Run an AI diagnostic on the Risk Predictor tab while logged in to automatically save your clinical history and track your risk over time.
          </p>
          <button
            onClick={onNavigatePredictor}
            className="btn-primary"
            style={{ fontSize: '14px', padding: '10px 20px' }}
          >
            <span>Run New Health Assessment</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {assessments.map((item) => {
            const pred = item.prediction || {};
            const inputs = item.inputs || {};
            const isRisk = pred.disease_risk_detected;
            const dateStr = new Date(item.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <div 
                key={item._id}
                className="glass-card"
                onClick={() => onLoadAssessment && onLoadAssessment(item)}
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${isRisk ? '#ef4444' : '#10b981'}`
                }}
              >
                {/* Left: Summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: isRisk ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: isRisk ? '#ef4444' : '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isRisk ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                        {pred.risk_level || (isRisk ? 'Elevated Risk' : 'Low Risk')}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isRisk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: isRisk ? '#f87171' : '#34d399'
                      }}>
                        {pred.risk_score}% Risk
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {dateStr}
                      </span>
                      <span>•</span>
                      <span>{inputs.gender || 'Person'}, {inputs.age}y</span>
                      <span>•</span>
                      <span>BMI {inputs.bmi}</span>
                      {inputs.daily_steps && (
                        <>
                          <span>•</span>
                          <span>{inputs.daily_steps.toLocaleString()} steps/day</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadAssessment && onLoadAssessment(item);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                  >
                    <span>View Full Report</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    onClick={(e) => handleDelete(item._id, e)}
                    title="Delete record"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-dim)',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-dim)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default HistoryView;

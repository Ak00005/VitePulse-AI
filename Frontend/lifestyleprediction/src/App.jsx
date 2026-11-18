import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PredictorForm from './components/PredictorForm';
import PredictionResults from './components/PredictionResults';
import HistoryView from './components/HistoryView';
import AssessmentComparison from './components/AssessmentComparison';
import VitaPulseAssistant from './components/VitaPulseAssistant';
import AuthModal from './components/AuthModal';
import { Activity, ShieldCheck, Cpu, Database, Sparkles } from 'lucide-react';
import { getApiUrl } from './utils/api';

function App() {
  const [activeTab, setActiveTab] = useState('predictor'); // 'predictor', 'history', 'comparison', 'assistant'
  const [currentResult, setCurrentResult] = useState(null);
  const [formInputs, setFormInputs] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState('connecting');
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Initialize and verify user token with backend
  useEffect(() => {
    const token = localStorage.getItem('lifestyle_token');
    const savedUser = localStorage.getItem('lifestyle_user');

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user:', e);
      }
    }

    // Verify token with backend
    if (token) {
      fetch(getApiUrl('/api/auth/me'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Token expired or invalid');
          return res.json();
        })
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('lifestyle_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {
          localStorage.removeItem('lifestyle_token');
          localStorage.removeItem('lifestyle_user');
          setUser(null);
        });
    }

    // Health check ping
    const checkServer = () => {
      fetch(getApiUrl('/api/health'))
        .then(res => res.json())
        .then(() => setServerStatus('online'))
        .catch(() => setServerStatus('offline'));
    };

    checkServer();
    const interval = setInterval(checkServer, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePredict = async (formData) => {
    setIsLoading(true);
    setError(null);
    setFormInputs(formData);

    try {
      const token = localStorage.getItem('lifestyle_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(getApiUrl('/api/predict'), {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Prediction calculation failed');
      }

      setCurrentResult(data);
      // Smooth scroll to top of results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Prediction failed:', err);
      setError(err.message || 'Server error occurred during prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAssessment = (assessment) => {
    setFormInputs(assessment.inputs);
    setCurrentResult({
      success: true,
      prediction: assessment.prediction.prediction_code,
      disease_risk_detected: assessment.prediction.disease_risk_detected,
      risk_score: assessment.prediction.risk_score,
      safe_score: assessment.prediction.safe_score,
      risk_level: assessment.prediction.risk_level,
      risk_color: assessment.prediction.risk_color,
      shap_factors: assessment.shap_factors,
      top_risk_drivers: assessment.top_risk_drivers,
      top_protective_factors: assessment.top_protective_factors,
      recommendations: assessment.recommendations,
      inputs_processed: assessment.inputs
    });
    setActiveTab('predictor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    localStorage.removeItem('lifestyle_token');
    localStorage.removeItem('lifestyle_user');
    setUser(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        serverStatus={serverStatus}
      />

      <main style={{
        flex: 1,
        maxWidth: '1360px',
        width: '100%',
        margin: '0 auto',
        padding: '32px 24px 40px'
      }}>
        {error && (
          <div className="glass-panel" style={{
            padding: '16px 20px',
            marginBottom: '24px',
            borderLeft: '4px solid #ef4444',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span><strong>Diagnostic Alert:</strong> {error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Predictor & Results */}
        {activeTab === 'predictor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Show Results if calculated */}
            {currentResult ? (
              <PredictionResults
                result={currentResult}
                user={user}
                onOpenAuth={() => setAuthModalOpen(true)}
                onNavigateHistory={() => setActiveTab('history')}
                onRetest={() => setCurrentResult(null)}
              />
            ) : (
              <>
                {/* Hero Intro */}
                <div className="glass-panel" style={{
                  padding: '36px',
                  background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ maxWidth: '800px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em'
                      }}>
                        Next-Generation XAI Diagnostic
                      </span>
                    </div>

                    <h1 style={{
                      fontSize: '34px',
                      fontWeight: 800,
                      color: 'var(--text-main, #ffffff)',
                      lineHeight: 1.15,
                      margin: 0
                    }}>
                      Explainable Lifestyle Health Risk Prediction
                    </h1>
                  </div>
                </div>

                <PredictorForm
                  onSubmit={handlePredict}
                  isLoading={isLoading}
                  initialValues={formInputs}
                />
              </>
            )}
          </div>
        )}

        {/* Tab 2: History & Past Assessments */}
        {activeTab === 'history' && (
          <HistoryView
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onLoadAssessment={handleLoadAssessment}
            onNavigatePredictor={() => {
              setCurrentResult(null);
              setActiveTab('predictor');
            }}
          />
        )}

        {/* Tab 3: Assessment Comparison */}
        {activeTab === 'comparison' && (
          <AssessmentComparison
            user={user}
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigatePredictor={() => {
              setCurrentResult(null);
              setActiveTab('predictor');
            }}
          />
        )}

        {/* Tab 4: VitaPulse Assistant AI Chatbot */}
        {activeTab === 'assistant' && (
          <VitaPulseAssistant
            user={user}
            onNavigate={(tab) => {
              setCurrentResult(null);
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(userData) => setUser(userData)}
      />
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, History, User, HeartPulse, LogOut, Sun, Moon, GitCompareArrows, Bot } from 'lucide-react';

function Navbar({ activeTab, setActiveTab, user, onOpenAuth, onLogout, serverStatus }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lifestyle_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('lifestyle_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className="navbar-header" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: theme === 'dark' ? 'rgba(10, 15, 29, 0.85)' : 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
      padding: '0 24px',
      transition: 'background 0.3s ease, border-color 0.3s ease'
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        height: '74px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('predictor')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
          }}>
            <HeartPulse size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em'
              }}>VitaPulse</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                letterSpacing: '0.05em'
              }}>XAI</span>
            </div>
            <p style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              letterSpacing: '0.02em'
            }}>Explainable Health Risk AI</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: theme === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.85)',
          padding: '5px',
          borderRadius: '12px',
          border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.08)',
          transition: 'background 0.3s ease, border-color 0.3s ease'
        }}>
          <button
            onClick={() => setActiveTab('predictor')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'predictor' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
              color: activeTab === 'predictor' ? '#10b981' : 'var(--text-muted)',
              fontWeight: activeTab === 'predictor' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: activeTab === 'predictor' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
            }}
          >
            <Activity size={16} />
            <span>Risk Predictor</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'history' ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
              color: activeTab === 'history' ? '#8b5cf6' : 'var(--text-muted)',
              fontWeight: activeTab === 'history' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: activeTab === 'history' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent'
            }}
          >
            <History size={16} />
            <span>Assessment History</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'comparison' ? 'rgba(6, 182, 212, 0.18)' : 'transparent',
              color: activeTab === 'comparison' ? '#06b6d4' : 'var(--text-muted)',
              fontWeight: activeTab === 'comparison' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: activeTab === 'comparison' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
            }}
          >
            <GitCompareArrows size={16} />
            <span>Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'assistant' ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)' : 'transparent',
              color: activeTab === 'assistant' ? '#38bdf8' : 'var(--text-muted)',
              fontWeight: activeTab === 'assistant' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: activeTab === 'assistant' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              boxShadow: activeTab === 'assistant' ? '0 0 15px rgba(56, 189, 248, 0.15)' : 'none'
            }}
          >
            <Bot size={16} />
            <span>VitaPulse Assistant</span>
          </button>
        </nav>

        {/* Right Section: Theme Toggle & User */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
              background: theme === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.9)',
              color: theme === 'dark' ? '#fbbf24' : '#4f46e5',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.borderColor = theme === 'dark' ? '#fbbf24' : '#4f46e5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Button */}
          {user ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                background: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.9)',
                borderRadius: '8px',
                border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                transition: 'background 0.3s ease, border-color 0.3s ease'
              }}>
                <User size={15} color="#10b981" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {user.username}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '7px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn-secondary"
              style={{
                fontSize: '13px',
                padding: '7px 16px'
              }}
            >
              <User size={15} />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;

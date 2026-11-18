import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Sparkles, RotateCcw, ArrowRight, Activity,
  ShieldCheck, AlertCircle, User, CheckCircle2, Lock,
  History, GitCompareArrows, BarChart3, Info
} from 'lucide-react';
import { getApiUrl } from '../utils/api';

const SUGGESTED_PROMPTS = [
  "Summarize my latest assessment",
  "Compare my last two assessments",
  "What are my biggest risk factors?",
  "Show my risk trend",
  "Open my assessment comparison",
  "What does my SHAP result mean?"
];

// Helper to format assistant markdown-like text with bolding and bullet points
function FormattedMessageText({ text }) {
  if (!text) return null;

  // Split into lines
  const lines = text.split('\n');

  return (
    <div style={{ lineHeight: 1.6, fontSize: '14px', wordBreak: 'break-word' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} style={{ height: '8px' }} />;
        }

        // Bullet point
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '4px', paddingLeft: '4px' }}>
              <span style={{ color: '#10b981', flexShrink: 0 }}>•</span>
              <div>{renderInlineFormatting(content)}</div>
            </div>
          );
        }

        // Header
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={idx} style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 4px 0', color: '#f8fafc' }}>
              {renderInlineFormatting(trimmed.replace(/^###\s*/, ''))}
            </h4>
          );
        }

        if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
          return (
            <h3 key={idx} style={{ fontSize: '15px', fontWeight: 800, margin: '10px 0 6px 0', color: '#f8fafc' }}>
              {renderInlineFormatting(trimmed.replace(/^#+\s*/, ''))}
            </h3>
          );
        }

        return (
          <p key={idx} style={{ margin: '0 0 4px 0' }}>
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

// Helper to render bold (**text**), italics (*text*), and code (`code`)
function renderInlineFormatting(str) {
  // Regex to split by bold (**...**) and inline code (`...`)
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#ffffff', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#38bdf8'
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} style={{ color: 'var(--text-muted)' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function VitaPulseAssistant({ user, onNavigate, onOpenAuth }) {
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: user 
        ? `Hello **${user.username}**! I'm your **VitaPulse Assistant**. I can summarize your assessments, analyze risk trajectories, explain your SHAP factors, and guide you through the dashboard.\n\nHow can I help you today?`
        : `Hello! I'm your **VitaPulse Assistant**. I can answer questions about lifestyle risk modeling, Explainable AI (SHAP), and our clinical algorithms.\n\n*Tip: Sign in to let me inspect and compare your personal assessment history!*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: user
        ? [
            { type: 'navigate', page: 'comparison', label: 'Compare Assessments' },
            { type: 'navigate', page: 'history', label: 'View Assessment History' }
          ]
        : []
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText) => {
    const textToSend = (messageText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    setInputMessage('');

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('lifestyle_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Build simplified history payload
      const historyPayload = newMessages.slice(-6).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect to VitaPulse Assistant.');
      }

      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: data.actions || (data.action ? [data.action] : []),
        toolExecuted: data.toolExecuted || null
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If response includes an explicit navigate action and user asked to open/go
      if (data.action?.type === 'navigate' && onNavigate) {
        const lower = textToSend.toLowerCase();
        if (lower.startsWith('open') || lower.startsWith('go to') || lower.startsWith('take me to') || lower.startsWith('show me')) {
          setTimeout(() => {
            onNavigate(data.action.page);
          }, 1200);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Unable to connect to assistant right now.');
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "I'm having trouble connecting right now. You can still access your assessments and history normally.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: `Conversation cleared. How can I assist you with your health assessments or metrics?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setError(null);
  };

  return (
    <div className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      maxWidth: '1000px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderLeft: '4px solid #06b6d4'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: '#22d3ee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)'
          }}>
            <Bot size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                VitaPulse Assistant
              </h2>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                AI Online
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Intelligent dashboard companion with controlled clinical data tools & XAI explanations
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="btn-secondary"
          title="Reset conversation"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          <RotateCcw size={14} />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Guest Mode Notification Banner */}
      {!user && (
        <div className="glass-panel" style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={16} color="#fbbf24" />
            <span style={{ fontSize: '13px', color: '#f8fafc' }}>
              You are currently in <strong>Guest Mode</strong>. The assistant can answer general questions, but sign in is required to read your personal assessments.
            </span>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Sign In to Unlock
            </button>
          )}
        </div>
      )}

      {/* Main Chat Box */}
      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '620px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Messages Scroll Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                {/* Avatar & Sender Label */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                  fontSize: '11px',
                  color: 'var(--text-dim)'
                }}>
                  {!isUser && (
                    <span style={{
                      fontWeight: 700,
                      color: '#22d3ee',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Bot size={13} />
                      VitaPulse AI
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                  {isUser && (
                    <span style={{ fontWeight: 700, color: '#10b981' }}>
                      You
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div style={{
                  maxWidth: '82%',
                  padding: '14px 18px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)'
                    : 'rgba(15, 23, 42, 0.75)',
                  border: isUser
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  color: 'var(--text-main)'
                }}>
                  {msg.toolExecuted && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#22d3ee',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '8px'
                    }}>
                      <Sparkles size={11} />
                      Tool: {msg.toolExecuted}
                    </div>
                  )}

                  <FormattedMessageText text={msg.text} />

                  {/* UI Action Buttons (Navigation / View actions) */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => onNavigate && onNavigate(act.page)}
                          className="btn-secondary"
                          style={{
                            fontSize: '11px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(6, 182, 212, 0.15)',
                            borderColor: 'rgba(6, 182, 212, 0.35)',
                            color: '#22d3ee'
                          }}
                        >
                          <span>{act.label || `Open ${act.page}`}</span>
                          <ArrowRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking / Loading indicator */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
                fontSize: '11px',
                color: 'var(--text-dim)'
              }}>
                <Bot size={13} color="#22d3ee" />
                <span>VitaPulse AI</span>
              </div>
              <div style={{
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#22d3ee',
                        animation: `pulse 1.2s infinite ease-in-out ${dot * 0.2}s`
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  VitaPulse is thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div style={{
          padding: '10px 20px',
          background: 'rgba(11, 17, 33, 0.85)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          display: 'flex',
          gap: '8px'
        }}>
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(prompt)}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(30, 41, 59, 0.6)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#06b6d4';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
              }}
            >
              <Sparkles size={11} color="#06b6d4" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Input Bar Area */}
        <div style={{
          padding: '14px 20px',
          background: 'rgba(10, 15, 29, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              disabled={isLoading}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask VitaPulse about your health trends, assessments, SHAP factors..."
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />

            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="btn-primary"
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Send size={16} />
              <span style={{ display: 'inline' }}>Send</span>
            </button>
          </form>

          {/* Persistent subtle safety disclaimer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--text-dim)'
          }}>
            <Info size={12} />
            <span>
              VitaPulse Assistant provides AI-generated information and is not a medical professional or diagnostic tool.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VitaPulseAssistant;


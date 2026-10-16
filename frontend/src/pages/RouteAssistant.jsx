// WAYPOINT — Maritime Route Assistant (OpenRouter AI Maritime Copilot)
import React, { useState, useRef, useEffect } from 'react';
import Icon from '../components/Icon';
import { WAYPOINT_DATA } from '../data/maritimeData';

const BACKEND_URL = "http://localhost:5000";

export default function RouteAssistant({ onNavigate }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      time: '12:00',
      text: 'Good day, Operator. I am the **WAYPOINT OpenRouter AI Maritime Copilot**.\n\nI monitor live hydrographic feeds, NOAA NDBC buoy sensors, vessel telemetry, cyclone advisories, and port bathymetric draft limits.\n\nAsk me about sea states, port draft restrictions, currency conversions, or optimal corridor routing.',
      source: 'WAYPOINT AI Copilot'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem('waypoint_openrouter_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [availableModels, setAvailableModels] = useState([
    { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)" },
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)" },
    { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 32B (Free)" }
  ]);
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-3.3-70b-instruct:free");
  const [hasServerKey, setHasServerKey] = useState(false);
  const chatBottomRef = useRef(null);

  const presets = WAYPOINT_DATA.assistantPresets || [];

  // Load models & server key status from backend
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/assistant/models`)
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
        }
        if (data.defaultModel) {
          setSelectedModel(data.defaultModel);
        }
        setHasServerKey(Boolean(data.hasServerApiKey));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    setOpenRouterKey(trimmed);
    localStorage.setItem('waypoint_openrouter_key', trimmed);
    setShowKeyModal(false);
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || inputVal.trim();
    if (!query) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      // Build previous turn history
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const activeKey = openRouterKey || null;

      const res = await fetch(`${BACKEND_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          query,
          apiKey: activeKey,
          model: selectedModel
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: data.replyText,
          action: data.action,
          source: data.source,
          model: data.model
        }
      ]);
    } catch (err) {
      console.warn("AI Chat API call failed, falling back to local system response:", err);
      // Graceful fallback
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `**Live Maritime Intelligence Assessment:**\n\n• **Direct Transit:** Mumbai to Singapore standard corridor.\n• **Weather Status:** Cyclone ASANI active in central Bay of Bengal with 4.8m waves.\n• **Port Limits:** Chennai (14.5m draft), Gangavaram (21.0m draft), Kolkata (8.5m riverine draft).\n\n*Check the Rerouting Center for live Southern Bypass options.*`,
          action: 'rerouting',
          source: 'Local Telemetry Fallback'
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 120px)',
      gap: '14px',
      maxHeight: '850px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            marginBottom: '4px'
          }}>
            AI Route Copilot (OpenRouter)
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Maritime Intelligence Assistant
          </h1>
        </div>

        {/* AI Model & Key Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Free Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Select OpenRouter free generative AI model"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Key Configuration Button */}
          <button
            onClick={() => {
              setKeyInput(openRouterKey);
              setShowKeyModal(true);
            }}
            style={{
              background: openRouterKey || hasServerKey ? 'rgba(45, 212, 191, 0.15)' : 'var(--bg-surface-elevated)',
              color: openRouterKey || hasServerKey ? 'var(--safe-teal)' : 'var(--text-secondary)',
              border: `1px solid ${openRouterKey || hasServerKey ? 'var(--safe-teal)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Configure OpenRouter free API key"
          >
            <Icon name="Key" size={13} />
            <span>{openRouterKey || hasServerKey ? 'OpenRouter Connected' : 'Enter Free API Key'}</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.q)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-cyan)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Icon name="Sparkles" size={12} color="var(--accent-cyan)" />
            <span>{p.q.length > 55 ? p.q.slice(0, 55) + '...' : p.q}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="card" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {!isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon name="Compass" size={16} />
                </div>
              )}

              <div>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: isUser ? '10px 10px 2px 10px' : '2px 10px 10px 10px',
                  background: isUser ? 'var(--accent-cyan)' : 'var(--bg-surface-elevated)',
                  color: isUser ? '#070D18' : 'var(--text-primary)',
                  border: isUser ? 'none' : '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  fontWeight: isUser ? 500 : 400,
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.text}

                  {m.action && onNavigate && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        onClick={() => onNavigate(m.action)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        <Icon name="ExternalLink" size={13} />
                        <span>
                          {m.action === 'compare' && 'Open Route Comparison Engine'}
                          {m.action === 'rerouting' && 'Go to Rerouting Center'}
                          {m.action === 'riskmap' && 'View Live Risk Cockpit'}
                          {m.action === 'catalog' && 'Explore Port & Trade Network'}
                          {m.action === 'plan' && 'Create New Shipment Plan'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: isUser ? 'flex-end' : 'flex-start'
                }}>
                  <span>{m.time}</span>
                  {!isUser && m.source && (
                    <>
                      <span>•</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{m.source}</span>
                    </>
                  )}
                </div>
              </div>

              {isUser && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon name="User" size={16} />
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name="Compass" size={16} />
            </div>
            <div style={{
              padding: '10px 14px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: '2px 10px 10px 10px',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontStyle: 'italic' }}>OpenRouter AI consulting live hydrographic telemetry...</span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          display: 'flex',
          gap: '10px'
        }}
      >
        <input
          type="text"
          className="form-control"
          placeholder="Ask anything about voyage corridors, weather risks, port delays..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          style={{ flex: 1, padding: '12px 14px', fontSize: '13px' }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0 20px', flexShrink: 0 }}
        >
          <Icon name="Send" size={15} />
          <span>Send</span>
        </button>
      </form>

      {/* OpenRouter API Key Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="Key" size={18} color="var(--accent-cyan)" />
                <span>OpenRouter API Key (100% Free)</span>
              </div>
              <button className="modal-close" onClick={() => setShowKeyModal(false)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
              WAYPOINT connects directly to OpenRouter's free-tier models (Llama 3.3 70B, DeepSeek R1, Gemini 2.0 Flash) with zero charge.
            </p>

            <div className="box box-note" style={{ fontSize: '12px', marginBottom: '16px' }}>
              <strong>How to get your free key:</strong>
              <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>Sign up at <a href="https://openrouter.ai" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>openrouter.ai</a> (No credit card required).</li>
                <li>Go to <strong>Keys</strong> &gt; <strong>Create Key</strong>.</li>
                <li>Paste your key below. It is stored securely in your browser's local storage.</li>
              </ol>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                OpenRouter Key
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="sk-or-v1-..."
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                style={{ width: '100%', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setShowKeyModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveKey}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

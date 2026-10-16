// WAYPOINT — Maritime Route Assistant (AI Maritime Copilot)
import React, { useState, useRef, useEffect } from 'react';
import Icon from '../components/Icon';
import { WAYPOINT_DATA } from '../data/maritimeData';

export default function RouteAssistant({ onNavigate }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      time: '12:00',
      text: 'Good day, Operator. I am the **WAYPOINT Maritime Intelligence Assistant**. I analyze live hydrographic feeds, vessel telemetry, cyclone advisories, and historical sea lanes.\n\nHow may I assist your route planning or risk mitigation today?'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  const presets = WAYPOINT_DATA.assistantPresets || [];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (textToSend) => {
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

    setTimeout(() => {
      // Find matching preset or generate contextual maritime answer
      const matched = presets.find(p => p.q.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(p.q.toLowerCase().slice(0, 15)));
      
      let replyText = '';
      let action = null;

      if (matched) {
        replyText = matched.a;
        action = matched.suggestedAction;
      } else if (query.toLowerCase().includes('draft') || query.toLowerCase().includes('kolkata') || query.toLowerCase().includes('paradip') || query.toLowerCase().includes('chennai') || query.toLowerCase().includes('gangavaram')) {
        replyText = '**Port Draft & Bathymetric Limits (CSV Dataset):**\n\n• **Gangavaram (INGGV):** 21.0m (Deepest draft, Capesize/VLCC compliant)\n• **Dhamra (INDHA) & Kamarajar (INENR):** 18.0m - 18.5m draft\n• **Chennai (INMAA) & Paradip (INPBD):** 14.5m - 16.5m draft\n• **Kolkata (INCCU):** 8.5m riverine draft (Handysize & Feeder restricted)\n\n*Guidance: Vessels exceeding 14.5m draft must berth at Gangavaram, Dhamra, or Krishnapatnam.*';
        action = 'catalog';
      } else if (query.toLowerCase().includes('carrier') || query.toLowerCase().includes('line') || query.toLowerCase().includes('maersk') || query.toLowerCase().includes('msc')) {
        replyText = '**Active Shipping Lines (shipping_lines_by_port.csv):**\n\n• **Global Container Lines:** Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE, Evergreen, COSCO/OOCL\n• **Regional Feeders:** X-Press Feeders, Sea Consortium, RCL, Samudera, Unifeeder, Bengal Tiger Line\n• **Dry Bulk Operators:** Oldendorff Carriers, Star Bulk, Berge Bulk, Ultrabulk\n\nAll 385 port-carrier pairings are cataloged in the Ports & Trade Directory.';
        action = 'catalog';
      } else if (query.toLowerCase().includes('weather') || query.toLowerCase().includes('storm') || query.toLowerCase().includes('cyclone')) {
        replyText = '**Severe Weather Advisory in Effect:**\n\n• **System:** Tropical Storm ASANI located at 9.5°N, 88.5°E.\n• **Wave Heights:** 4.8m – 5.5m in central quadrant.\n• **Recommended Action:** Vessels bound for Singapore should divert via the equatorial southern bypass (4°N), avoiding northern Bay of Bengal.';
        action = 'rerouting';
      } else if (query.toLowerCase().includes('port') || query.toLowerCase().includes('singapore') || query.toLowerCase().includes('wait')) {
        replyText = '**Port Telemetry Advisory:**\n\n• **Singapore (Jurong / Pasir Panjang):** Elevated queue time of 42 hours.\n• **Chennai / Nhava Sheva:** Normal operations, ~14-18 hours average wait.\n• **Recommendation:** Request virtual arrival slotting to adjust transit speed and conserve bunker fuel.';
        action = 'plan';
      } else {
        replyText = `Understood. Analyzing telemetry for: "${query}".\n\n• **Route Calculation:** Optimal great-circle corridor synthesized from trade_links_east_coast.csv.\n• **Risk Assessment:** No critical piracy or navigational blockage detected on standard track.\n• **Recommendation:** Check our route comparison engine to review cost, draft compatibility, and carrier options.`;
        action = 'compare';
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: replyText,
          action
        }
      ]);
      setIsTyping(false);
    }, 600);
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
            AI Route Copilot
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-teal">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--safe-teal)' }} />
            ECMWF / NOAA Model Live
          </span>
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
                  textAlign: isUser ? 'right' : 'left'
                }}>
                  {m.time}
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
              <span style={{ fontStyle: 'italic' }}>Synthesizing hydrographic analysis...</span>
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
    </div>
  );
}

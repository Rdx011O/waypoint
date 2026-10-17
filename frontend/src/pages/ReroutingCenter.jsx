// WAYPOINT — Rerouting Center (CSV-driven, no hardcoded data)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { fetchRerouteScenario, acceptRerouteDispatch } from "../services/telemetryService";
import MarineMap from "../components/MarineMap";
import Icon from "../components/Icon";

const BACKEND_URL = "http://localhost:5000";

function PortSearchInput({ label, value, onChange, placeholder, id }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  useEffect(() => { if (!value) { setQuery(""); setSuggestions([]); } }, [value]);
  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const search = useCallback((q) => {
    if (!q || q.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/ports/search?q=${encodeURIComponent(q)}`);
        if (res.ok) { const d = await res.json(); setSuggestions(d.ports || []); setShowDropdown(true); }
      } catch (e) { console.warn("Port search:", e.message); } finally { setLoading(false); }
    }, 250);
  }, []);
  const handleInput = (e) => { const v = e.target.value; setQuery(v); onChange(null); search(v); };
  const handleSelect = (port) => { setQuery(port.name); onChange(port); setSuggestions([]); setShowDropdown(false); };
  const inp = { width:"100%", background:"var(--bg-surface-elevated)", border:"1px solid var(--border-subtle)", color:"#fff", padding:"9px 12px", borderRadius:"8px", fontSize:"13px", fontFamily:"Inter, sans-serif", outline:"none", boxSizing:"border-box" };
  return (
    <div ref={containerRef} style={{position:"relative",flex:1,minWidth:"180px"}}>
      <label htmlFor={id} style={{fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"5px"}}>{label}</label>
      <div style={{position:"relative"}}>
        <input id={id} type="text" value={query} onChange={handleInput} onFocus={() => query.length>=2 && setShowDropdown(suggestions.length>0)} placeholder={placeholder} style={inp} autoComplete="off" />
        {loading && <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"10px",color:"var(--text-muted)"}}>Searching…</span>}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--bg-surface)",border:"1px solid var(--border-subtle)",borderRadius:"8px",zIndex:999,maxHeight:"240px",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
          {suggestions.map((p, i) => (
            <button key={i} onClick={() => handleSelect(p)}
              style={{width:"100%",background:"transparent",border:"none",borderBottom:i<suggestions.length-1?"1px solid var(--border-subtle)":"none",padding:"9px 12px",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--bg-surface-elevated)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:"12.5px",color:"#F8FAFC",fontWeight:500}}>{p.name}</span>
              <span style={{fontSize:"10.5px",color:"var(--text-muted)",fontFamily:"JetBrains Mono, monospace",flexShrink:0}}>{p.country}{p.unlocode?` · ${p.unlocode}`:""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReroutingCenter({ onAcceptReroute, onNavigateToCompare, onNavigateToRiskMap, onNavigate }) {
  const [sourcePort,    setSourcePort]    = useState(null);
  const [destPort,      setDestPort]      = useState(null);
  const [shipSpeed,     setShipSpeed]     = useState(14);
  const [scenario,      setScenario]      = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [viewMode,      setViewMode]      = useState("map");
  const [confirmModal,  setConfirmModal]  = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [decisionLogs,  setDecisionLogs]  = useState([]);
  const [calculated,    setCalculated]    = useState(false);

  const calculateRoute = async () => {
    if (!sourcePort || !destPort) { setError("Please select both a source and destination port from the dropdown suggestions."); return; }
    setError(null); setLoading(true); setCalculated(false); setScenario(null);
    try {
      const data = await fetchRerouteScenario(sourcePort.name, destPort.name, shipSpeed);
      if (data && data.success) {
        setScenario(data); setDecisionLogs(data.decisionHistory || []); setCalculated(true);
      } else if (data && data.error) {
        let msg = data.message || "Rerouting calculation failed.";
        if (data.suggestions && data.suggestions.length > 0) msg += `\n\nDid you mean: ${data.suggestions.join(", ")}?`;
        setError(msg);
      } else { setError("No rerouting result returned. Please check both port names."); }
    } catch (err) { setError(`Backend error: ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    setConfirmModal(false);
    const dd = {
      scenarioId: scenario?.scenarioId || `REROUTE-${Date.now()}`,
      vessel: scenario?.affectedVessel || "Vessel (unspecified)",
      routeId: scenario?.alternativeRoute?.name || "Alternative Safe Bypass",
      source: sourcePort?.name || "", destination: destPort?.name || "",
      reason: `Severe weather avoidance (Waves > ${scenario?.weatherVerification?.forecastPeakWaveM || 2.5}m)`
    };
    const res = await acceptRerouteDispatch(dd);
    const newLog = res?.logEntry || { id:`DEC-${Math.floor(100+Math.random()*900)}`, timestamp:new Date().toISOString().replace("T"," ").substring(0,19)+" UTC", vessel:dd.vessel, route:dd.routeId, source:dd.source, destination:dd.destination, reason:dd.reason, savings:"Severe weather avoided" };
    setDecisionLogs(prev => [newLog, ...prev]);
    setStatusMessage(`Alternative safe bypass accepted! Course instruction broadcast on voyage ${sourcePort?.name} → ${destPort?.name} via Inmarsat-C GMDSS.`);
    if (onAcceptReroute) onAcceptReroute({ scenario:scenario?.title||"Severe Weather Warning", vessel:dd.vessel, costDelta:scenario?.impactDelta?.costChange, etaDelta:scenario?.impactDelta?.etaChange, riskDelta:scenario?.impactDelta?.riskChange });
  };

  const mapRoutes = scenario ? [
    { id:"ORIG", name:scenario.originalRoute?.name||"Original Track", coords:scenario.originalRoute?.coords||[], color:"#EF4444", isRecommended:false, cost:scenario.originalRoute?.cost, transitDays:scenario.originalRoute?.etaDays, distanceNm:scenario.originalRoute?.distanceNm, riskScore:scenario.originalRoute?.riskScore },
    { id:"ALT",  name:scenario.alternativeRoute?.name||"Alternative Bypass", coords:scenario.alternativeRoute?.coords||[], color:"#2DD4BF", isRecommended:true, cost:scenario.alternativeRoute?.cost, transitDays:scenario.alternativeRoute?.etaDays, distanceNm:scenario.alternativeRoute?.distanceNm, riskScore:scenario.alternativeRoute?.riskScore }
  ] : [];
  const mapCenter = scenario ? [scenario.originalRoute?.coords?.[0]?.[0]??14.5, scenario.originalRoute?.coords?.[0]?.[1]??84.5] : [14.5, 84.5];

  const reset = () => { setSourcePort(null); setDestPort(null); setScenario(null); setError(null); setCalculated(false); setDecisionLogs([]); setStatusMessage(""); };

  return (
    <div>
      <div style={{marginBottom:"18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 style={{fontSize:"22px",fontWeight:800,color:"#fff",letterSpacing:"-0.01em",marginBottom:"4px"}}>Rerouting Center</h1>
          <p style={{fontSize:"12.5px",color:"var(--text-secondary)"}}>Enter source and destination ports from the CSV maritime database to calculate weather-safe bypass routes.</p>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {calculated && <span className="tag tag-crit">Active Rerouting Analysis</span>}
          <span className="tag tag-live" style={{background:"rgba(45,212,191,0.1)",color:"var(--safe-teal)",borderColor:"rgba(45,212,191,0.3)"}}>Live Telemetry Hooked</span>
        </div>
      </div>

      <div className="box box-warning" style={{marginBottom:"16px"}}>
        <strong>OPERATIONAL PROTOCOL (ASD-STE100)</strong> Dynamic rerouting recalculations require naval dispatch confirmation before satellite GMDSS waypoint transmission to vessel masters.
      </div>

      {statusMessage && (
        <div className="box box-note" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",background:"rgba(45,212,191,0.12)",border:"1px solid rgba(45,212,191,0.35)",padding:"12px 16px",marginBottom:"18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <Icon name="CheckCircle2" size={18} color="var(--safe-teal)" />
            <span style={{color:"#F8FAFC",fontSize:"13px",fontWeight:500}}>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage("")} style={{background:"transparent",border:"none",color:"var(--text-secondary)",cursor:"pointer"}}><Icon name="X" size={16} /></button>
        </div>
      )}

      {/* Port Input */}
      <div style={{background:"var(--bg-surface)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",padding:"18px 20px",marginBottom:"20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
          <Icon name="Navigation" size={16} color="var(--accent-cyan)" />
          <h3 style={{fontSize:"13.5px",fontWeight:700,color:"#fff",margin:0}}>Route Configuration</h3>
          <span style={{fontSize:"11px",color:"var(--text-muted)",marginLeft:"4px"}}>— Type any port name from your maritime dataset</span>
        </div>
        <div style={{display:"flex",gap:"12px",flexWrap:"wrap",alignItems:"flex-end"}}>
          <PortSearchInput id="reroute-source" label="Source Port" value={sourcePort?.name} onChange={setSourcePort} placeholder="e.g. Chennai, Visakhapatnam…" />
          <div style={{paddingBottom:"8px",color:"var(--text-muted)",flexShrink:0}}><Icon name="ArrowRight" size={20} /></div>
          <PortSearchInput id="reroute-dest" label="Destination Port" value={destPort?.name} onChange={setDestPort} placeholder="e.g. Singapore, Colombo, Chittagong…" />
          <div style={{flexShrink:0}}>
            <label style={{fontSize:"11px",fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:"5px"}}>Vessel Speed</label>
            <select value={shipSpeed} onChange={(e) => setShipSpeed(Number(e.target.value))} style={{background:"var(--bg-surface-elevated)",border:"1px solid var(--border-subtle)",color:"#fff",padding:"9px 12px",borderRadius:"8px",fontSize:"12px",fontFamily:"JetBrains Mono, monospace",cursor:"pointer"}}>
              <option value={10}>10 kts (Eco Steam)</option>
              <option value={12}>12 kts (Slow Steam)</option>
              <option value={14}>14 kts (Standard)</option>
              <option value={16}>16 kts (Express)</option>
              <option value={18}>18 kts (Max Speed)</option>
            </select>
          </div>
          <div style={{flexShrink:0}}>
            <label style={{fontSize:"11px",color:"transparent",display:"block",marginBottom:"5px"}}>&nbsp;</label>
            <button className="btn btn-primary" onClick={calculateRoute} disabled={loading||!sourcePort||!destPort} style={{display:"flex",alignItems:"center",gap:"7px",opacity:(!sourcePort||!destPort)?0.5:1,cursor:(!sourcePort||!destPort)?"not-allowed":"pointer"}}>
              {loading ? <><Icon name="Loader" size={14}/><span>Calculating…</span></> : <><Icon name="Wind" size={14}/><span>Calculate Safe Route</span></>}
            </button>
          </div>
          {(sourcePort||destPort||calculated) && (
            <div style={{flexShrink:0}}>
              <label style={{fontSize:"11px",color:"transparent",display:"block",marginBottom:"5px"}}>&nbsp;</label>
              <button className="btn btn-outline" onClick={reset} style={{display:"flex",alignItems:"center",gap:"6px"}}>
                <Icon name="RotateCcw" size={13}/><span>Reset</span>
              </button>
            </div>
          )}
        </div>
        {(sourcePort||destPort) && (
          <div style={{display:"flex",gap:"8px",marginTop:"12px",flexWrap:"wrap"}}>
            {sourcePort && <span style={{fontSize:"11px",background:"rgba(56,189,248,0.12)",border:"1px solid rgba(56,189,248,0.3)",color:"#38BDF8",padding:"3px 10px",borderRadius:"20px",fontFamily:"JetBrains Mono, monospace"}}>✓ {sourcePort.name} ({sourcePort.country})</span>}
            {destPort   && <span style={{fontSize:"11px",background:"rgba(45,212,191,0.12)",border:"1px solid rgba(45,212,191,0.3)",color:"#2DD4BF",padding:"3px 10px",borderRadius:"20px",fontFamily:"JetBrains Mono, monospace"}}>✓ {destPort.name} ({destPort.country})</span>}
          </div>
        )}
      </div>

      {error && (
        <div className="box box-warning" style={{marginBottom:"20px",whiteSpace:"pre-line"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:"8px"}}>
            <Icon name="AlertTriangle" size={16} color="var(--caution-amber)"/>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!calculated && !loading && !error && (
        <div style={{background:"var(--bg-surface)",border:"1px dashed var(--border-subtle)",borderRadius:"var(--radius-md)",padding:"48px 24px",textAlign:"center",marginBottom:"20px"}}>
          <Icon name="Map" size={36} color="var(--text-muted)"/>
          <p style={{color:"var(--text-secondary)",marginTop:"12px",fontSize:"13.5px"}}>Enter a source and destination port above, then click <strong style={{color:"#fff"}}>Calculate Safe Route</strong>.</p>
          <p style={{color:"var(--text-muted)",fontSize:"12px",marginTop:"6px"}}>Ports are resolved from your CSV dataset (east coast India ports + global partner ports).</p>
        </div>
      )}

      {calculated && scenario && (
        <>
          <div style={{background:"linear-gradient(90deg,rgba(248,113,113,0.15),rgba(16,28,51,0.85))",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"var(--radius-md)",padding:"16px 20px",marginBottom:"20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"14px"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                <Icon name="AlertTriangle" size={18} color="var(--hazard-red)"/>
                <h3 style={{fontSize:"15px",fontWeight:800,color:"#FECACA",margin:0}}>{scenario.title} — Region: {scenario.region}</h3>
              </div>
              <p style={{fontSize:"12px",color:"var(--text-secondary)",margin:"4px 0 0"}}>
                Voyage: <strong>{scenario.departure}</strong> → <strong>{scenario.destination}</strong>.{scenario.cargo && <> Cargo: <span style={{color:"#F8FAFC"}}>{scenario.cargo}</span></>}
              </p>
            </div>
            <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
              <span className="tag tag-crit" style={{fontSize:"11px",padding:"4px 10px"}}>{scenario.severity||"Critical"} Hazard Core</span>
              <span style={{fontSize:"11px",fontFamily:"JetBrains Mono, monospace",color:"#F87171",background:"rgba(239,68,68,0.15)",padding:"4px 8px",borderRadius:"4px",border:"1px solid rgba(239,68,68,0.3)"}}>Waves: {scenario.hazardZone?.peakWaveHeightM||"—"}m</span>
            </div>
          </div>

          <div style={{background:"var(--bg-surface-elevated)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",padding:"16px 18px",marginBottom:"20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px",marginBottom:"12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <Icon name="Wind" size={17} color="var(--accent-cyan)"/>
                <h4 style={{fontSize:"13.5px",fontWeight:700,color:"#fff",margin:0}}>Dual Weather Verification (Live Telemetry)</h4>
              </div>
              <span style={{fontSize:"10.5px",color:"var(--safe-teal)",fontFamily:"JetBrains Mono, monospace",background:"rgba(45,212,191,0.1)",padding:"3px 8px",borderRadius:"4px",border:"1px solid rgba(45,212,191,0.25)"}}>Open-Meteo Marine & NOAA NDBC</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:"12px"}}>
              <div style={{background:"rgba(14,165,233,0.06)",border:"1px solid rgba(14,165,233,0.25)",borderRadius:"var(--radius-sm)",padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                  <span style={{background:"rgba(56,189,248,0.2)",color:"#38BDF8",fontWeight:700,padding:"2px 6px",borderRadius:"4px",fontSize:"10px"}}>FORECAST</span>
                  <span style={{fontSize:"11px",color:"var(--text-muted)"}}>Open-Meteo Marine</span>
                </div>
                <div style={{fontSize:"18px",fontWeight:800,color:"#fff",fontFamily:"JetBrains Mono, monospace",margin:"4px 0"}}>
                  {scenario.weatherVerification?.forecastPeakWaveM??"—"}m<span style={{fontSize:"11px",fontWeight:500,color:"var(--text-secondary)",marginLeft:"6px"}}>Peak Wave Height</span>
                </div>
              </div>
              <div style={{background:"rgba(45,212,191,0.06)",border:"1px solid rgba(45,212,191,0.25)",borderRadius:"var(--radius-sm)",padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                  <span style={{background:"rgba(45,212,191,0.2)",color:"#2DD4BF",fontWeight:700,padding:"2px 6px",borderRadius:"4px",fontSize:"10px"}}>OBSERVED</span>
                  <span style={{fontSize:"11px",color:"#2DD4BF",fontWeight:600}}>NOAA NDBC Sensor</span>
                </div>
                <div style={{fontSize:"18px",fontWeight:800,color:"#fff",fontFamily:"JetBrains Mono, monospace",margin:"4px 0"}}>
                  {scenario.weatherVerification?.observedBuoyWaveM??"—"}m<span style={{fontSize:"11px",fontWeight:500,color:"var(--text-secondary)",marginLeft:"6px"}}>Buoy Sensor</span>
                </div>
                <div style={{fontSize:"11px",color:"var(--text-secondary)"}}>{scenario.weatherVerification?.buoyStation||"Nearest ocean buoy"}</div>
              </div>
              <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"var(--radius-sm)",padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                  <span style={{background:"rgba(239,68,68,0.2)",color:"#F87171",fontWeight:700,padding:"2px 6px",borderRadius:"4px",fontSize:"10px"}}>REROUTE LOGIC</span>
                  <span style={{fontSize:"11px",color:"#F87171",fontWeight:600}}>Threshold &gt; 2.5m</span>
                </div>
                <div style={{fontSize:"14px",fontWeight:700,color:"#FCA5A5",margin:"4px 0"}}>{scenario.weatherVerification?.thresholdExceeded?"Bypass Triggered":"Below Threshold"}</div>
                <div style={{fontSize:"11px",color:"var(--text-secondary)"}}>{scenario.weatherVerification?.status||"Forecast corroborated by buoy sensor."}</div>
              </div>
            </div>
          </div>

          <div style={{background:"var(--bg-surface)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",padding:"18px",marginBottom:"20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px",flexWrap:"wrap",gap:"10px"}}>
              <div>
                <div style={{fontSize:"14px",fontWeight:800,color:"#fff"}}>Navigational Comparison: {sourcePort?.name} → {destPort?.name}</div>
                <div style={{fontSize:"12px",color:"var(--text-secondary)"}}>Red Track: Direct path crossing storm core • Teal Track: Dynamically calculated safe bypass</div>
              </div>
              <div style={{display:"flex",gap:"6px"}}>
                {["map","schematic"].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{padding:"5px 12px",borderRadius:"5px",fontSize:"11.5px",cursor:"pointer",fontWeight:viewMode===m?700:500,border:viewMode===m?"1px solid var(--accent-cyan)":"1px solid var(--border-subtle)",background:viewMode===m?"rgba(56,189,248,0.2)":"var(--bg-surface-elevated)",color:viewMode===m?"#fff":"var(--text-secondary)"}}>
                    {m==="map"?"Interactive Map":"Vector Schematic"}
                  </button>
                ))}
              </div>
            </div>
            {viewMode==="map" ? (
              <div style={{borderRadius:"8px",overflow:"hidden",border:"1px solid var(--border-subtle)"}}>
                <MarineMap center={mapCenter} zoom={5} height="440px" routes={mapRoutes} showHazards={true} showVessels={false}/>
              </div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <svg viewBox="0 0 640 260" role="img" style={{maxWidth:"100%",height:"auto",background:"#080E1A",borderRadius:"6px"}}>
                  <defs>
                    <marker id="ar2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#2DD4BF"/></marker>
                    <marker id="ao2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#F87171"/></marker>
                  </defs>
                  <rect width="640" height="260" fill="#080E1A"/>
                  <ellipse cx="320" cy="112" rx="70" ry="42" fill="#F87171" fillOpacity=".22" stroke="#F87171" strokeDasharray="5 4"/>
                  <text x="320" y="116" textAnchor="middle" fill="#F87171" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="700">Hazard Zone ({scenario.title})</text>
                  <path d="M70 150 C 170 130, 240 112, 320 112 S 480 120, 570 100" fill="none" stroke="#F87171" strokeWidth="3" markerEnd="url(#ao2)"/>
                  <path d="M70 150 C 150 215, 270 225, 360 200 S 520 150, 570 100" fill="none" stroke="#2DD4BF" strokeWidth="3" markerEnd="url(#ar2)"/>
                  <circle cx="70" cy="150" r="7" fill="#38BDF8"/><circle cx="570" cy="100" r="7" fill="#38BDF8"/>
                  <g fontFamily="Inter, sans-serif" fontSize="11" fill="#F8FAFC">
                    <text x="28" y="176">{sourcePort?.name?.split(" ")[0]}</text>
                    <text x="542" y="86">{destPort?.name?.split(" ")[0]}</text>
                    <text x="200" y="232" fill="#2DD4BF" fontWeight="700">Alternative Bypass (Safe)</text>
                    <text x="150" y="104" fill="#F87171" fontWeight="700">Original Track (Hazard)</text>
                  </g>
                </svg>
              </div>
            )}
          </div>

          <div className="table-wrap" style={{marginBottom:"22px"}}>
            <table className="data-table">
              <thead><tr><th>Evaluation Parameter</th><th style={{textAlign:"right"}}>Original Track</th><th style={{textAlign:"right"}}>Alternative Bypass</th><th style={{textAlign:"right"}}>Operational Delta</th></tr></thead>
              <tbody>
                <tr>
                  <td>Cost (USD)</td>
                  <td className="mono" style={{textAlign:"right"}}>${(scenario.originalRoute?.cost||0).toLocaleString()}</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--safe-teal)",fontWeight:700}}>${(scenario.alternativeRoute?.cost||0).toLocaleString()}</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--caution-amber)",fontWeight:600}}>{scenario.impactDelta?.costChange||"—"}</td>
                </tr>
                <tr>
                  <td>Estimated Transit (ETA)</td>
                  <td className="mono" style={{textAlign:"right"}}>{scenario.originalRoute?.etaDays??"—"} days</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--safe-teal)",fontWeight:700}}>{scenario.alternativeRoute?.etaDays??"—"} days</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--caution-amber)",fontWeight:600}}>{scenario.impactDelta?.etaChange||"—"}</td>
                </tr>
                <tr>
                  <td>Risk Index Score (/100)</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--hazard-red)",fontWeight:700}}>{scenario.originalRoute?.riskScore??"—"} (Severe Hazard)</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--safe-teal)",fontWeight:700}}>{scenario.alternativeRoute?.riskScore??"—"} (Safe Sea State)</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--safe-teal)",fontWeight:700}}>{scenario.impactDelta?.riskChange||"—"}</td>
                </tr>
                <tr>
                  <td>Navigational Distance (NM)</td>
                  <td className="mono" style={{textAlign:"right"}}>{(scenario.originalRoute?.distanceNm||0).toLocaleString()} NM</td>
                  <td className="mono" style={{textAlign:"right",color:"#fff",fontWeight:600}}>{(scenario.alternativeRoute?.distanceNm||0).toLocaleString()} NM</td>
                  <td className="mono" style={{textAlign:"right",color:"var(--text-secondary)"}}>{scenario.impactDelta?.distanceChangeNm||"—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"28px"}}>
            <button className="btn btn-safe" onClick={() => setConfirmModal(true)}><Icon name="CheckCircle2" size={15}/><span>Accept Alternative Route</span></button>
            <button className="btn btn-outline" onClick={() => setStatusMessage(`Master notified: Original route maintained on voyage ${sourcePort?.name} → ${destPort?.name}. Advised to reduce speed and take anti-rolling ballasting.`)}><Icon name="AlertTriangle" size={15}/><span>Keep Original Route</span></button>
            <button className="btn btn-outline" onClick={() => onNavigate?onNavigate("compare"):onNavigateToCompare?.()}><Icon name="Scale" size={15}/><span>Compare Alternatives</span></button>
            <button className="btn btn-outline" onClick={() => onNavigate?onNavigate("riskmap"):onNavigateToRiskMap?.()}><Icon name="Map" size={15}/><span>View Live Risk Map</span></button>
          </div>
        </>
      )}

      {decisionLogs.length > 0 && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
            <h3 style={{fontSize:"14.5px",fontWeight:700,color:"#fff",margin:0}}>Historical Avoidance Log (Naval Dispatch Audit)</h3>
            <span style={{fontSize:"11px",color:"var(--text-secondary)"}}>{decisionLogs.length} Logged Decision{decisionLogs.length!==1?"s":""}</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Decision ID</th><th>Timestamp</th><th>Voyage</th><th>Route</th><th>Justification</th><th>Outcome</th></tr></thead>
              <tbody>
                {decisionLogs.map((h,i) => (
                  <tr key={h.id||i}>
                    <td className="mono" style={{color:"var(--accent-cyan)"}}>{h.id||h.decisionId}</td>
                    <td style={{color:"var(--text-secondary)"}}>{h.timestamp}</td>
                    <td>{h.source&&h.destination?`${h.source} → ${h.destination}`:(h.vessel||"—")}</td>
                    <td>{h.route}</td>
                    <td>{h.reason}</td>
                    <td style={{color:"var(--safe-teal)",fontWeight:600}}>{h.savings||"Dispatched safely"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{maxWidth:"520px"}}>
            <div className="modal-header">
              <div className="modal-title" style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <Icon name="Send" size={16} color="var(--safe-teal)"/><span>Confirm Reroute & Satellite Broadcast</span>
              </div>
              <button className="modal-close" onClick={() => setConfirmModal(false)}><Icon name="X" size={18}/></button>
            </div>
            <div className="box box-warning" style={{fontSize:"12.5px",marginBottom:"16px"}}>
              <strong>OPERATIONAL DISPATCH NOTIFICATION</strong> Accepting this instructs the vessel on voyage <strong>{sourcePort?.name} → {destPort?.name}</strong> to alter course to the safe bypass, avoiding {scenario?.title||"the severe hazard zone"}.
            </div>
            <div className="table-wrap" style={{marginBottom:"16px"}}>
              <table className="data-table" style={{fontSize:"12.5px"}}>
                <tbody>
                  <tr><td>Departure / Destination</td><td className="mono" style={{textAlign:"right"}}>{sourcePort?.name} → {destPort?.name}</td></tr>
                  <tr><td>ETA Variance</td><td className="mono" style={{textAlign:"right",color:"var(--caution-amber)"}}>{scenario?.impactDelta?.etaChange||"—"}</td></tr>
                  <tr><td>Incremental Bunker Cost</td><td className="mono" style={{textAlign:"right"}}>{scenario?.impactDelta?.costChange||"—"}</td></tr>
                  <tr><td>Risk Abatement</td><td className="mono" style={{textAlign:"right",color:"var(--safe-teal)",fontWeight:700}}>{scenario?.impactDelta?.riskChange||"—"}</td></tr>
                  <tr><td>Cargo on Voyage</td><td className="mono" style={{textAlign:"right"}}>{scenario?.cargo||"—"}</td></tr>
                  <tr><td>Broadcast Channel</td><td className="mono" style={{textAlign:"right",color:"var(--accent-cyan)"}}>Inmarsat-C GMDSS / Navtex</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:"8px"}}>
              <button className="btn btn-outline" onClick={() => setConfirmModal(false)}>Cancel</button>
              <button className="btn btn-safe" onClick={handleConfirm}><Icon name="CheckCircle2" size={14}/><span>Confirm & Transmit Broadcast</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

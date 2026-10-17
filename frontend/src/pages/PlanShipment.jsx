// WAYPOINT — Plan a Shipment (Shipper Core Tool)
// Powered by Indian East Coast Ports, Foreign Partner Ports, Vessel Types, and Routing Algorithm from CSV/Firestore
import React, { useState, useEffect } from 'react';
import { 
  CSV_INDIAN_PORTS, 
  CSV_FOREIGN_PORTS, 
  CSV_VESSEL_TYPES 
} from '../data/maritimeCsvData';
import { fetchIndianPorts, fetchForeignPorts } from '../services/firebase';
import { synthesizeMaritimeRoutes } from '../services/routingAlgorithm';
import { getVesselSchedulesForDate } from '../services/vesselScheduleService';
import MarineMap from '../components/MarineMap';
import Icon from '../components/Icon';

export default function PlanShipment({ onNavigate }) {
  const [indianPorts, setIndianPorts] = useState(CSV_INDIAN_PORTS);
  const [foreignPorts, setForeignPorts] = useState(CSV_FOREIGN_PORTS);
  const [_loadingPorts, setLoadingPorts] = useState(false);

  // Form states
  const [originId, setOriginId] = useState('EC14'); // Default: Chennai
  const [destId, setDestId] = useState('FP02');     // Default: Singapore
  const [cargoType, setCargoType] = useState('Containers');
  const [vesselType, setVesselType] = useState('Panamax / Post-Panamax');
  const [weight, setWeight] = useState(25000);
  const [budget, setBudget] = useState(35000);
  // priority state reserved for future use

  // Calendar state
  const [departureDate, setDepartureDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Load latest ports from Firestore or fallback
  useEffect(() => {
    async function loadData() {
      setLoadingPorts(true);
      try {
        const ind = await fetchIndianPorts();
        const forg = await fetchForeignPorts();
        if (ind && ind.length) setIndianPorts(ind);
        if (forg && forg.length) setForeignPorts(forg);
      } catch (err) {
        console.warn("Using bundled CSV ports:", err);
      } finally {
        setLoadingPorts(false);
      }
    }
    loadData();
  }, []);

  const selectedOrigin = indianPorts.find(p => p.portId === originId) || indianPorts[0];
  const selectedDest = foreignPorts.find(p => p.portId === destId) || foreignPorts[0];

  // Draft Feasibility Check
  const draftMap = {
    'Feeder': 8.0,
    'Panamax / Post-Panamax': 12.5,
    'Neo-Panamax / ULCV': 15.5,
    'Handysize / Supramax': 10.0,
    'Panamax / Kamsarmax': 13.5,
    'Capesize': 18.0,
    'Aframax / Suezmax': 15.0,
    'VLCC': 20.5,
    'LPG carrier (VLGC)': 11.5,
    'LNG carrier': 12.0,
    'PCTC': 9.5,
    'Multipurpose / Break-bulk': 9.0
  };
  const reqDraft = draftMap[vesselType] || 10.0;
  const isDraftFeasible = (selectedOrigin?.maxDraftM || 12.0) >= reqDraft;

  // Selecting any date immediately redirects to Compare Routes with the available ships
  const handleDateSelectAndRedirect = (targetDate) => {
    setDepartureDate(targetDate);
    const scheduleRes = getVesselSchedulesForDate({
      originId,
      destId,
      departureDate: targetDate,
      cargoType,
      vesselType,
      weight
    });
    const firstAvail = scheduleRes?.vessels?.find(v => v.status === 'AVAILABLE') || scheduleRes?.vessels?.[0] || null;

    const scenario = synthesizeMaritimeRoutes({
      originPort: selectedOrigin,
      destPort: selectedDest,
      cargoType,
      vesselType,
      benchmarkBudget: budget,
      departureDate: targetDate,
      selectedVessel: firstAvail
    });

    const fullPayload = {
      ...scenario,
      origin: selectedOrigin,
      destination: selectedDest,
      originId,
      destId,
      cargoType,
      vesselType,
      weight,
      budget,
      departureDate: targetDate,
      selectedVessel: firstAvail,
      scheduleData: scheduleRes
    };

    sessionStorage.setItem('waypoint_current_scenario', JSON.stringify(fullPayload));
    if (onNavigate) {
      onNavigate('compare');
    }
  };

  // Calculate Multi-Criteria Route Options button submit
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const scheduleRes = getVesselSchedulesForDate({
      originId,
      destId,
      departureDate,
      cargoType,
      vesselType,
      weight
    });
    const firstAvail = scheduleRes?.vessels?.find(v => v.status === 'AVAILABLE') || scheduleRes?.vessels?.[0] || null;

    const scenario = synthesizeMaritimeRoutes({
      originPort: selectedOrigin,
      destPort: selectedDest,
      cargoType,
      vesselType,
      benchmarkBudget: budget,
      departureDate,
      selectedVessel: firstAvail
    });

    const fullPayload = {
      ...scenario,
      origin: selectedOrigin,
      destination: selectedDest,
      originId,
      destId,
      cargoType,
      vesselType,
      weight,
      budget,
      departureDate,
      selectedVessel: firstAvail,
      scheduleData: scheduleRes
    };

    sessionStorage.setItem('waypoint_current_scenario', JSON.stringify(fullPayload));
    if (onNavigate) {
      onNavigate('compare');
    }
  };

  const cargoOptions = [
    { id: 'Containers', label: 'Containers (TEU)', iconName: 'Package' },
    { id: 'Thermal Coal', label: 'Thermal Coal', iconName: 'Layers' },
    { id: 'Coking Coal', label: 'Coking Coal', iconName: 'Layers' },
    { id: 'Iron Ore', label: 'Iron Ore Pellets', iconName: 'Layers' },
    { id: 'Cars (Ro-Ro)', label: 'Automobiles (Ro-Ro)', iconName: 'Ship' },
    { id: 'Crude Oil & POL', label: 'Crude Oil / POL', iconName: 'Radio' },
    { id: 'LNG / LPG', label: 'Liquefied Gas (LNG/LPG)', iconName: 'Compass' },
    { id: 'Steel & Project Cargo', label: 'Steel & Heavy Lift', iconName: 'Compass' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            marginBottom: '4px'
          }}>
            Cargo & Voyage Planning
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Plan a Shipment — Multi-Criteria Route Solver
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Calculates nautical corridors, draft limitations, and carrier matching across 18 Indian East Coast ports & 47 international trade partners.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-teal">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--safe-teal)' }} />
            18 Ports • 47 Foreign Links Live
          </span>
        </div>
      </div>

      {/* Draft Constraint Warning Banner */}
      {!isDraftFeasible && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(248, 113, 113, 0.12)',
          border: '1px solid var(--hazard-red)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#FECACA',
          fontSize: '12.5px'
        }}>
          <Icon name="AlertTriangle" size={18} color="var(--hazard-red)" />
          <div>
            <strong>DRAFT RESTRICTION WARNING: </strong>
            {selectedOrigin?.name} maximum permissible draft is <strong>{selectedOrigin?.maxDraftM}m</strong>, but selected vessel class (<strong>{vesselType}</strong>) requires <strong>{reqDraft}m</strong> draft. Consider deepwater ports like Gangavaram (21m) or Dhamra (18m).
          </div>
        </div>
      )}

      {/* Main Grid: Parameters Form & Marine Map Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) 1fr', gap: '20px' }} className="plan-grid">
        {/* Parameters Form */}
        <div className="card" style={{ padding: '22px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Origin & Destination Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Origin Port (East Coast India) *</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>Max Draft: {selectedOrigin?.maxDraftM}m</span>
                </label>
                <select 
                  className="form-control" 
                  value={originId} 
                  onChange={(e) => setOriginId(e.target.value)}
                >
                  {indianPorts.map((p) => (
                    <option key={p.portId} value={p.portId}>
                      {p.name} ({p.state} • {p.type} • {p.maxDraftM}m draft)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Destination Port (International Trade Partner) *</label>
                <select 
                  className="form-control" 
                  value={destId} 
                  onChange={(e) => setDestId(e.target.value)}
                >
                  {foreignPorts.map((p) => (
                    <option key={p.portId} value={p.portId}>
                      {p.name} ({p.country} • {p.unlocode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CALENDAR & PORT DEPARTURE SCHEDULE OPTION */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="Calendar" size={15} color="var(--accent-cyan)" />
                  <span>Departure Date & Port Calendar *</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--safe-teal)', fontWeight: 600 }}>
                  ⚡ Auto-redirects to Compare Routes
                </span>
              </div>

              {/* Date Input with Quick Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="date"
                  className="form-control mono"
                  value={departureDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDateSelectAndRedirect(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    background: 'var(--bg-surface-alt)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    border: '1px solid var(--accent-cyan)'
                  }}
                />

                {/* Quick Date Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { label: 'Today', days: 0 },
                    { label: 'Tomorrow', days: 1 },
                    { label: '+3 Days', days: 3 },
                    { label: '+7 Days', days: 7 },
                    { label: '+14 Days', days: 14 }
                  ].map(pill => {
                    const target = new Date();
                    target.setDate(target.getDate() + pill.days);
                    const iso = target.toISOString().split('T')[0];
                    const isSel = departureDate === iso;
                    return (
                      <button
                        key={pill.label}
                        type="button"
                        onClick={() => handleDateSelectAndRedirect(iso)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: isSel ? 700 : 500,
                          borderRadius: '12px',
                          border: `1px solid ${isSel ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                          background: isSel ? 'rgba(56, 189, 248, 0.25)' : 'var(--bg-surface)',
                          color: isSel ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
                padding: '8px 10px',
                background: 'rgba(56, 189, 248, 0.08)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Icon name="Compass" size={14} color="var(--accent-cyan)" />
                <span>Selecting any date opens <strong>Compare Routes</strong> with all available ships, carrier capacity, and pricing for {selectedOrigin?.name}.</span>
              </div>
            </div>

            {/* Vessel Class Selector */}
            <div>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Vessel Category & Class *</span>
                <span style={{ color: isDraftFeasible ? 'var(--safe-teal)' : 'var(--hazard-red)' }}>
                  Req: {reqDraft}m ({isDraftFeasible ? 'Feasible' : 'Exceeds Draft'})
                </span>
              </label>
              <select 
                className="form-control" 
                value={vesselType} 
                onChange={(e) => setVesselType(e.target.value)}
              >
                {CSV_VESSEL_TYPES.map((v) => (
                  <option key={v.id} value={v.type}>
                    {v.category}: {v.type} ({v.capacityRange})
                  </option>
                ))}
              </select>
            </div>

            {/* Cargo Type */}
            <div>
              <label className="form-label">Cargo Classification *</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {cargoOptions.slice(0, 4).map((c) => {
                  const isSel = cargoType === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setCargoType(c.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: isSel ? 'rgba(56, 189, 248, 0.14)' : 'var(--bg-surface-alt)',
                        border: `1px solid ${isSel ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                        color: isSel ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name={c.iconName} size={14} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics: Weight & Budget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label">Cargo Weight (Metric Tonnes)</label>
                <input
                  type="number"
                  className="form-control mono"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div>
                <label className="form-label">Benchmark Budget (USD)</label>
                <input
                  type="number"
                  className="form-control mono"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  min={1000}
                  step={500}
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                marginTop: '6px',
                cursor: 'pointer'
              }}
            >
              <Icon name="Compass" size={16} />
              <span>Calculate Multi-Criteria Route Options</span>
            </button>
          </form>
        </div>

        {/* Marine Map & Route Corridor Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card" style={{ padding: '16px', flex: 1, minHeight: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '13.5px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Corridor Preview: {selectedOrigin?.name} → {selectedDest?.name}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Live geodetic distance & bathymetric channel visualization
                </p>
              </div>
              <span className="badge badge-cyan">
                {selectedDest?.country}
              </span>
            </div>

            <div style={{ height: '380px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <MarineMap
                routes={[
                  {
                    id: 'preview',
                    coords: [
                      [selectedOrigin?.lat || 13.09, selectedOrigin?.lng || 80.29],
                      [5.9, 80.5], // South of Sri Lanka
                      [selectedDest?.lat || 1.26, selectedDest?.lng || 103.84]
                    ],
                    color: '#38BDF8',
                    label: `${selectedOrigin?.name} to ${selectedDest?.name}`
                  }
                ]}
                showHazards={true}
                showVessels={false}
              />
            </div>
          </div>

          {/* Quick Port Telemetry Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px'
          }}>
            <div className="card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Origin UN/LOCODE</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {selectedOrigin?.unlocode}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {selectedOrigin?.coastRegion || selectedOrigin?.state}
              </div>
            </div>

            <div className="card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Port Throughput FY24</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {selectedOrigin?.trafficFY24MT} MT
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--safe-teal)', marginTop: '2px' }}>
                Capacity: {selectedOrigin?.cargoCapacityMTPA} MTPA
              </div>
            </div>

            <div className="card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Container Capacity</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {selectedOrigin?.containerCapacityTEU ? `${(selectedOrigin?.containerCapacityTEU / 1000).toFixed(0)}k TEU` : 'Bulk / General'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Draft: {selectedOrigin?.maxDraftM}m
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

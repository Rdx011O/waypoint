// WAYPOINT — Plan a Shipment (Shipper Core Tool)
import React, { useState } from 'react';
import { WAYPOINT_DATA } from '../data/maritimeData';
import MarineMap from '../components/MarineMap';
import Icon from '../components/Icon';

export default function PlanShipment({ onFindRoutes }) {
  const ports = WAYPOINT_DATA.ports;
  const [origin, setOrigin] = useState('INNSA');
  const [dest, setDest] = useState('SGSIN');
  const [cargoType, setCargoType] = useState('General Cargo');
  const [weight, setWeight] = useState(1200);
  const [budget, setBudget] = useState(20000);
  const [priority, setPriority] = useState('Balanced');

  const handleSwap = () => {
    const temp = origin;
    setOrigin(dest);
    setDest(temp);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!weight || !budget) {
      alert('Please enter valid cargo weight and budget limits.');
      return;
    }
    onFindRoutes({ origin, dest, cargoType, weight, budget, priority });
  };

  const cargoOptions = [
    { id: 'General Cargo', label: 'General Cargo', iconName: 'Package' },
    { id: 'Containers', label: 'Containers', iconName: 'Ship' },
    { id: 'Bulk', label: 'Bulk Freight', iconName: 'Layers' },
    { id: 'Liquid', label: 'Liquid / Tanker', iconName: 'Radio' },
    { id: 'Refrigerated', label: 'Reefer / Perishable', iconName: 'Wind' }
  ];

  const priorityOptions = [
    { id: 'Lowest Cost', label: 'Lowest Cost', iconName: 'DollarSign' },
    { id: 'Fastest Delivery', label: 'Fastest Transit', iconName: 'Clock' },
    { id: 'Lowest Risk', label: 'Lowest Risk', iconName: 'ShieldAlert' },
    { id: 'Balanced', label: 'Optimal Balanced', iconName: 'Scale' }
  ];

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: '4px' }}>
          Plan a Shipment
        </h1>
        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Configure departure, destination, cargo classification, and priority parameters for optimal dispatch synthesis.
        </p>
      </div>

      <div className="box box-note">
        <strong>OPERATOR GUIDANCE (ASD-STE100)</strong>
        Use the swap control to exchange origin and destination ports. The route solver factors in live bathymetric lanes and weather risk envelopes.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: '20px' }} className="plan-grid">
        {/* Parameters Form */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '22px'
        }}>
          <form onSubmit={handleSubmit}>
            {/* Origin & Destination with Swap */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">Origin Port *</label>
                <select className="select-input" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                  {ports.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSwap}
                title="Swap Origin and Destination"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface-alt)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginTop: '18px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon name="ArrowLeftRight" size={14} />
              </button>

              <div style={{ flex: 1 }}>
                <label className="input-label">Destination Port *</label>
                <select className="select-input" value={dest} onChange={(e) => setDest(e.target.value)}>
                  {ports.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cargo Type Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Cargo Profile *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {cargoOptions.map((c) => {
                  const isActive = cargoType === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCargoType(c.id)}
                      style={{
                        padding: '8px 10px',
                        background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-surface-alt)',
                        border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-sm)',
                        color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon name={c.iconName} size={14} />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cargo Weight & Maximum Budget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="input-label">Cargo Weight (Metric Tonnes) *</label>
                <input
                  type="number"
                  className="text-input"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  placeholder="e.g. 1200"
                />
              </div>
              <div>
                <label className="input-label">Maximum Budget (USD) *</label>
                <input
                  type="number"
                  className="text-input"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  placeholder="e.g. 20000"
                />
              </div>
            </div>

            {/* Dispatch Priority */}
            <div style={{ marginBottom: '22px' }}>
              <label className="input-label">Optimization Priority *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {priorityOptions.map((pr) => {
                  const isActive = priority === pr.id;
                  return (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => setPriority(pr.id)}
                      style={{
                        padding: '9px 10px',
                        background: isActive ? 'rgba(45, 212, 191, 0.12)' : 'var(--bg-surface-alt)',
                        border: `1px solid ${isActive ? 'var(--safe-teal)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-sm)',
                        color: isActive ? 'var(--safe-teal)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon name={pr.iconName} size={14} />
                      <span>{pr.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ padding: '11px' }}>
              <Icon name="Compass" size={16} />
              <span>Find Optimal Corridors</span>
              <Icon name="ChevronRight" size={15} />
            </button>
          </form>
        </div>

        {/* Live Route Corridor Preview */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-surface-alt)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Icon name="Map" size={15} color="var(--accent-cyan)" />
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>Geodesic Preview</span>
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Distance: ~3,250 nm
            </div>
          </div>

          <MarineMap
            height="460px"
            center={[12, 85]}
            zoom={4}
            activeLayers={{ routes: true, vessels: false, hazards: true, ports: true, risks: false }}
          />
        </div>
      </div>
    </div>
  );
}

// WAYPOINT — Maritime Trade & Port Directory (Powered by CSV Dataset & Firestore)
import React, { useState } from 'react';
import { 
  CSV_INDIAN_PORTS, 
  CSV_FOREIGN_PORTS, 
  CSV_TRADE_LINKS, 
  CSV_SHIPPING_LINES, 
  CSV_VESSEL_TYPES 
} from '../data/maritimeCsvData';
import Icon from '../components/Icon';

export default function TradeCatalog({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('indianPorts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('All');

  // 1. Indian Ports Filter
  const filteredIndianPorts = CSV_INDIAN_PORTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.unlocode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.mainCargo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = filterRegion === 'All' || p.coastRegion.includes(filterRegion);
    return matchesSearch && matchesRegion;
  });

  // 2. Foreign Ports Filter
  const filteredForeignPorts = CSV_FOREIGN_PORTS.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.unlocode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 3. Trade Links Filter
  const filteredTradeLinks = CSV_TRADE_LINKS.filter(l => 
    l.originPort.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.destinationPort.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.commodities.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 4. Shipping Lines Filter
  const filteredShippingLines = CSV_SHIPPING_LINES.filter(s => 
    s.portName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
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
            Hydrographic & Commercial Directory
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Maritime Ports & Trade Network Catalog
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Structured database of 18 East Coast Indian ports, 47 global trade partners, 116 corridors, and 385 carrier services.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-teal">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--safe-teal)' }} />
            CSV Data Synced to Firestore
          </span>
        </div>
      </div>

      {/* Tabs & Search Filter Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'indianPorts', label: `Indian Ports (${CSV_INDIAN_PORTS.length})`, icon: 'Anchor' },
            { id: 'foreignPorts', label: `Global Partner Ports (${CSV_FOREIGN_PORTS.length})`, icon: 'Compass' },
            { id: 'tradeLinks', label: `Trade Corridors (${CSV_TRADE_LINKS.length})`, icon: 'GitCommit' },
            { id: 'shippingLines', label: `Carriers by Port (${CSV_SHIPPING_LINES.length})`, icon: 'Ship' },
            { id: 'vessels', label: `Vessel Classes (${CSV_VESSEL_TYPES.length})`, icon: 'Layers' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon name={tab.icon} size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface-alt)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 12px',
          width: '280px'
        }}>
          <Icon name="Search" size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Filter ports, commodities, lines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* TAB 1: Indian East Coast Ports */}
      {activeTab === 'indianPorts' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Port ID / Name</th>
                  <th>UN/LOCODE</th>
                  <th>State / Region</th>
                  <th>Type</th>
                  <th>Max Draft</th>
                  <th>Capacity</th>
                  <th>Container TEU</th>
                  <th>FY24 Traffic</th>
                  <th>Dominant Cargo</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndianPorts.map(p => (
                  <tr key={p.portId}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>ID: {p.portId}</div>
                    </td>
                    <td className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {p.unlocode}
                    </td>
                    <td>
                      <div>{p.state}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.coastRegion}</div>
                    </td>
                    <td>
                      <span className={`badge ${p.type.includes('Major') ? 'badge-teal' : 'badge-amber'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: p.maxDraftM >= 16 ? 'var(--safe-teal)' : 'var(--text-primary)' }}>
                      {p.maxDraftM}m
                    </td>
                    <td className="mono">{p.cargoCapacityMTPA} MTPA</td>
                    <td className="mono">
                      {p.containerCapacityTEU > 0 ? `${(p.containerCapacityTEU / 1000).toLocaleString()}k TEU` : '—'}
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>{p.trafficFY24MT} MT</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '240px', lineHeight: 1.35 }}>
                      {p.mainCargo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Foreign Partner Ports */}
      {activeTab === 'foreignPorts' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Port ID</th>
                  <th>Foreign Port Name</th>
                  <th>Country</th>
                  <th>UN/LOCODE</th>
                  <th>Coordinates (WGS84)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredForeignPorts.map(p => (
                  <tr key={p.portId}>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>{p.portId}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>
                      <span className="badge badge-cyan">{p.country}</span>
                    </td>
                    <td className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {p.unlocode}
                    </td>
                    <td className="mono" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {p.lat.toFixed(3)}°N, {p.lng.toFixed(3)}°E
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onNavigate && onNavigate('plan')}
                      >
                        <Icon name="Compass" size={12} />
                        <span>Plan Route</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Trade Links */}
      {activeTab === 'tradeLinks' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Origin Port (India)</th>
                  <th>Trade Direction</th>
                  <th>Destination Port</th>
                  <th>Country</th>
                  <th>Great Circle Distance</th>
                  <th>Typical Cargo Commodities</th>
                </tr>
              </thead>
              <tbody>
                {filteredTradeLinks.map(l => (
                  <tr key={l.linkId}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {l.originPort} ({l.originPortId})
                    </td>
                    <td>
                      <span className={`badge ${l.tradeDirection.includes('Import') ? 'badge-teal' : 'badge-amber'}`}>
                        {l.tradeDirection}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {l.destinationPort}
                    </td>
                    <td>{l.country}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {l.greatCircleNm} nm <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({l.greatCircleKm} km)</span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                      {l.commodities}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Shipping Lines by Port */}
      {activeTab === 'shippingLines' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Port Name</th>
                  <th>Port ID</th>
                  <th>Shipping Company / Line</th>
                  <th>Service Category</th>
                  <th>Call Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredShippingLines.slice(0, 100).map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.portName}</td>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>{s.portId}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{s.company}</td>
                    <td>
                      <span className="badge badge-cyan" style={{ textTransform: 'capitalize' }}>
                        {s.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.callType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredShippingLines.length > 100 && (
            <div style={{ textAlign: 'center', padding: '12px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Showing first 100 of {filteredShippingLines.length} shipping line records. Refine search to filter.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Vessel Types & Capacity */}
      {activeTab === 'vessels' && (
        <div className="card" style={{ padding: '20px' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vessel Category</th>
                  <th>Vessel Class / Type</th>
                  <th>Capacity Range</th>
                  <th>Typical Cargo</th>
                  <th>East Coast Ports Served</th>
                </tr>
              </thead>
              <tbody>
                {CSV_VESSEL_TYPES.map(v => (
                  <tr key={v.id}>
                    <td>
                      <span className="badge badge-teal">{v.category}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.type}</td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {v.capacityRange}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v.typicalCargo}</td>
                    <td style={{ fontSize: '11.5px', color: 'var(--text-muted)', maxWidth: '280px' }}>
                      {v.portsServed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

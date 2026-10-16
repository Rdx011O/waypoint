// WAYPOINT — Saved Routes & Portfolio Management (Shipper Core Suite)
import React, { useState, useEffect } from 'react';
import { WAYPOINT_DATA } from '../data/maritimeData';
import { 
  fetchSavedRoutesFromCloud, 
  saveRouteToCloud, 
  updateRouteInCloud, 
  deleteRouteFromCloud 
} from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import MarineMap from '../components/MarineMap';
import Icon from '../components/Icon';

export default function SavedRoutes({ onNavigate }) {
  const { userProfile } = useAuth();
  const [routes, setRoutes] = useState(() => {
    const local = localStorage.getItem('waypoint_saved_portfolio');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return WAYPOINT_DATA.savedRoutes || [];
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  
  // Modals
  const [inspectRoute, setInspectRoute] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exportModal, setExportModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Sync with Firestore on mount
  useEffect(() => {
    async function syncWithFirestore() {
      setLoading(true);
      const cloudRoutes = await fetchSavedRoutesFromCloud(userProfile?.uid);
      if (cloudRoutes && cloudRoutes.length > 0) {
        // Merge cloud routes with baseline
        setRoutes(prev => {
          const merged = [...cloudRoutes];
          prev.forEach(p => {
            if (!merged.find(m => m.id === p.id || m.name === p.name)) {
              merged.push(p);
            }
          });
          localStorage.setItem('waypoint_saved_portfolio', JSON.stringify(merged));
          return merged;
        });
      }
      setLoading(false);
    }
    syncWithFirestore();
  }, [userProfile]);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Update localStorage whenever routes change
  const updatePortfolioState = (newRoutes) => {
    setRoutes(newRoutes);
    localStorage.setItem('waypoint_saved_portfolio', JSON.stringify(newRoutes));
  };

  // Rename Route Handler
  const handleRename = async () => {
    if (!renameTarget || !newName.trim()) return;
    const updated = routes.map(r => r.id === renameTarget.id ? { ...r, name: newName.trim() } : r);
    updatePortfolioState(updated);
    await updateRouteInCloud(renameTarget.id, { name: newName.trim() });
    showToast(`Route renamed to "${newName.trim()}"`);
    setRenameTarget(null);
  };

  // Delete Route Handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const updated = routes.filter(r => r.id !== deleteTarget.id);
    updatePortfolioState(updated);
    await deleteRouteFromCloud(deleteTarget.id);
    showToast(`Removed "${deleteTarget.name}" from portfolio`);
    setDeleteTarget(null);
  };

  // Duplicate Route Handler
  const handleDuplicate = async (target) => {
    const clone = {
      ...target,
      id: `SR-${Date.now().toString().slice(-4)}`,
      name: `${target.name} (Copy)`,
      lastSaved: new Date().toISOString().split('T')[0],
      badge: 'Active'
    };
    const updated = [clone, ...routes];
    updatePortfolioState(updated);
    await saveRouteToCloud(clone, userProfile?.uid);
    showToast(`Created duplicate route "${clone.name}"`);
  };

  // Status Change Handler
  const handleStatusChange = async (routeId, newStatus) => {
    const updated = routes.map(r => r.id === routeId ? { ...r, badge: newStatus } : r);
    updatePortfolioState(updated);
    await updateRouteInCloud(routeId, { badge: newStatus });
    showToast(`Status updated to ${newStatus}`);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Route ID', 'Name', 'Origin', 'Destination', 'Cargo Profile', 'Estimated Cost', 'Transit Time', 'Risk Score', 'Status', 'Last Saved'];
    const rows = routes.map(r => [
      `"${r.id}"`,
      `"${r.name}"`,
      `"${r.origin}"`,
      `"${r.dest}"`,
      `"${r.cargo}"`,
      `"${r.cost}"`,
      `"${r.transit}"`,
      `"${r.risk}"`,
      `"${r.badge || 'Active'}"`,
      `"${r.lastSaved}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `waypoint_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Portfolio exported as CSV successfully');
    setExportModal(false);
  };

  // Export JSON Handler
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(routes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `waypoint_portfolio_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Portfolio exported as JSON successfully');
    setExportModal(false);
  };

  // Re-evaluate in Plan/Compare
  const handleReevaluate = (route) => {
    sessionStorage.setItem('waypoint_plan_defaults', JSON.stringify({
      origin: route.origin,
      dest: route.dest,
      cargo: route.cargo
    }));
    if (onNavigate) {
      onNavigate('plan');
    }
  };

  // Portfolio Executive Summary Calculations
  const parseCost = (c) => parseInt(String(c).replace(/[^0-9]/g, ''), 10) || 0;
  const parseTransit = (t) => parseFloat(String(t).replace(/[^0-9.]/g, '')) || 0;

  const totalValue = routes.reduce((acc, r) => acc + parseCost(r.cost), 0);
  const activeCount = routes.filter(r => (r.badge || 'Active') === 'Active').length;
  const avgTransit = routes.length ? (routes.reduce((acc, r) => acc + parseTransit(r.transit), 0) / routes.length).toFixed(1) : '0.0';
  const avgRisk = routes.length ? Math.round(routes.reduce((acc, r) => acc + (Number(r.risk) || 20), 0) / routes.length) : 0;

  // Filter & Sort
  const filteredRoutes = routes.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (r.name || '').toLowerCase().includes(query) ||
                          (r.origin || '').toLowerCase().includes(query) ||
                          (r.dest || '').toLowerCase().includes(query) ||
                          (r.cargo || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'All' || (r.badge || 'Active') === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'cost-asc') return parseCost(a.cost) - parseCost(b.cost);
    if (sortBy === 'cost-desc') return parseCost(b.cost) - parseCost(a.cost);
    if (sortBy === 'transit-asc') return parseTransit(a.transit) - parseTransit(b.transit);
    if (sortBy === 'risk-asc') return (a.risk || 0) - (b.risk || 0);
    return 0; // default
  });

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
            Commercial Shipments Portfolio
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Saved Routes & Dispatch Portfolio
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Manage recurring ocean freight lanes, booked corridors, and export voyage manifests.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => setExportModal(true)}>
            <Icon name="FileDown" size={14} />
            <span>Export Portfolio</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate && onNavigate('plan')}>
            <Icon name="Plus" size={14} />
            <span>Plan New Route</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(45, 212, 191, 0.12)',
          border: '1px solid var(--safe-teal)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--safe-teal)',
          fontSize: '12.5px',
          fontWeight: 500
        }}>
          <Icon name="CheckCircle2" size={16} />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Portfolio Executive KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px' }}>
            <span>Total Portfolio Value</span>
            <Icon name="DollarSign" size={15} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            ${totalValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {routes.length} booked lane corridors
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px' }}>
            <span>Active Dispatches</span>
            <Icon name="Ship" size={15} color="var(--safe-teal)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--safe-teal)', fontFamily: 'var(--font-mono)' }}>
            {activeCount} Voyages
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Live tracking active in water
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px' }}>
            <span>Average Portfolio Transit</span>
            <Icon name="Clock" size={15} color="var(--text-primary)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {avgTransit} days
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Optimal cruise profile
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px' }}>
            <span>Portfolio Safety Index</span>
            <Icon name="ShieldCheck" size={15} color="var(--safe-teal)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--safe-teal)', fontFamily: 'var(--font-mono)' }}>
            {avgRisk}/100
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--safe-teal)', marginTop: '4px' }}>
            Low hazard vulnerability
          </div>
        </div>
      </div>

      {/* Control Strip: Search, Status Filter Pills & Sort Options */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          {['All', 'Active', 'Validated', 'Review', 'Archived'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === status ? 'var(--accent-cyan)' : 'transparent',
                color: statusFilter === status ? '#070D18' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Right Search & Sort */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Sort Dropdown */}
          <select
            className="form-control"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
          >
            <option value="date-desc">Newest First</option>
            <option value="cost-asc">Cost: Low to High</option>
            <option value="cost-desc">Cost: High to Low</option>
            <option value="transit-asc">Transit Time: Fastest</option>
            <option value="risk-asc">Risk: Safest First</option>
          </select>

          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface-alt)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            width: '240px'
          }}>
            <Icon name="Search" size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search route or port..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '12px',
                width: '100%'
              }}
            />
          </div>
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Route Name & Identifier</th>
                <th>Origin Port</th>
                <th>Destination</th>
                <th>Cargo Profile</th>
                <th>Cost (USD)</th>
                <th>Transit</th>
                <th>Risk Score</th>
                <th>Status Control</th>
                <th style={{ textAlign: 'right' }}>Portfolio Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {r.id} • Saved: {r.lastSaved}</div>
                  </td>
                  <td>{r.origin}</td>
                  <td style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>{r.dest}</td>
                  <td>{r.cargo}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{r.cost}</td>
                  <td className="mono">{r.transit}</td>
                  <td>
                    <span className={`badge ${Number(r.risk) < 20 ? 'badge-teal' : Number(r.risk) < 35 ? 'badge-amber' : 'badge-crit'}`}>
                      {r.risk}/100
                    </span>
                  </td>
                  <td>
                    <select
                      value={r.badge || 'Active'}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        color: (r.badge || 'Active') === 'Active' ? 'var(--safe-teal)' : (r.badge || 'Active') === 'Review' ? 'var(--caution-amber)' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 6px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Validated">Validated</option>
                      <option value="Review">Review</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '5px' }}>
                      {/* Inspect / View corridor */}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setInspectRoute(r)}
                        title="Inspect Corridor & Telemetry"
                      >
                        <Icon name="Eye" size={13} />
                      </button>

                      {/* Re-evaluate in Plan/Compare */}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleReevaluate(r)}
                        title="Re-calculate with Live Weather"
                      >
                        <Icon name="RefreshCw" size={13} />
                      </button>

                      {/* Duplicate */}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDuplicate(r)}
                        title="Clone Route Profile"
                      >
                        <Icon name="Copy" size={13} />
                      </button>

                      {/* Rename */}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => { setRenameTarget(r); setNewName(r.name); }}
                        title="Rename Route"
                      >
                        <Icon name="Edit2" size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteTarget(r)}
                        title="Delete from Portfolio"
                      >
                        <Icon name="Trash2" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRoutes.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No saved routes found matching "{searchQuery}" under status "{statusFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Route Corridor Modal */}
      {inspectRoute && (
        <div className="modal-overlay" onClick={() => setInspectRoute(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{inspectRoute.name}</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Voyage Corridor & Telemetry Overview
                </p>
              </div>
              <button className="modal-close" onClick={() => setInspectRoute(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                padding: '12px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Origin</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{inspectRoute.origin}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Destination</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)' }}>{inspectRoute.dest}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Cost</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{inspectRoute.cost}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Transit</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--safe-teal)', fontFamily: 'var(--font-mono)' }}>{inspectRoute.transit}</div>
                </div>
              </div>

              <div style={{ height: '220px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <MarineMap
                  center={[12, 85]}
                  zoom={4}
                  height="220px"
                  activeLayers={{ routes: true, vessels: false, hazards: true, ports: true, risks: false }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    handleReevaluate(inspectRoute);
                    setInspectRoute(null);
                  }}
                >
                  <Icon name="Compass" size={14} />
                  <span>Re-evaluate Parameters in Plan</span>
                </button>
                <button className="btn btn-primary" onClick={() => setInspectRoute(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="modal-overlay" onClick={() => setRenameTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Rename Saved Route</h3>
              <button className="modal-close" onClick={() => setRenameTarget(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Route Title</label>
              <input
                type="text"
                className="form-control"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setRenameTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRename}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '18px', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> from your cloud portfolio? This will remove the record from Firebase Cloud Firestore.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Portfolio Modal */}
      {exportModal && (
        <div className="modal-overlay" onClick={() => setExportModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Export Voyage Portfolio</h3>
              <button className="modal-close" onClick={() => setExportModal(false)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Download your validated sea lanes and dispatch estimates for charter agreements or insurance underwriting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', padding: '12px' }}
                onClick={handleExportCSV}
              >
                <Icon name="FileSpreadsheet" size={18} color="var(--safe-teal)" />
                <div style={{ textAlign: 'left', marginLeft: '6px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Download as CSV (.csv)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compatible with Microsoft Excel, Google Sheets, ERPs</div>
                </div>
              </button>

              <button
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', padding: '12px' }}
                onClick={handleExportJSON}
              >
                <Icon name="Code" size={18} color="var(--accent-cyan)" />
                <div style={{ textAlign: 'left', marginLeft: '6px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Download as JSON (.json)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Structured voyage manifest for maritime APIs</div>
                </div>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button className="btn btn-outline" onClick={() => setExportModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

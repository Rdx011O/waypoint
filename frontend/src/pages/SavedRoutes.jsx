// WAYPOINT — Saved Routes Portfolio
import React, { useState } from 'react';
import Icon from '../components/Icon';

export default function SavedRoutes({ routes, onOpenRoute, onDeleteRoute, onRenameRoute, onNewRoute }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [exportModal, setExportModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = routes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.dest.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div style={{
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', marginBottom: '4px' }}>
            Saved Routes Portfolio
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Company recurring sea corridors, validated lane profiles, and booked dispatches.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => setExportModal(true)}>
            <Icon name="FileDown" size={14} />
            <span>Export Route Report</span>
          </button>
          <button className="btn btn-primary" onClick={onNewRoute}>
            <Icon name="Package" size={14} />
            <span>Plan New Route</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{ marginBottom: '16px', maxWidth: '360px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '7px 12px'
        }}>
          <Icon name="Search" size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search port, route ID or corridor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '12.5px',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Route Identifier</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Cargo Profile</th>
              <th>Cost (USD)</th>
              <th>Transit</th>
              <th>Risk Score</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{r.origin}</td>
                <td>{r.dest}</td>
                <td>{r.cargo}</td>
                <td className="mono">{r.cost}</td>
                <td className="mono">{r.transit}</td>
                <td className="mono">
                  <span className={`tag tag-${r.risk < 20 ? 'live' : r.risk < 30 ? 'demo' : 'warn'}`}>
                    {r.risk}/100
                  </span>
                </td>
                <td><span className="tag tag-live">{r.badge || 'Active'}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '5px' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onOpenRoute(r)}
                      title="Open Route"
                    >
                      <Icon name="Eye" size={13} />
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => { setRenameTarget(r); setNewName(r.name); }}
                      title="Rename Route"
                    >
                      <Icon name="Edit2" size={13} />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteTarget(r)}
                      title="Remove Route"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No saved routes match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rename Modal */}
      {renameTarget && (
        <div className="modal-overlay" onClick={() => setRenameTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Rename Route Profile</div>
              <button className="modal-close" onClick={() => setRenameTarget(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Route Title</label>
              <input
                type="text"
                className="text-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setRenameTarget(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onRenameRoute(renameTarget.id, newName);
                  setRenameTarget(null);
                }}
              >
                Save Name
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
              <div className="modal-title">Confirm Deletion</div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '18px' }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> from your cloud portfolio? This action cannot be reversed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onDeleteRoute(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Delete Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Report Notice Modal */}
      {exportModal && (
        <div className="modal-overlay" onClick={() => setExportModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Export Route Report</div>
              <button className="modal-close" onClick={() => setExportModal(false)}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="box box-note">
              <strong>ASD-STE100 COMPLIANCE NOTICE</strong>
              PDF generation integration is not connected in this prototype.
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '18px' }}>
              In full deployment, this action exports IMO-compliant voyage declarations, bunker carbon estimates, and weather risk mitigations for insurance underwriters.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setExportModal(false)}>
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

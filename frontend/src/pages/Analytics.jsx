// WAYPOINT — Maritime Analytics (Manager & Operations)
import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import Icon from '../components/Icon';
import { WAYPOINT_DATA } from '../data/maritimeData';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const chartInstances = useRef({});

  useEffect(() => {
    // 1. Spend & Volume Trends Chart
    if (barChartRef.current) {
      if (chartInstances.current.bar) chartInstances.current.bar.destroy();
      const ctx = barChartRef.current.getContext('2d');
      chartInstances.current.bar = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct (MTD)'],
          datasets: [
            {
              label: 'Bunker & Route Spend ($k)',
              data: [312, 289, 340, 295, 310, 284.5],
              backgroundColor: 'rgba(56, 189, 248, 0.75)',
              borderRadius: 4
            },
            {
              label: 'CO2 Offsets ($k)',
              data: [28, 24, 32, 26, 29, 25],
              backgroundColor: 'rgba(45, 212, 191, 0.6)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#8899B2', font: { family: 'Inter', size: 11 } }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#8899B2', font: { family: 'Inter', size: 10 } }
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#8899B2', font: { family: 'JetBrains Mono', size: 10 } }
            }
          }
        }
      });
    }

    // 2. Chokepoint Risk Exposure Doughnut
    if (doughnutChartRef.current) {
      if (chartInstances.current.doughnut) chartInstances.current.doughnut.destroy();
      const ctx = doughnutChartRef.current.getContext('2d');
      chartInstances.current.doughnut = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Malacca Strait (High)', 'Suez / Bab-el-Mandeb (Crit)', 'Cape of Good Hope (Low)', 'Singapore Anchorage (Mod)'],
          datasets: [{
            data: [42, 28, 18, 12],
            backgroundColor: [
              '#F59E0B',
              '#EF4444',
              '#2DD4BF',
              '#38BDF8'
            ],
            borderColor: '#0B132B',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#8899B2', font: { family: 'Inter', size: 10 }, boxWidth: 10 }
            }
          },
          cutout: '68%'
        }
      });
    }

    return () => {
      if (chartInstances.current.bar) chartInstances.current.bar.destroy();
      if (chartInstances.current.doughnut) chartInstances.current.doughnut.destroy();
    };
  }, [timeRange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
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
            Operational Telemetry
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Maritime Analytics & Fleet Intelligence
          </h1>
        </div>

        {/* Time Filter Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface)',
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                background: timeRange === range ? 'var(--accent-cyan)' : 'transparent',
                color: timeRange === range ? '#070D18' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        {[
          { label: 'Voyage Schedule Reliability', val: '94.2%', sub: '+2.1% benchmark', icon: 'CheckCircle2', col: 'var(--safe-teal)' },
          { label: 'Average Transit Delta', val: '-1.4 days', sub: 'Faster than planned', icon: 'Clock', col: 'var(--accent-cyan)' },
          { label: 'Fleet Fuel Cost / NM', val: '$5.68', sub: '-$0.34 optimal trim', icon: 'Fuel', col: 'var(--safe-teal)' },
          { label: 'Total Cargo Moved', val: '482,000 MT', sub: 'Across 128 voyages', icon: 'Package', col: 'var(--text-primary)' },
          { label: 'Chokepoint Incident Rate', val: '0.0%', sub: 'Zero security events', icon: 'ShieldCheck', col: 'var(--safe-teal)' },
          { label: 'Avoided Storm Exposure', val: '14 Vessels', sub: 'Early reroute decisions', icon: 'Compass', col: 'var(--caution-amber)' }
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>{k.label}</span>
              <span style={{ color: k.col }}><Icon name={k.icon} size={16} /></span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {k.val}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '16px'
      }}>
        {/* Spend Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Bunker & Voyage Spend Analysis
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Monthly aggregation with fuel offset benchmarks
              </p>
            </div>
            <span className="badge badge-teal">Live Sync</span>
          </div>
          <div style={{ height: '260px' }}>
            <canvas ref={barChartRef} />
          </div>
        </div>

        {/* Chokepoint Doughnut */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Chokepoint Risk Exposure
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Active voyages crossing strategic maritime bottlenecks
              </p>
            </div>
            <span className="badge badge-amber">4 Chokepoints</span>
          </div>
          <div style={{ height: '260px' }}>
            <canvas ref={doughnutChartRef} />
          </div>
        </div>
      </div>

      {/* Strategic Sea Lanes Efficiency Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Primary Corridor Performance Index
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Historical average metrics over the past 90 operating days
            </p>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Corridor / Lane</th>
                <th>Avg Transit</th>
                <th>Distance</th>
                <th>Reliability</th>
                <th>Congestion Wait</th>
                <th>Risk Index</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Mumbai (Nhava Sheva) → Singapore (Jurong)</td>
                <td>12.5 days</td>
                <td>3,250 nm</td>
                <td>96.8%</td>
                <td>18 hrs</td>
                <td><span className="badge badge-teal">24/100 Low</span></td>
                <td><span className="badge badge-teal">Normal</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Colombo (Sri Lanka) → Felixstowe (UK)</td>
                <td>21.4 days</td>
                <td>6,890 nm</td>
                <td>91.2%</td>
                <td>32 hrs</td>
                <td><span className="badge badge-amber">48/100 Mod</span></td>
                <td><span className="badge badge-amber">Monitoring</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Shanghai (China) → Rotterdam (Netherlands)</td>
                <td>24.8 days</td>
                <td>10,500 nm</td>
                <td>88.4%</td>
                <td>44 hrs</td>
                <td><span className="badge badge-crit">62/100 High</span></td>
                <td><span className="badge badge-amber">Congested</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Jebel Ali (Dubai) → Mumbai (Nhava Sheva)</td>
                <td>3.8 days</td>
                <td>1,080 nm</td>
                <td>98.5%</td>
                <td>8 hrs</td>
                <td><span className="badge badge-teal">12/100 Low</span></td>
                <td><span className="badge badge-teal">Optimal</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

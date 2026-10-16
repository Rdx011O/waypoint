// WAYPOINT — Maritime Route Intelligence | pages.js
// Render functions for each page specified in ASD-STE100 Operator Manual

window.PAGES = {

  // =========================================================================
  // 1. DASHBOARD (SECTION 4)
  // =========================================================================
  renderDashboard() {
    const isShipper = appState.currentRole === 'shipper';
    const kpis = window.WAYPOINT_DATA.dashboardKpis;
    const alerts = window.WAYPOINT_DATA.alerts.slice(0, 4);
    const trackedCargos = window.WAYPOINT_DATA.trackedCargos || [];

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">${isShipper ? 'Shipment & Cargo Overview' : 'Maritime Operations Command'}</h1>
          <p class="page-desc">${isShipper ? 'Monitor active cargo bookings, live GPS ship tracking, synthesized route portfolios, and transit schedules.' : 'Global fleet operations, active shipping corridors, live GPS cargo tracking, and real-time hazard intelligence.'}</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-safe" onclick="navigate('tracker')">🛰️ Live GPS Cargo Tracker</button>
          ${isShipper ? `
            <button class="btn btn-primary" onclick="navigate('plan')">📦 Plan New Shipment</button>
            <button class="btn btn-outline" onclick="navigate('saved')">📑 Saved Bookings</button>
          ` : `
            <button class="btn btn-primary" onclick="navigate('riskmap')">🗺️ Full Risk Map</button>
            <button class="btn btn-outline" onclick="navigate('rerouting')">🔄 Rerouting Center</button>
          `}
        </div>
      </div>

      <!-- Section 3 Notice -->
      <div class="box box-caution">
        <strong>CAUTION</strong>
        All figures in this prototype are demonstration values. Do not use them as freight quotes or as real-time navigation instructions.
      </div>

      <!-- Table 3: 6 Key Figures -->
      <div class="kpi-grid">
        ${kpis.map(k => `
          <div class="kpi-card ${k.status}">
            <div class="kpi-head">
              <span class="kpi-label">${k.label}</span>
              <span class="kpi-icon">${k.icon}</span>
            </div>
            <div class="kpi-val">${k.value}</div>
            <div class="kpi-trend">${k.trend}</div>
          </div>
        `).join('')}
      </div>

      <!-- Live Tracked Cargos in Transit Strip -->
      <div class="dashboard-cargos-section">
        <div class="section-head">
          <div class="section-title-wrap">
            <h2 class="section-title">🛰️ Active Cargoes & Ships in Transit (Live GPS)</h2>
            <span class="live-pulse-badge"><span class="pulse-dot"></span> Live Satellite AIS</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="navigate('tracker')">
            Open Interactive GPS Tracker ➔
          </button>
        </div>
        <div class="dashboard-cargo-grid">
          ${trackedCargos.slice(0, 4).map(c => `
            <div class="dash-cargo-card ${c.statusClass}" onclick="openSpecificTrackedCargo('${c.id}')">
              <div class="dash-cargo-top">
                <span class="dash-cargo-id mono">${c.id}</span>
                <span class="tag tag-${c.statusClass}">${c.statusClass === 'safe' ? 'ON SCHEDULE' : 'REROUTING'}</span>
              </div>
              <div class="dash-cargo-title">${c.title}</div>
              <div class="dash-cargo-ship">
                <span>🚢 ${c.ship.name}</span>
                <span class="mono text-dim">${c.ship.flag}</span>
              </div>
              <div class="dash-cargo-lane">
                <span>${c.originPort.name.split(' ')[0]}</span>
                <span class="lane-arrow">➔</span>
                <span>${c.destinationPort.name.split(' ')[0]}</span>
              </div>
              <div class="dash-cargo-telemetry">
                <div class="telemetry-item">
                  <span class="t-lbl">Live GPS</span>
                  <span class="t-val mono">${c.ship.lat.toFixed(2)}°N, ${c.ship.lng.toFixed(2)}°E</span>
                </div>
                <div class="telemetry-item">
                  <span class="t-lbl">Speed / COG</span>
                  <span class="t-val mono">${c.ship.speedKnots} kts • ${c.ship.heading}°</span>
                </div>
                <div class="telemetry-item">
                  <span class="t-lbl">ETA</span>
                  <span class="t-val mono text-safe">${c.etaCountdown}</span>
                </div>
              </div>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" style="width: ${c.progressPercent}%"></div>
              </div>
              <div class="dash-cargo-bottom">
                <span class="text-muted" style="font-size:11px;">${c.progressPercent}% completed (${c.remainingDistanceNm} nm left)</span>
                <span class="text-accent" style="font-size:12px; font-weight:600;">Track Live GPS ➔</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Dashboard Layout: Interactive Map + Active Risk Alerts Panel -->
      <div class="dashboard-layout">
        <div class="map-card">
          <div class="map-toolbar">
            <div class="map-title">
              <span>🌐 Global Marine Corridors & Active Fleet</span>
              <span class="tag tag-demo">Demo Layer</span>
            </div>
            <!-- Section 4.1 Layer Toggles -->
            <div class="layer-chips">
              <button class="layer-chip active" id="layer-routes" onclick="toggleMapLayer('routes')">Shipping Routes</button>
              <button class="layer-chip active" id="layer-vessels" onclick="toggleMapLayer('vessels')">Live Vessels</button>
              <button class="layer-chip active" id="layer-hazards" onclick="toggleMapLayer('hazards')">Weather Hazards</button>
              <button class="layer-chip active" id="layer-ports" onclick="toggleMapLayer('ports')">Ports</button>
              <button class="layer-chip" id="layer-risks" onclick="toggleMapLayer('risks')">Risk Zones</button>
            </div>
          </div>
          <div id="dashboard-map" class="map-container"></div>
        </div>

        <!-- Risk Alerts Panel -->
        <div class="panel-card">
          <div class="panel-header">
            <div class="panel-title">
              <span>⚠️ Active Risk Alerts</span>
              <span class="tag tag-crit">05 Total</span>
            </div>
            ${!isShipper ? `<button class="btn btn-outline btn-sm" onclick="navigate('alerts')">View All</button>` : ''}
          </div>
          <div class="alert-items">
            ${alerts.map(a => `
              <div class="alert-item ${a.severityClass}" onclick="openAlertDrawer('${a.id}')">
                <div class="alert-item-head">
                  <span class="alert-item-title">${a.title}</span>
                  <span class="tag tag-${a.severityClass}">${a.severity}</span>
                </div>
                <div class="alert-item-region">📍 ${a.region}</div>
                <div class="alert-item-region" style="margin-top:4px; font-size:10px;">${a.routesAffected}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border);">
            ${isShipper ? `
              <button class="btn btn-outline btn-full btn-sm" onclick="navigate('plan')">
                📦 Plan Safe Avoidance Route
              </button>
            ` : `
              <button class="btn btn-outline btn-full btn-sm" onclick="navigate('rerouting')">
                🔄 Open Rerouting Center
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 1B. LIVE GPS CARGO & VESSEL TRACKER (SHIPPER & OPERATOR WORKSPACE)
  // =========================================================================
  renderLiveTracker() {
    const cargos = window.WAYPOINT_DATA.trackedCargos || [];
    const currentId = (window.appState && window.appState.tracker && window.appState.tracker.selectedCargoId) || 'CRG-8921-X';
    const cargo = cargos.find(c => c.id === currentId) || cargos[0];

    // Helper for marine formatting
    const latDeg = Math.floor(Math.abs(cargo.ship.lat));
    const latMin = ((Math.abs(cargo.ship.lat) - latDeg) * 60).toFixed(3);
    const latDir = cargo.ship.lat >= 0 ? 'N' : 'S';

    const lngDeg = Math.floor(Math.abs(cargo.ship.lng));
    const lngMin = ((Math.abs(cargo.ship.lng) - lngDeg) * 60).toFixed(3);
    const lngDir = cargo.ship.lng >= 0 ? 'E' : 'W';

    const marineCoordsStr = `${latDeg}° ${latMin}' ${latDir} &nbsp; ${lngDeg}° ${lngMin}' ${lngDir}`;
    const decimalCoordsStr = `${cargo.ship.lat.toFixed(5)}° ${latDir}, ${cargo.ship.lng.toFixed(5)}° ${lngDir}`;

    return `
      <div class="page-header">
        <div>
          <div class="breadcrumb-chip">
            <span class="live-pulse-badge"><span class="pulse-dot"></span> SATELLITE GPS LOCK ACQUIRED</span>
            <span class="text-muted" style="margin-left:8px; font-size:12px;">Constellation: DGPS / Dual Galileo Multi-Band • HDOP 0.8m</span>
          </div>
          <h1 class="page-title">Live GPS Cargo & Ship Tracking</h1>
          <p class="page-desc">Real-time satellite GPS/AIS coordinates, speed over ground, voyage progress, and cold-chain telematics for shippers.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="openShareTrackingModal('${cargo.id}')">
            🔗 Share Live Tracking Link
          </button>
          <button class="btn btn-outline" onclick="openPublicTrackingView('${cargo.id}')">
            📄 Consignment Slip
          </button>
          <button class="btn btn-outline" onclick="recenterTrackerMap()">
            🧭 Center on Ship
          </button>
        </div>
      </div>

      <!-- Quick Shipment Selector & Direct Search Bar -->
      <div class="tracker-selector-bar">
        <div class="tracker-search-wrap">
          <span class="tracker-search-icon">🔍</span>
          <input
            type="text"
            id="tracker-search-input"
            class="tracker-search-field"
            placeholder="Search by Cargo ID (e.g. CRG-8921-X), B/L #, Container ID, or Ship Name..."
            oninput="handleTrackerSearch(this.value)"
          />
        </div>
        <div class="tracker-shipments-scroll" id="tracker-shipments-list">
          ${cargos.map(c => `
            <div
              class="tracker-shipment-pill ${c.id === cargo.id ? 'active' : ''}"
              onclick="selectTrackedCargo('${c.id}')"
              id="pill-${c.id}"
            >
              <div class="pill-head">
                <span class="pill-id mono">${c.id}</span>
                <span class="tag tag-${c.statusClass} pill-tag">${c.statusClass === 'safe' ? 'LIVE' : 'REROUTE'}</span>
              </div>
              <div class="pill-vessel">🚢 ${c.ship.name}</div>
              <div class="pill-route">${c.originPort.name.split(' ')[0]} ➔ ${c.destinationPort.name.split(' ')[0]}</div>
              <div class="pill-meta mono">
                <span>${c.ship.speedKnots} kts</span>
                <span class="text-safe">${c.etaCountdown}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Main Dual-Pane Tracker Cockpit -->
      <div class="tracker-cockpit-grid">

        <!-- LEFT COLUMN: Live Telemetry, GPS, Sensors & Milestones -->
        <div class="tracker-sidebar-col">

          <!-- 1. Digital Marine GPS Readout Card -->
          <div class="cockpit-card gps-hero-card">
            <div class="cockpit-card-head">
              <div class="cockpit-card-title">
                <span>🛰️ Live Marine GPS Coordinates</span>
                <span class="tag tag-safe" id="tracker-lock-badge">LIVE LOCK</span>
              </div>
              <button class="btn-copy-coords" onclick="copyGpsCoords()" title="Copy GPS Coordinates">
                📋 Copy
              </button>
            </div>
            <div class="gps-coords-box">
              <div class="gps-readout-marine mono" id="gps-marine-readout">
                ${marineCoordsStr}
              </div>
              <div class="gps-readout-decimal mono" id="gps-decimal-readout">
                ${decimalCoordsStr}
              </div>
            </div>
            <div class="gps-telemetry-meta">
              <div class="meta-row">
                <span class="meta-lbl">Carrying Vessel:</span>
                <span class="meta-val mono" id="meta-ship-name"><strong>${cargo.ship.name}</strong> (${cargo.ship.flag})</span>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">IMO / MMSI:</span>
                <span class="meta-val mono" id="meta-ship-imo">IMO ${cargo.ship.imo} • MMSI ${cargo.ship.mmsi}</span>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">Transponder Source:</span>
                <span class="meta-val mono" id="meta-gps-source">${cargo.ship.gpsSource}</span>
              </div>
              <div class="meta-row">
                <span class="meta-lbl">Last GPS Ping:</span>
                <span class="meta-val text-safe mono" id="tracker-ping-age">Just now (via SAT-AIS)</span>
              </div>
            </div>
          </div>

          <!-- 2. Navigation Dynamics: Speed & Heading Gauges -->
          <div class="cockpit-card">
            <div class="cockpit-card-head">
              <div class="cockpit-card-title">🧭 Navigation Dynamics (SOG & COG)</div>
              <span class="tag tag-demo">Vessel Telemetry</span>
            </div>
            <div class="dynamics-gauges-row">
              <!-- Speed Gauge -->
              <div class="gauge-card">
                <div class="gauge-label">Speed Over Ground</div>
                <div class="gauge-value mono" id="tracker-sog-val">${cargo.ship.speedKnots} <span class="gauge-unit">kts</span></div>
                <div class="gauge-sub mono text-muted" id="tracker-sog-kmh">${(cargo.ship.speedKnots * 1.852).toFixed(1)} km/h</div>
                <div class="gauge-status text-safe">● Full Ahead Sea Speed</div>
              </div>

              <!-- Heading Compass Card -->
              <div class="gauge-card compass-gauge-card">
                <div class="gauge-label">Course Over Ground (COG)</div>
                <div class="compass-wrap">
                  <div class="compass-dial" id="compass-dial" style="transform: rotate(${cargo.ship.heading}deg);">
                    <div class="compass-needle-north"></div>
                    <div class="compass-needle-south"></div>
                    <div class="compass-tick north">N</div>
                    <div class="compass-tick east">E</div>
                    <div class="compass-tick south">S</div>
                    <div class="compass-tick west">W</div>
                  </div>
                </div>
                <div class="gauge-value mono" id="tracker-cog-val">${cargo.ship.heading}° <span class="gauge-unit">True</span></div>
                <div class="gauge-sub mono text-dim" id="tracker-heading-desc">${getHeadingSector(cargo.ship.heading)}</div>
              </div>
            </div>
            <div class="nav-status-badge mono" id="tracker-nav-status">
              Nav Status: <span>${cargo.ship.navStatus}</span>
            </div>
          </div>

          <!-- 3. Voyage Progress & Distance Card -->
          <div class="cockpit-card">
            <div class="cockpit-card-head">
              <div class="cockpit-card-title">🚢 Voyage Trajectory & ETA</div>
              <span class="tag tag-safe" id="tracker-voyage-status">ON SCHEDULE</span>
            </div>
            <div class="voyage-route-strip">
              <div class="route-endpoint">
                <span class="port-code mono">${cargo.originPort.id}</span>
                <span class="port-name">${cargo.originPort.name.split(' ')[0]}</span>
                <span class="port-time mono">${cargo.originPort.departureTime.split(' ')[0]}</span>
              </div>
              <div class="route-track-line">
                <div class="route-ship-icon" style="left: ${cargo.progressPercent}%;">🚢</div>
              </div>
              <div class="route-endpoint text-right">
                <span class="port-code mono">${cargo.destinationPort.id}</span>
                <span class="port-name">${cargo.destinationPort.name.split(' ')[0]}</span>
                <span class="port-time mono text-safe">ETA ${cargo.destinationPort.eta.split(' ')[0]}</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-bar-wrap" style="height:8px; margin: 12px 0 6px 0;">
              <div class="progress-bar-fill" id="tracker-progress-fill" style="width: ${cargo.progressPercent}%;"></div>
            </div>
            <div class="progress-meta-row">
              <span class="mono text-muted" id="tracker-dist-completed">${cargo.completedDistanceNm.toLocaleString()} nm traversed</span>
              <span class="mono text-accent" id="tracker-progress-pct">${cargo.progressPercent}% completed</span>
              <span class="mono text-safe" id="tracker-dist-remaining">${cargo.remainingDistanceNm.toLocaleString()} nm to go</span>
            </div>

            <div class="eta-countdown-card">
              <div class="eta-col">
                <span class="eta-lbl">Estimated Arrival (ETA)</span>
                <span class="eta-date mono" id="tracker-eta-date">${cargo.etaFormatted}</span>
              </div>
              <div class="eta-countdown-col text-right">
                <span class="eta-lbl">Time to Port</span>
                <span class="eta-timer mono text-safe" id="tracker-eta-timer">${cargo.etaCountdown}</span>
              </div>
            </div>
          </div>

          <!-- 4. Cargo Specifications & Sensor Telemetry -->
          <div class="cockpit-card">
            <div class="cockpit-card-head">
              <div class="cockpit-card-title">📦 Cargo Manifest & IoT Sensors</div>
              <span class="tag tag-demo">Sensor Stream</span>
            </div>
            <div class="cargo-manifest-grid">
              <div class="manifest-item">
                <span class="m-lbl">Bill of Lading (B/L):</span>
                <span class="m-val mono">${cargo.blNumber}</span>
              </div>
              <div class="manifest-item">
                <span class="m-lbl">Container & Seal:</span>
                <span class="m-val mono">${cargo.containerId} • ${cargo.sealNumber}</span>
              </div>
              <div class="manifest-item">
                <span class="m-lbl">Shipper:</span>
                <span class="m-val">${cargo.shipper}</span>
              </div>
              <div class="manifest-item">
                <span class="m-lbl">Consignee:</span>
                <span class="m-val">${cargo.consignee}</span>
              </div>
              <div class="manifest-item">
                <span class="m-lbl">Gross Weight / Type:</span>
                <span class="m-val mono">${cargo.weightTons} MT • ${cargo.containerType}</span>
              </div>
            </div>

            <div class="sensors-row">
              <div class="sensor-pill ${cargo.category.includes('Cold-Chain') ? 'cold' : 'ambient'}">
                <div class="sensor-icon">🌡️</div>
                <div class="sensor-data">
                  <span class="s-name">Cargo Temperature</span>
                  <span class="s-val mono" id="sensor-temp">${cargo.sensorData.tempC}°C</span>
                  <span class="s-sub">${cargo.sensorData.tempStatus}</span>
                </div>
              </div>
              <div class="sensor-pill">
                <div class="sensor-icon">💧</div>
                <div class="sensor-data">
                  <span class="s-name">Relative Humidity</span>
                  <span class="s-val mono" id="sensor-humidity">${cargo.sensorData.humidityPercent}% RH</span>
                  <span class="s-sub">Optimal Dry</span>
                </div>
              </div>
              <div class="sensor-pill">
                <div class="sensor-icon">🛡️</div>
                <div class="sensor-data">
                  <span class="s-name">Shock & Impact</span>
                  <span class="s-val mono" id="sensor-shock">${cargo.sensorData.shockG} G</span>
                  <span class="s-sub">No Cargo Shift</span>
                </div>
              </div>
              <div class="sensor-pill">
                <div class="sensor-icon">🔒</div>
                <div class="sensor-data">
                  <span class="s-name">Container Seal</span>
                  <span class="s-val text-safe mono">TAMPER-VERIFIED</span>
                  <span class="s-sub">${cargo.sensorData.doorStatus}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. Sea & Meteorological Conditions at GPS Position -->
          <div class="cockpit-card">
            <div class="cockpit-card-head">
              <div class="cockpit-card-title">🌊 Live Sea Conditions at Vessel Coordinates</div>
              <span class="tag tag-demo">ECMWF / NOAA</span>
            </div>
            <div class="metoc-grid">
              <div class="metoc-item">
                <span class="met-icon">💨</span>
                <div>
                  <div class="met-val mono" id="met-wind">${cargo.seaConditions.windKnots} kts ${cargo.seaConditions.windDirection}</div>
                  <div class="met-lbl">True Wind</div>
                </div>
              </div>
              <div class="metoc-item">
                <span class="met-icon">🌊</span>
                <div>
                  <div class="met-val mono" id="met-waves">${cargo.seaConditions.waveHeightM} m</div>
                  <div class="met-lbl">Significant Wave Height</div>
                </div>
              </div>
              <div class="metoc-item">
                <span class="met-icon">🌡️</span>
                <div>
                  <div class="met-val mono" id="met-seatemp">${cargo.seaConditions.seaTempC}°C</div>
                  <div class="met-lbl">Sea Surface Temp</div>
                </div>
              </div>
              <div class="metoc-item">
                <span class="met-icon">⏲️</span>
                <div>
                  <div class="met-val mono" id="met-baro">${cargo.seaConditions.barometerHpa} hPa</div>
                  <div class="met-lbl">Atmospheric Pressure</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 6. Voyage Checkpoints & Milestones -->
          <div class="cockpit-card">
            <div class="cockpit-card-head">
              <div class="cockpit-card-title">📍 Verified Voyage Milestones</div>
              <span class="tag tag-safe">AIS Automated</span>
            </div>
            <div class="milestones-timeline">
              ${cargo.milestones.map((m, i) => `
                <div class="milestone-step ${m.done ? 'completed' : ''} ${m.current ? 'current' : ''}">
                  <div class="milestone-marker">
                    ${m.done ? (m.current ? '📍' : '✓') : (i + 1)}
                  </div>
                  <div class="milestone-content">
                    <div class="milestone-name">${m.name}</div>
                    <div class="milestone-time mono">${m.time}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: Interactive Leaflet Map & Live Satellite Event Log -->
        <div class="tracker-main-col">

          <!-- Interactive Map Container -->
          <div class="map-card tracker-map-card">
            <div class="map-toolbar tracker-map-toolbar">
              <div class="map-title">
                <span class="mono text-accent">● LIVE AIS TRACK:</span>
                <span style="font-weight:700;">${cargo.ship.name}</span>
                <span class="tag tag-demo">Satellite Fix</span>
              </div>
              <div class="layer-chips">
                <button class="layer-chip active" id="btn-auto-follow" onclick="toggleTrackerAutoFollow()">
                  🎯 Auto-Follow Vessel
                </button>
                <button class="layer-chip active" id="btn-breadcrumbs" onclick="toggleTrackerBreadcrumbs()">
                  📍 Breadcrumbs (${cargo.breadcrumbs.length})
                </button>
                <button class="layer-chip active" id="btn-route-path" onclick="toggleTrackerRoutePath()">
                  🧭 Planned Corridor
                </button>
                <button class="layer-chip active" id="btn-hazards-overlay" onclick="toggleTrackerHazards()">
                  ⚠️ Sea Hazards
                </button>
              </div>
            </div>

            <!-- Leaflet Map Element -->
            <div id="tracker-map" class="map-container" style="height: 540px;"></div>

            <!-- Live GPS Simulation Controls Bar -->
            <div class="tracker-sim-toolbar">
              <div class="sim-left-controls">
                <button
                  class="btn btn-sm btn-primary"
                  id="btn-toggle-sim"
                  onclick="toggleGpsSimulation()"
                  title="Pause or Resume live simulated GPS advancement"
                >
                  ⏸️ Pause Live Feed
                </button>
                <div class="sim-speed-group">
                  <span class="speed-lbl">Sim Speed:</span>
                  <button class="sim-speed-btn active" id="sim-speed-1" onclick="setSimulationSpeed(1)">1x</button>
                  <button class="sim-speed-btn" id="sim-speed-5" onclick="setSimulationSpeed(5)">5x</button>
                  <button class="sim-speed-btn" id="sim-speed-15" onclick="setSimulationSpeed(15)">15x</button>
                </div>
                <button class="btn btn-sm btn-outline" onclick="triggerManualGpsPing()">
                  📡 Manual GPS Ping
                </button>
              </div>
              <div class="sim-status-right mono">
                <span class="pulse-dot"></span>
                <span id="sim-status-text">Streaming Satellite AIS Telemetry every 2.5s</span>
              </div>
            </div>
          </div>

          <!-- Live Satellite AIS Telemetry Stream Console -->
          <div class="panel-card telemetry-console-card">
            <div class="panel-header">
              <div class="panel-title">
                <span>📡 Live Satellite Telemetry & AIS Packet Stream</span>
                <span class="tag tag-safe mono">115200 BAUD</span>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-xs" onclick="clearTelemetryLog()">Clear Stream</button>
                <button class="btn btn-outline btn-xs" onclick="copyTelemetryLog()">Copy Log</button>
              </div>
            </div>
            <div class="terminal-window mono" id="telemetry-terminal-stream">
              <!-- Dynamically populated by JS stream -->
              <div class="terminal-line system">[SYSTEM] Satellite Telemetry Stream connected to Inmarsat-C DGPS / Class-A AIS.</div>
              <div class="terminal-line fix">[03:00:01] GPS FIX: ${cargo.ship.lat.toFixed(5)}°N, ${cargo.ship.lng.toFixed(5)}°E | SOG: ${cargo.ship.speedKnots} kts | COG: ${cargo.ship.heading}° | HDOP: 0.8</div>
              <div class="terminal-line sensor">[03:00:03] SENSOR PING: Container ${cargo.containerId} Temp: ${cargo.sensorData.tempC}°C | Seal: INTACT</div>
              <div class="terminal-line info">[03:00:05] VOYAGE UPDATE: ${cargo.remainingDistanceNm} nm remaining to ${cargo.destinationPort.name.split(' ')[0]} | ETA: ${cargo.etaFormatted}</div>
            </div>
          </div>

          <!-- Quick Consignment Details Summary -->
          <div class="cockpit-card" style="margin-top:16px;">
            <div class="cockpit-card-head">
              <div class="cockpit-card-title">📜 Shipper Consignment & Customs Reference</div>
              <button class="btn btn-sm btn-safe" onclick="openShareTrackingModal('${cargo.id}')">
                Provide Tracking to Consignee ➔
              </button>
            </div>
            <div class="consignment-summary-grid">
              <div>
                <span class="text-muted" style="font-size:11px;">Shipper Reference:</span>
                <div class="mono" style="font-size:13px; font-weight:600;">${cargo.bookingRef}</div>
              </div>
              <div>
                <span class="text-muted" style="font-size:11px;">Ocean Carrier:</span>
                <div style="font-size:13px; font-weight:600;">WAYPOINT Maritime Freight Network</div>
              </div>
              <div>
                <span class="text-muted" style="font-size:11px;">Bill of Lading:</span>
                <div class="mono text-accent" style="font-size:13px; font-weight:600;">${cargo.blNumber}</div>
              </div>
              <div>
                <span class="text-muted" style="font-size:11px;">Consignee Destination Port:</span>
                <div style="font-size:13px; font-weight:600;">${cargo.destinationPort.name}</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    `;
  },

  // =========================================================================
  // 2. PLAN A SHIPMENT (SECTION 5)
  // =========================================================================
  renderPlanShipment() {
    const ports = window.WAYPOINT_DATA.ports;
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Plan a Shipment</h1>
          <p class="page-desc">Enter origin, destination, cargo specifications, and dispatch priorities to generate optimal routes.</p>
        </div>
      </div>

      <div class="box box-note">
        <strong>NOTE</strong>
        Select the swap control to exchange origin and destination. Required fields are validated prior to route synthesis.
      </div>

      <div class="plan-grid">
        <div class="form-card">
          <h2 style="font-size:16px; font-weight:700; margin-bottom:16px; color:#fff;">Shipment Parameters</h2>
          
          <!-- Origin & Destination with Swap -->
          <div class="port-row">
            <div class="port-input-wrap">
              <label class="input-label" for="plan-origin">Origin Port *</label>
              <select id="plan-origin" class="select-input" onchange="updatePlanPreview()">
                ${ports.map(p => `<option value="${p.id}" ${p.id==='INNSA'?'selected':''}>${p.name} (${p.country})</option>`).join('')}
              </select>
            </div>
            <button type="button" class="swap-btn" title="Swap Origin and Destination" onclick="swapPorts()">⇄</button>
            <div class="port-input-wrap">
              <label class="input-label" for="plan-dest">Destination Port *</label>
              <select id="plan-dest" class="select-input" onchange="updatePlanPreview()">
                ${ports.map(p => `<option value="${p.id}" ${p.id==='SGSIN'?'selected':''}>${p.name} (${p.country})</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Cargo Type (Section 5.1) -->
          <div class="field-group">
            <label class="input-label">Cargo Type *</label>
            <div class="chip-grid" id="cargo-chip-group">
              <div class="cargo-chip active" onclick="selectCargoChip(this, 'General Cargo')">📦 General</div>
              <div class="cargo-chip" onclick="selectCargoChip(this, 'Containers')">🚢 Container</div>
              <div class="cargo-chip" onclick="selectCargoChip(this, 'Bulk')">⛰️ Bulk</div>
              <div class="cargo-chip" onclick="selectCargoChip(this, 'Liquid')">🛢️ Liquid</div>
              <div class="cargo-chip" onclick="selectCargoChip(this, 'Refrigerated')">❄️ Reefer</div>
            </div>
          </div>

          <!-- Cargo Weight & Maximum Budget -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
            <div>
              <label class="input-label" for="plan-weight">Cargo Weight (MT) *</label>
              <input type="number" id="plan-weight" class="text-input" value="1200" placeholder="e.g. 1200"/>
            </div>
            <div>
              <label class="input-label" for="plan-budget">Maximum Budget (USD) *</label>
              <input type="number" id="plan-budget" class="text-input" value="20000" placeholder="e.g. 20000"/>
            </div>
          </div>

          <!-- Priority Selector (Section 5.1) -->
          <div class="field-group">
            <label class="input-label">Routing Priority *</label>
            <div class="chip-grid" id="priority-chip-group">
              <div class="priority-chip" onclick="selectPriorityChip(this, 'Lowest Cost')">💰 Lowest Cost</div>
              <div class="priority-chip" onclick="selectPriorityChip(this, 'Fastest Delivery')">⚡ Fastest</div>
              <div class="priority-chip" onclick="selectPriorityChip(this, 'Lowest Risk')">🛡️ Lowest Risk</div>
              <div class="priority-chip active" onclick="selectPriorityChip(this, 'Balanced')">⚖️ Balanced</div>
            </div>
          </div>

          <button class="btn btn-primary btn-full" style="padding:12px;" onclick="executeRoutePlanning()">
            🔍 Find Optimal Routes →
          </button>
        </div>

        <!-- Live Route Preview Map -->
        <div class="map-card">
          <div class="map-toolbar">
            <div class="map-title">📍 Corridor Preview</div>
            <div class="data-status">
              <span class="status-dot live"></span>
              <span>Direct Geodesic: ~3,250 nm</span>
            </div>
          </div>
          <div id="plan-preview-map" class="map-container" style="height: 480px;"></div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 3. COMPARE ROUTES (SECTION 6)
  // =========================================================================
  renderCompareRoutes() {
    const routes = window.WAYPOINT_DATA.routeOptions;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Route Intelligence & Comparison</h1>
          <p class="page-desc">Evaluating 4 synthesized options for Mumbai (Nhava Sheva) → Singapore (Jurong).</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="navigate('plan')">← Adjust Shipment</button>
        </div>
      </div>

      <div class="box box-note">
        <strong>NOTE</strong>
        Route A carries the Recommended badge based on the multi-objective balance of fuel, safety, and transit schedule. All routes remain selectable.
      </div>

      <!-- Table 4: 4 Route Option Cards -->
      <div class="routes-grid">
        ${routes.map(r => `
          <div class="route-card ${r.isRecommended ? 'recommended' : ''}" id="route-card-${r.id}">
            ${r.isRecommended ? '<div class="route-badge"><span class="tag tag-live">★ Recommended</span></div>' : ''}
            <div class="route-name">${r.name}</div>
            
            <div class="route-metrics">
              <div class="route-metric">
                <div class="metric-lbl">EST. COST</div>
                <div class="metric-val">$${r.cost.toLocaleString()}</div>
                <div style="font-size:10px; color:${r.budgetStatus==='Within'?'var(--safe)':'var(--crit)'};">
                  ${r.budgetStatus} Budget
                </div>
              </div>
              <div class="route-metric">
                <div class="metric-lbl">TRANSIT TIME</div>
                <div class="metric-val">${r.transitDays} d</div>
                <div style="font-size:10px; color:var(--text-dim);">${r.distanceNm} nm</div>
              </div>
            </div>

            <!-- Risk meter -->
            <div class="risk-meter">
              <div class="risk-meter-head">
                <span>Risk Index</span>
                <span class="mono" style="font-weight:700; color:${r.riskScore<25?'var(--safe)':r.riskScore<35?'var(--warn)':'var(--crit)'}">${r.riskScore}/100</span>
              </div>
              <div class="meter-bar">
                <div class="meter-fill" style="width:${r.riskScore}%; background:${r.riskScore<25?'var(--safe)':r.riskScore<35?'var(--warn)':'var(--crit)'}"></div>
              </div>
            </div>

            <div style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
              ⚡ Hazards En Route: <strong style="color:${r.hazards===0?'var(--safe)':'var(--warn)'}">${r.hazards} detected</strong>
            </div>

            <div style="display:flex; gap:8px; margin-top:auto;">
              <button class="btn btn-outline btn-sm btn-full" onclick="showRouteBreakdown('${r.id}')">
                View Breakdown
              </button>
              <button class="btn btn-primary btn-sm btn-full" onclick="confirmRouteSelection('${r.id}')">
                Select Route
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Figure 2: Risk score by route SVG visualization -->
      <div class="chart-box">
        <div class="chart-header">
          <div class="chart-title">Figure 2. Comparative Risk Score by Route (Lower is Safer)</div>
          <span class="tag tag-demo">Demo Scale: 6px / point</span>
        </div>
        <div style="overflow-x:auto;">
          <svg viewBox="0 0 640 250" role="img" aria-labelledby="f2t" style="max-width:100%; height:auto; background:#0B1220; border-radius:8px;">
            <title id="f2t">Figure 2. Risk score by route</title>
            <rect width="640" height="250" fill="#0B1220"/>
            <g font-family="Inter, sans-serif" font-size="12" fill="#F1F5F9">
              <text x="16" y="34" font-weight="700">Risk score (lower is safer)</text>
              <text x="16" y="76">Route A</text>
              <rect x="90" y="62" width="144" height="18" rx="4" fill="#2DD4BF"/>
              <text x="242" y="76" font-family="JetBrains Mono" font-weight="600">24</text>

              <text x="16" y="116">Route B</text>
              <rect x="90" y="102" width="228" height="18" rx="4" fill="#FBBF24"/>
              <text x="326" y="116" font-family="JetBrains Mono" font-weight="600">38</text>

              <text x="16" y="156">Route C</text>
              <rect x="90" y="142" width="186" height="18" rx="4" fill="#FBBF24"/>
              <text x="284" y="156" font-family="JetBrains Mono" font-weight="600">31</text>

              <text x="16" y="196">Route D</text>
              <rect x="90" y="182" width="72" height="18" rx="4" fill="#2DD4BF"/>
              <text x="170" y="196" font-family="JetBrains Mono" font-weight="600">12</text>
            </g>
            <line x1="90" y1="50" x2="90" y2="214" stroke="#29394D"/>
            <text x="16" y="236" fill="#94A3B8" font-size="11" font-family="Inter, sans-serif">
              Bar length is 6 px per risk point. Route D provides the safest oceanic passage.
            </text>
          </svg>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 4. LIVE RISK MAP (SECTION 7)
  // =========================================================================
  renderLiveRiskMap() {
    const alerts = window.WAYPOINT_DATA.alerts;
    const vessels = window.WAYPOINT_DATA.vessels;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Live Risk Map</h1>
          <p class="page-desc">High-fidelity oceanic layer monitoring weather hazards, AIS vessel telemetry, and regional choke-points.</p>
        </div>
        <div class="page-actions">
          <div class="layer-chips">
            <button class="layer-chip active" id="lrm-routes" onclick="toggleRiskMapLayer('routes')">Routes</button>
            <button class="layer-chip active" id="lrm-vessels" onclick="toggleRiskMapLayer('vessels')">Vessels (${vessels.length})</button>
            <button class="layer-chip active" id="lrm-hazards" onclick="toggleRiskMapLayer('hazards')">Hazards (${alerts.length})</button>
            <button class="layer-chip active" id="lrm-ports" onclick="toggleRiskMapLayer('ports')">Major Ports</button>
          </div>
        </div>
      </div>

      <div class="box box-note">
        <strong>NOTE</strong>
        The map distinguishes forecast weather hazards from observed sea conditions. Select any marker to view comprehensive radar analysis and recommended nautical mitigations.
      </div>

      <div style="display:grid; grid-template-columns: 280px 1fr 300px; gap: 16px;">
        <!-- Left: Route Explorer Panel -->
        <div class="panel-card" style="height: 600px; overflow-y:auto;">
          <div class="panel-title" style="margin-bottom:12px;">🧭 Route Explorer</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="alert-item" style="border-left-color:var(--safe);" onclick="focusMapRoute('A')">
              <strong>Route A (Recommended)</strong>
              <div style="font-size:11px; color:var(--text-muted);">Risk 24 • 12.5 days • $18,400</div>
            </div>
            <div class="alert-item" style="border-left-color:var(--warn);" onclick="focusMapRoute('B')">
              <strong>Route B (Lowest Cost)</strong>
              <div style="font-size:11px; color:var(--text-muted);">Risk 38 • 15.2 days • $15,900</div>
            </div>
            <div class="alert-item" style="border-left-color:var(--warn);" onclick="focusMapRoute('C')">
              <strong>Route C (Fastest)</strong>
              <div style="font-size:11px; color:var(--text-muted);">Risk 31 • 10.8 days • $22,100</div>
            </div>
            <div class="alert-item" style="border-left-color:var(--safe);" onclick="focusMapRoute('D')">
              <strong>Route D (Lowest Risk)</strong>
              <div style="font-size:11px; color:var(--text-muted);">Risk 12 • 13.1 days • $20,300</div>
            </div>
          </div>

          <div style="margin-top:20px; font-size:12px; font-weight:700; color:#fff; margin-bottom:8px;">
            Active Fleet Tracked
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${vessels.map(v => `
              <div style="background:var(--surface-alt); padding:8px 10px; border-radius:6px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:600; color:#fff;">${v.name}</div>
                  <div style="color:var(--text-dim);">${v.type} • ${v.speed}</div>
                </div>
                <span class="tag tag-${v.status==='On Track'?'live':v.status==='Rerouting'?'crit':'warn'}">${v.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Center: Interactive Map -->
        <div class="map-card" style="height: 600px;">
          <div id="live-risk-map" class="map-container" style="height: 100%;"></div>
        </div>

        <!-- Right: Risk Intelligence Panel -->
        <div class="panel-card" style="height: 600px; overflow-y:auto;">
          <div class="panel-title" style="margin-bottom:12px;">🛡️ Risk Intelligence</div>
          
          <div style="background:var(--surface-alt); padding:12px; border-radius:8px; margin-bottom:12px;">
            <div style="font-size:11px; color:var(--text-dim);">OVERALL CORRIDOR RISK</div>
            <div style="font-size:28px; font-weight:800; color:var(--warn); font-family:var(--font-mono);">
              34 <span style="font-size:14px; color:var(--text-dim);">/ 100</span>
            </div>
            <div style="font-size:11px; color:var(--warn);">Elevated due to Bay of Bengal cyclonic activity</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span class="text-muted">Active Hazard Count:</span>
              <strong class="text-crit">5 Active</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span class="text-muted">Most Severe Hazard:</span>
              <strong class="text-crit">Tropical Storm (55kts)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span class="text-muted">Affected Segments:</span>
              <span>Malacca Western Approach</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span class="text-muted">Estimated Delay:</span>
              <strong class="text-warn">+18 to 36 hours</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span class="text-muted">Last Feed Sync:</span>
              <span class="mono">Just now (Live demo)</span>
            </div>
          </div>

          <button class="btn btn-primary btn-full" style="margin-top:auto;" onclick="navigate('rerouting')">
            🔄 Assess Reroute Options
          </button>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 5. REROUTING CENTER (SECTION 8)
  // =========================================================================
  renderReroutingCenter() {
    const sc = window.WAYPOINT_DATA.reroutingScenario;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Rerouting Center</h1>
          <p class="page-desc">Dynamic avoidance recommendations and route reconfiguration for active sea voyages.</p>
        </div>
        <div class="page-actions">
          <span class="tag tag-crit">Scenario Active</span>
        </div>
      </div>

      <div class="box box-warning">
        <strong>WARNING</strong>
        This scenario is a simulation. Do not use it as an operational dispatch command to a physical maritime vessel.
      </div>

      <!-- Disruption Banner -->
      <div class="reroute-banner">
        <div class="banner-content">
          <h3>🚨 ${sc.title}</h3>
          <p>Affecting <strong>${sc.affectedVessel}</strong> on voyage from <strong>${sc.departure}</strong> to <strong>${sc.destination}</strong> carrying ${sc.cargo}.</p>
        </div>
        <span class="tag tag-crit">${sc.severity} Severity</span>
      </div>

      <!-- Figure 3 SVG Graphic from Manual -->
      <div class="chart-box">
        <div class="chart-header">
          <div class="chart-title">Figure 3. Original Route (Crossing Hazard) vs Alternative Route (Southern Bypass)</div>
          <span class="tag tag-live">Interactive SVG Vector</span>
        </div>
        <div style="overflow-x:auto;">
          <svg viewBox="0 0 640 260" role="img" aria-labelledby="f3t" style="max-width:100%; height:auto; background:#0B1220; border-radius:8px;">
            <defs>
              <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#2DD4BF"/></marker>
              <marker id="ao" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#F87171"/></marker>
            </defs>
            <title id="f3t">Figure 3. Original route and alternative route</title>
            <rect width="640" height="260" fill="#0B1220"/>
            <ellipse cx="320" cy="112" rx="70" ry="42" fill="#F87171" fill-opacity=".22" stroke="#F87171" stroke-dasharray="5 4"/>
            <text x="320" y="116" text-anchor="middle" fill="#F87171" font-size="11" font-family="Inter, sans-serif" font-weight="700">Hazard zone (Cyclone ASANI)</text>
            <path d="M70 150 C 170 130, 240 112, 320 112 S 480 120, 570 100" fill="none" stroke="#F87171" stroke-width="3" marker-end="url(#ao)"/>
            <path d="M70 150 C 150 215, 270 225, 360 200 S 520 150, 570 100" fill="none" stroke="#2DD4BF" stroke-width="3" marker-end="url(#ar)"/>
            <circle cx="70" cy="150" r="7" fill="#38BDF8"/><circle cx="570" cy="100" r="7" fill="#38BDF8"/>
            <g font-family="Inter, sans-serif" font-size="12" fill="#F1F5F9">
              <text x="40" y="176">Mumbai</text>
              <text x="540" y="86">Singapore</text>
              <text x="200" y="232" fill="#2DD4BF" font-weight="700">Alternative route (Safe)</text>
              <text x="150" y="104" fill="#F87171" font-weight="700">Original route (High Hazard)</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Table 5: Route Impact -->
      <div class="impact-table-wrap">
        <table class="ste-table">
          <thead>
            <tr>
              <th>Evaluation Parameter</th>
              <th class="text-right">Original Route</th>
              <th class="text-right">Alternative Bypass</th>
              <th class="text-right">Variance / Delta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cost (USD)</td>
              <td class="text-right mono">$18,400</td>
              <td class="text-right mono" style="color:var(--safe); font-weight:700;">$19,250</td>
              <td class="text-right mono" style="color:var(--warn);">${sc.impactDelta.costChange}</td>
            </tr>
            <tr>
              <td>Estimated Transit (ETA)</td>
              <td class="text-right mono">12.5 days</td>
              <td class="text-right mono" style="color:var(--safe); font-weight:700;">13.1 days</td>
              <td class="text-right mono" style="color:var(--warn);">${sc.impactDelta.etaChange}</td>
            </tr>
            <tr>
              <td>Risk Index Score (/100)</td>
              <td class="text-right mono" style="color:var(--crit); font-weight:700;">68 (Severe)</td>
              <td class="text-right mono" style="color:var(--safe); font-weight:700;">19 (Low Risk)</td>
              <td class="text-right mono" style="color:var(--safe); font-weight:700;">${sc.impactDelta.riskChange}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Decision Bar (Section 8.1) -->
      <div class="decision-bar">
        <button class="btn btn-safe" onclick="acceptAlternativeRoute()">
          ✅ Accept Alternative Route
        </button>
        <button class="btn btn-outline" onclick="keepOriginalRoute()">
          ⚠️ Keep Original Route
        </button>
        <button class="btn btn-outline" onclick="compareOtherAlternatives()">
          📊 Compare Other Alternatives
        </button>
        <button class="btn btn-outline" onclick="viewRiskFactors()">
          🔍 View Risk Factors
        </button>
      </div>

      <!-- Rerouting Audit History -->
      <div style="margin-top:36px;">
        <h3 style="font-size:15px; font-weight:700; color:#fff; margin-bottom:12px;">Rerouting Decision History</h3>
        <div class="impact-table-wrap">
          <table class="ste-table">
            <thead>
              <tr>
                <th>Decision ID</th>
                <th>Timestamp</th>
                <th>Vessel</th>
                <th>Adjustment</th>
                <th>Operational Justification</th>
                <th>Outcome Metric</th>
              </tr>
            </thead>
            <tbody>
              ${sc.decisionHistory.map(h => `
                <tr>
                  <td class="mono">${h.id}</td>
                  <td style="color:var(--text-muted);">${h.timestamp}</td>
                  <td><strong>${h.vessel}</strong></td>
                  <td>${h.route}</td>
                  <td>${h.reason}</td>
                  <td style="color:var(--safe); font-weight:600;">${h.savings}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 6. ALERTS CENTER (SECTION 9)
  // =========================================================================
  renderAlertsCenter() {
    const alerts = window.WAYPOINT_DATA.alerts;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Alerts Center</h1>
          <p class="page-desc">Active meteorological advisories, navigational hazards, and port queue notifications.</p>
        </div>
      </div>

      <!-- 4 Summary Cards -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:14px; margin-bottom:20px;">
        <div class="kpi-card">
          <div class="kpi-label">Total Active Alerts</div>
          <div class="kpi-val">05</div>
          <div class="kpi-trend">Across global sea routes</div>
        </div>
        <div class="kpi-card crit">
          <div class="kpi-label">Critical Alerts</div>
          <div class="kpi-val text-crit">02</div>
          <div class="kpi-trend">Requires immediate re-route</div>
        </div>
        <div class="kpi-card warn">
          <div class="kpi-label">High-Severity Alerts</div>
          <div class="kpi-val text-warn">01</div>
          <div class="kpi-trend">Monitored corridor</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Routes Affected</div>
          <div class="kpi-val">04</div>
          <div class="kpi-trend">Corridors flagged</div>
        </div>
      </div>

      <!-- Filters (Section 9.1) -->
      <div class="alert-filters">
        <select class="filter-select" id="alert-filter-severity" onchange="filterAlerts()">
          <option value="all">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select class="filter-select" id="alert-filter-region" onchange="filterAlerts()">
          <option value="all">All Oceanic Regions</option>
          <option value="Arabian Sea">Arabian Sea</option>
          <option value="Indian Ocean">Western Indian Ocean</option>
          <option value="Bay of Bengal">Bay of Bengal</option>
          <option value="Singapore">Singapore / Malacca</option>
        </select>
        <select class="filter-select" id="alert-filter-status" onchange="filterAlerts()">
          <option value="all">Status: All</option>
          <option value="Active">Active</option>
          <option value="Reviewed">Reviewed</option>
        </select>
      </div>

      <!-- Table 6: Active Alerts Table -->
      <div class="impact-table-wrap">
        <table class="ste-table" id="alerts-table">
          <thead>
            <tr>
              <th>Alert Title</th>
              <th>Region</th>
              <th>Severity</th>
              <th>Hazard Category</th>
              <th>Timestamp</th>
              <th>Affected Corridors</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${alerts.map(a => `
              <tr class="alert-row" data-severity="${a.severity}" data-region="${a.region}" data-status="${a.status}">
                <td><strong>${a.title}</strong></td>
                <td>${a.region}</td>
                <td><span class="tag tag-${a.severityClass}">${a.severity}</span></td>
                <td>${a.type}</td>
                <td class="mono" style="font-size:11px;">${a.date}</td>
                <td style="font-size:12px; color:var(--text-muted);">${a.routesAffected}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="openAlertDrawer('${a.id}')">
                    Review Details →
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // =========================================================================
  // 7. ROUTE ASSISTANT (SECTION 10)
  // =========================================================================
  renderRouteAssistant() {
    const presets = window.WAYPOINT_DATA.assistantPresets;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Route Assistant</h1>
          <p class="page-desc">WAYPOINT Intelligence maritime copilot powered by multi-objective dispatch graphs.</p>
        </div>
      </div>

      <div class="box box-caution">
        <strong>CAUTION</strong>
        The prototype has no live AI backend. It shows preset demonstration answers. A label on each answer indicates this simulation state.
      </div>

      <div class="chat-container">
        <!-- Message stream -->
        <div class="chat-messages" id="chat-messages">
          <div class="msg-bubble msg-assistant">
            <div style="font-size:11px; color:var(--accent); margin-bottom:4px; font-weight:700;">
              ⚓ WAYPOINT INTELLIGENCE COPILOT <span class="tag tag-demo">Demonstration Mode</span>
            </div>
            Hello James. I am your maritime route planning assistant. I can analyze risk metrics, evaluate weather hazards, and recommend optimal sea corridors between global ports.
            <br/><br/>
            Select one of the prompt chips below or inquire about routes, transit times, and storm evasions.
          </div>
        </div>

        <!-- Prompt chips (Section 10.1) -->
        <div class="prompt-chips">
          ${presets.map((p, idx) => `
            <button class="prompt-chip" onclick="askPresetQuestion(${idx})">
              💬 ${p.q}
            </button>
          `).join('')}
        </div>

        <!-- Input bar -->
        <div class="chat-input-bar">
          <input type="text" id="assistant-input" class="text-input" placeholder="Ask about routes, weather hazards, or bunker optimization..." onkeydown="if(event.key==='Enter') sendAssistantMessage()"/>
          <button class="btn btn-primary" onclick="sendAssistantMessage()">Send →</button>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 8. SAVED ROUTES (SECTION 11)
  // =========================================================================
  renderSavedRoutes() {
    const routes = window.WAYPOINT_DATA.savedRoutes;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Saved Routes</h1>
          <p class="page-desc">Library of company sea corridors, validated lane profiles, and recurring voyage templates.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="exportRouteReport()">📑 Export Route Report</button>
          <button class="btn btn-primary" onclick="navigate('plan')">+ New Route</button>
        </div>
      </div>

      <div class="box box-note">
        <strong>NOTE</strong>
        PDF export is currently in demonstration mode. Selecting export will notify you of provider configuration.
      </div>

      <div class="impact-table-wrap">
        <table class="ste-table">
          <thead>
            <tr>
              <th>Route Identifier</th>
              <th>Origin Port</th>
              <th>Destination Port</th>
              <th>Cargo Profile</th>
              <th>Est. Cost</th>
              <th>Transit</th>
              <th>Risk Score</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${routes.map(r => `
              <tr id="saved-row-${r.id}">
                <td><strong>${r.name}</strong></td>
                <td>${r.origin}</td>
                <td>${r.dest}</td>
                <td>${r.cargo}</td>
                <td class="mono">${r.cost}</td>
                <td class="mono">${r.transit}</td>
                <td class="mono"><span class="tag tag-${r.risk<20?'live':r.risk<30?'demo':'warn'}">${r.risk}/100</span></td>
                <td><span class="tag tag-live">${r.badge}</span></td>
                <td class="text-right">
                  <button class="btn btn-outline btn-sm" onclick="openSavedRoute('${r.id}')">Open</button>
                  <button class="btn btn-outline btn-sm" onclick="renameSavedRoute('${r.id}')">Rename</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteSavedRoute('${r.id}')">Remove</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // =========================================================================
  // 9. ANALYTICS (SECTION 11)
  // =========================================================================
  renderAnalytics() {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Maritime Analytics & Risk Reporting</h1>
          <p class="page-desc">Performance aggregations, historical bunker spend, transit reliability, and risk exposures.</p>
        </div>
        <div class="page-actions">
          <div class="layer-chips">
            <button class="layer-chip" onclick="setAnalyticsPeriod(7)">Last 7 Days</button>
            <button class="layer-chip active" onclick="setAnalyticsPeriod(30)">Last 30 Days</button>
            <button class="layer-chip" onclick="setAnalyticsPeriod(90)">Last 90 Days</button>
          </div>
        </div>
      </div>

      <div class="box box-caution">
        <strong>CAUTION</strong>
        All figures and time-series representations are simulated demonstration data.
      </div>

      <!-- 6 Key Figures -->
      <div class="kpi-grid">
        <div class="kpi-card live">
          <div class="kpi-label">Voyages Completed</div>
          <div class="kpi-val">284</div>
          <div class="kpi-trend">98.4% on-time delivery</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Cumulative Spend</div>
          <div class="kpi-val">$2.84M</div>
          <div class="kpi-trend">-4.2% optimized routing</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avg. Schedule Delta</div>
          <div class="kpi-val">+0.4 d</div>
          <div class="kpi-trend">Within buffer SLA</div>
        </div>
        <div class="kpi-card safe">
          <div class="kpi-label">Bunker Fuel Saved</div>
          <div class="kpi-val">142 MT</div>
          <div class="kpi-trend">$84,000 cost evasion</div>
        </div>
        <div class="kpi-card warn">
          <div class="kpi-label">Hazards Evaded</div>
          <div class="kpi-val">19</div>
          <div class="kpi-trend">Zero damage incidents</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Fleet Carbon Index</div>
          <div class="kpi-val">12.2 g</div>
          <div class="kpi-trend">CO2 per tonne-nm</div>
        </div>
      </div>

      <!-- 4 Chart.js Canvases -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top:20px;">
        <div class="chart-box">
          <div class="chart-title" style="margin-bottom:12px;">Monthly Freight Spend ($ USD in thousands)</div>
          <div style="height:260px; position:relative;">
            <canvas id="chart-spend"></canvas>
          </div>
        </div>
        <div class="chart-box">
          <div class="chart-title" style="margin-bottom:12px;">Average Transit Time Trends (Days)</div>
          <div style="height:260px; position:relative;">
            <canvas id="chart-transit"></canvas>
          </div>
        </div>
        <div class="chart-box">
          <div class="chart-title" style="margin-bottom:12px;">Risk Score Distribution by Major Corridor</div>
          <div style="height:260px; position:relative;">
            <canvas id="chart-corridor-risk"></canvas>
          </div>
        </div>
        <div class="chart-box">
          <div class="chart-title" style="margin-bottom:12px;">Weather Hazard Frequency by Category</div>
          <div style="height:260px; position:relative;">
            <canvas id="chart-hazards"></canvas>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================================================
  // 10. SETTINGS & DATA SOURCES (SECTION 11)
  // =========================================================================
  renderSettings() {
    const sources = window.WAYPOINT_DATA.dataSources;

    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">Platform Configuration & Data Sources</h1>
          <p class="page-desc">System preferences, telemetry provider connections, and enterprise permissions.</p>
        </div>
      </div>

      <!-- Settings Tab Nav -->
      <div class="layer-chips" style="margin-bottom:20px;">
        <button class="layer-chip active" onclick="switchSettingsTab('sources')">Data Sources</button>
        <button class="layer-chip" onclick="switchSettingsTab('profile')">User Profile</button>
        <button class="layer-chip" onclick="switchSettingsTab('org')">Organization</button>
        <button class="layer-chip" onclick="switchSettingsTab('notifications')">Notifications</button>
        <button class="layer-chip" onclick="switchSettingsTab('security')">Security</button>
      </div>

      <div id="tab-sources" class="form-card">
        <h3 style="font-size:16px; font-weight:700; color:#fff; margin-bottom:8px;">Table 7. Telemetry & Data Source Integrations</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
          The system separates calculation, presentation, and data ingestion layers to enable plug-and-play REST integrations.
        </p>

        <div class="impact-table-wrap">
          <table class="ste-table">
            <thead>
              <tr>
                <th>Data Source Service</th>
                <th>Status in Prototype</th>
                <th>Technical Architecture & Provider Note</th>
              </tr>
            </thead>
            <tbody>
              ${sources.map(s => `
                <tr>
                  <td><strong>${s.source}</strong></td>
                  <td><span class="tag ${s.tagClass}">${s.status}</span></td>
                  <td style="color:var(--text-muted); font-size:12px;">${s.note}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="tab-profile" class="form-card hidden" style="margin-top:16px;">
        <h3 style="font-size:16px; font-weight:700; color:#fff; margin-bottom:16px;">Operator Profile</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:600px;">
          <div>
            <label class="input-label">Full Name</label>
            <input type="text" class="text-input" value="James Dao"/>
          </div>
          <div>
            <label class="input-label">Email Address</label>
            <input type="email" class="text-input" value="j.dao@oceancargo.com"/>
          </div>
          <div>
            <label class="input-label">Active Role</label>
            <select class="select-input" onchange="selectRole(this.value); applyRoleNavigation();">
              <option value="shipper">Shipper / Exporter</option>
              <option value="manager">Logistics Manager</option>
            </select>
          </div>
          <div>
            <label class="input-label">Timezone</label>
            <select class="select-input">
              <option>UTC (Coordinated Universal Time)</option>
              <option selected>UTC+05:30 (IST - Mumbai)</option>
              <option>UTC+08:00 (SGT - Singapore)</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:20px;" onclick="showToast('Profile configuration saved.')">Save Preferences</button>
      </div>
    `;
  }
};

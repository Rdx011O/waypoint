// WAYPOINT — Maritime Route Intelligence | app.js
// Main application controller, state management, Leaflet map layers, and interactive handlers

const appState = {
  currentRole: 'shipper', // 'shipper' or 'manager'
  currentPage: 'dashboard',
  selectedCargo: 'General Cargo',
  selectedPriority: 'Balanced',
  activeLayers: {
    routes: true,
    vessels: true,
    hazards: true,
    ports: true,
    risks: false
  },
  tracker: {
    selectedCargoId: 'CRG-8921-X',
    simulationRunning: true,
    simulationSpeed: 1,
    autoFollow: true,
    showBreadcrumbs: true,
    showRoute: true,
    showHazards: true,
    timerId: null,
    vesselMarker: null,
    radarCircle: null,
    breadcrumbPolyline: null,
    routePolyline: null,
    hazardCircles: [],
    portMarkers: [],
    waypointMarkers: [],
    stepFraction: 0,
    currentLegIndex: 4,
    lastPingSecondsAgo: 2,
    telemetryLogs: []
  },
  mapInstances: {},
  chartInstances: {}
};

// =========================================================================
// 1. AUTHENTICATION & ROLE-LOCKED NAVIGATION
// =========================================================================
appState.signupSelectedRole = 'shipper';

window.addEventListener('DOMContentLoaded', () => {
  // Check if role selected
  if (typeof updateRoleCardUI === 'function') updateRoleCardUI();

  // Check URL params for direct cargo tracking link (e.g. ?track=CRG-8921-X or ?id=CRG-7740-R)
  const urlParams = new URLSearchParams(window.location.search);
  const trackParam = urlParams.get('track') || urlParams.get('id');
  if (trackParam) {
    const cargos = window.WAYPOINT_DATA && window.WAYPOINT_DATA.trackedCargos;
    const match = cargos && cargos.find(c => c.id.toLowerCase() === trackParam.toLowerCase() || (c.blNumber && c.blNumber.toLowerCase() === trackParam.toLowerCase()));
    if (match) {
      appState.tracker.selectedCargoId = match.id;
    }
    // Auto-enter app directly for shared shipper tracking links
    if (typeof doLogin === 'function') doLogin();
    navigate('tracker');
    showToast(`Tracking live GPS for ${match ? match.id : trackParam}`);
  }
});

function switchAuthTab(tab) {
  const loginForm = document.getElementById('auth-form-login');
  const signupForm = document.getElementById('auth-form-signup');
  const loginTab = document.getElementById('tab-login-btn');
  const signupTab = document.getElementById('tab-signup-btn');
  const banner = document.getElementById('auth-banner');
  if (banner) banner.classList.add('hidden');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
  }
}

function selectSignupRole(role) {
  appState.signupSelectedRole = role;
  const shipperCard = document.getElementById('signup-role-shipper');
  const managerCard = document.getElementById('signup-role-manager');
  if (shipperCard && managerCard) {
    if (role === 'shipper') {
      shipperCard.classList.add('active');
      managerCard.classList.remove('active');
    } else {
      managerCard.classList.add('active');
      shipperCard.classList.remove('active');
    }
  }
}

function showAuthBanner(message, type = 'error') {
  const banner = document.getElementById('auth-banner');
  if (!banner) return;
  banner.className = `auth-banner ${type}`;
  banner.textContent = message;
  banner.classList.remove('hidden');
}

// Sign In with Email & Password
async function handleSignIn() {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value.trim() : '';

  if (!email || !password) {
    showAuthBanner('Please enter both your work email and password.');
    return;
  }

  const btn = document.getElementById('login-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Authenticating...';
  }

  try {
    const res = await window.fb.signInUser(email, password);
    if (res.success) {
      enterPortalWithProfile(res.profile);
    } else {
      showAuthBanner(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  } catch (err) {
    showAuthBanner('Authentication failed: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sign In to WAYPOINT →';
    }
  }
}

// Sign Up with Name, Org, Email, Password, and Role
async function handleSignUp() {
  const name = document.getElementById('signup-name')?.value.trim();
  const org = document.getElementById('signup-org')?.value.trim();
  const email = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value.trim();
  const role = appState.signupSelectedRole || 'shipper';

  if (!name || !org || !email || !password) {
    showAuthBanner('Please complete all required fields.');
    return;
  }
  if (password.length < 6) {
    showAuthBanner('Password must be at least 6 characters.');
    return;
  }

  const btn = document.getElementById('signup-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating Account...';
  }

  try {
    const res = await window.fb.signUpUser(name, org, email, password, role);
    if (res.success) {
      enterPortalWithProfile(res.profile);
    } else {
      showAuthBanner(res.error || 'Failed to create account.');
    }
  } catch (err) {
    showAuthBanner('Registration failed: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Create Account & Launch Portal →';
    }
  }
}

// Quick Demo Login (Divided by Role)
async function quickDemoLogin(role) {
  showToast(`Accessing demo workspace as ${role === 'shipper' ? 'Shipper' : 'Logistics Manager'}...`);
  const res = await window.fb.quickDemoAuth(role);
  if (res.success) {
    enterPortalWithProfile(res.profile);
  }
}

// Enter portal with role locked
function enterPortalWithProfile(profile) {
  appState.currentRole = profile.role;
  appState.userProfile = profile;

  // Update user badge in sidebar footer
  const nameEl = document.getElementById('sidebar-user-name');
  const emailEl = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-user-avatar');
  if (nameEl) nameEl.textContent = profile.name || (profile.role === 'shipper' ? 'James Dao' : 'Logistics Controller');
  if (emailEl) emailEl.textContent = profile.email || `${profile.role}@waypoint-maritime.app`;
  if (avatarEl) {
    const initials = (profile.name || 'OP').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials || (profile.role === 'shipper' ? 'JD' : 'LC');
  }

  // Hide login screen and display app
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  // Apply role navigation & navigate
  applyRoleNavigation();
  navigate('dashboard');

  // Connect real-time alerts
  if (window.fb && window.fb.isLive) {
    window.fb.subscribeAlerts(liveAlerts => {
      if (liveAlerts && liveAlerts.length) {
        window.WAYPOINT_DATA.alerts = liveAlerts;
        const countBadge = document.querySelector('.alert-count');
        if (countBadge) countBadge.textContent = liveAlerts.length;
      }
    });
  }

  showToast(`Welcome! Signed in as ${profile.role === 'shipper' ? 'Shipper / Exporter' : 'Logistics Manager'}`);
}

// Log Out
async function handleSignOut() {
  if (window.fb) {
    await window.fb.signOutUser();
  }
  appState.userProfile = null;
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  switchAuthTab('login');
  showToast('Logged out of WAYPOINT.');
}

// Apply role navigation: Strictly divided features, NO switch option!
function applyRoleNavigation() {
  const role = appState.currentRole;
  const isShipper = role === 'shipper';

  // Update locked role badge
  const badgeWrap = document.getElementById('role-badge-locked');
  const badgeIcon = document.getElementById('role-badge-icon');
  const badgeText = document.getElementById('role-badge-text');

  if (badgeWrap && badgeIcon && badgeText) {
    if (isShipper) {
      badgeWrap.className = 'role-badge-locked';
      badgeIcon.textContent = '📦';
      badgeText.textContent = 'Shipper Workspace';
    } else {
      badgeWrap.className = 'role-badge-locked manager';
      badgeIcon.textContent = '🎯';
      badgeText.textContent = 'Logistics Manager Console';
    }
  }

  // Render ONLY this role's navigation links
  const navContainer = document.getElementById('sidebar-nav');
  if (!navContainer) return;

  const roleNavItems = window.WAYPOINT_DATA.navItems[role] || [];
  let html = `<div class="nav-group-title">${isShipper ? 'Shipper Operations' : 'Fleet Command'}</div>`;

  roleNavItems.forEach(item => {
    html += `
      <div class="nav-item ${appState.currentPage === item.id ? 'active' : ''}" onclick="navigate('${item.id}')">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </div>
    `;
  });

  navContainer.innerHTML = html;
}

// =========================================================================
// 2. ROUTING & PAGE NAVIGATION
// =========================================================================
function navigate(pageId) {
  // If navigating away from tracker, pause active simulation
  if (appState.currentPage === 'tracker' && pageId !== 'tracker') {
    stopGpsSimulation();
  }

  appState.currentPage = pageId;

  // Update Breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  const labels = {
    dashboard: 'Dashboard',
    tracker: 'Live Cargo & Ship GPS Tracker',
    plan: 'Plan a Shipment',
    compare: 'Compare Routes',
    riskmap: 'Live Risk Map',
    rerouting: 'Rerouting Center',
    alerts: 'Alerts Center',
    assistant: 'Route Assistant',
    saved: 'Saved Routes',
    analytics: 'Analytics',
    settings: 'Settings'
  };
  if (breadcrumb) {
    breadcrumb.innerHTML = `${labels[pageId] || pageId} <span class="breadcrumb-badge mono">${pageId === 'tracker' ? 'LIVE AIS' : 'DEMO'}</span>`;
  }

  // Highlight active nav item
  applyRoleNavigation();

  const contentArea = document.getElementById('page-content');
  if (!contentArea) return;

  // Cleanup past maps / charts
  cleanupLeafletMaps();
  cleanupCharts();

  // Render Page
  switch (pageId) {
    case 'dashboard':
      contentArea.innerHTML = window.PAGES.renderDashboard();
      setTimeout(initDashboardMap, 60);
      break;
    case 'tracker':
      contentArea.innerHTML = window.PAGES.renderLiveTracker();
      setTimeout(initTrackerMap, 60);
      break;
    case 'plan':
      contentArea.innerHTML = window.PAGES.renderPlanShipment();
      setTimeout(initPlanPreviewMap, 60);
      break;
    case 'compare':
      contentArea.innerHTML = window.PAGES.renderCompareRoutes();
      break;
    case 'riskmap':
      contentArea.innerHTML = window.PAGES.renderLiveRiskMap();
      setTimeout(initLiveRiskMap, 60);
      break;
    case 'rerouting':
      contentArea.innerHTML = window.PAGES.renderReroutingCenter();
      break;
    case 'alerts':
      contentArea.innerHTML = window.PAGES.renderAlertsCenter();
      break;
    case 'assistant':
      contentArea.innerHTML = window.PAGES.renderRouteAssistant();
      break;
    case 'saved':
      contentArea.innerHTML = window.PAGES.renderSavedRoutes();
      break;
    case 'analytics':
      contentArea.innerHTML = window.PAGES.renderAnalytics();
      setTimeout(initAnalyticsCharts, 80);
      break;
    case 'settings':
      contentArea.innerHTML = window.PAGES.renderSettings();
      break;
    default:
      contentArea.innerHTML = `<div style="padding:40px;">Page not found</div>`;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}

// =========================================================================
// 3. MAP RENDERING & LEAFLET LAYERS
// =========================================================================
function cleanupLeafletMaps() {
  Object.keys(appState.mapInstances).forEach(id => {
    try {
      if (appState.mapInstances[id]) {
        appState.mapInstances[id].remove();
      }
    } catch (e) {
      console.warn('Map cleanup error', e);
    }
  });
  appState.mapInstances = {};
}

function initDashboardMap() {
  const container = document.getElementById('dashboard-map');
  if (!container) return;

  const map = L.map('dashboard-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([15, 80], 4);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Dark basemap tiles (Esri Dark Canvas + Reference - Zero API Key, No Watermark)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);

  appState.mapInstances['dashboard'] = map;

  // Add Route lines
  const routes = window.WAYPOINT_DATA.routeOptions;
  routes.forEach(r => {
    const polyline = L.polyline(r.coords, {
      color: r.badgeColor === 'teal' ? '#2DD4BF' : '#FBBF24',
      weight: r.isRecommended ? 3.5 : 2,
      opacity: r.isRecommended ? 0.9 : 0.6,
      dashArray: r.isRecommended ? null : '6, 6'
    }).addTo(map);
    polyline.bindPopup(`<strong>${r.name}</strong><br/>Cost: $${r.cost.toLocaleString()} • Transit: ${r.transitDays}d`);
  });

  // Add Ports
  const ports = window.WAYPOINT_DATA.ports;
  ports.forEach(p => {
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 6,
      fillColor: '#38BDF8',
      color: '#fff',
      weight: 1.5,
      fillOpacity: 0.9
    }).addTo(map);
    marker.bindPopup(`<strong>${p.name}</strong><br/>Status: ${p.status}<br/>Wait Time: ${p.waitHours}h`);
  });

  // Add Weather Hazard Zones
  const alerts = window.WAYPOINT_DATA.alerts;
  alerts.forEach(a => {
    const color = a.severityClass === 'crit' ? '#F87171' : '#FBBF24';
    const circle = L.circle([a.lat, a.lng], {
      radius: 280000,
      color: color,
      fillColor: color,
      fillOpacity: 0.18,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(map);
    circle.bindPopup(`<strong>${a.title}</strong><br/>${a.region}<br/>${a.description}`);
  });

  // Add Vessels
  const vessels = window.WAYPOINT_DATA.vessels;
  vessels.forEach(v => {
    const vesselMarker = L.circleMarker([v.lat, v.lng], {
      radius: 5,
      fillColor: '#F1F5F9',
      color: '#07101C',
      weight: 1,
      fillOpacity: 1
    }).addTo(map);
    vesselMarker.bindPopup(`<strong>${v.name}</strong><br/>Type: ${v.type}<br/>Speed: ${v.speed}`);
  });
}

function initPlanPreviewMap() {
  const container = document.getElementById('plan-preview-map');
  if (!container) return;

  const map = L.map('plan-preview-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([10, 88], 4);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);

  appState.mapInstances['plan'] = map;

  const routeA = window.WAYPOINT_DATA.routeOptions[0];
  const poly = L.polyline(routeA.coords, {
    color: '#38BDF8',
    weight: 3,
    dashArray: '5, 5'
  }).addTo(map);

  L.circleMarker(routeA.coords[0], { radius: 7, fillColor: '#2DD4BF', color: '#fff', weight: 2, fillOpacity: 1 }).addTo(map).bindPopup('Origin: Nhava Sheva');
  L.circleMarker(routeA.coords[routeA.coords.length - 1], { radius: 7, fillColor: '#38BDF8', color: '#fff', weight: 2, fillOpacity: 1 }).addTo(map).bindPopup('Destination: Singapore');
}

function initLiveRiskMap() {
  const container = document.getElementById('live-risk-map');
  if (!container) return;

  const map = L.map('live-risk-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([12, 85], 4);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);

  appState.mapInstances['riskmap'] = map;

  // Add all 4 route options with different colors matching manual Table 2
  const routes = window.WAYPOINT_DATA.routeOptions;
  routes.forEach(r => {
    const color = r.id === 'A' ? '#2DD4BF' : r.id === 'D' ? '#38BDF8' : '#FBBF24';
    L.polyline(r.coords, {
      color: color,
      weight: r.id === 'A' ? 3.5 : 2,
      opacity: 0.8
    }).addTo(map).bindPopup(`<strong>${r.name}</strong><br/>Risk Score: ${r.riskScore}/100<br/>Cost: $${r.cost.toLocaleString()}`);
  });

  // Add severe cyclone hazard
  L.circle([9.5, 88.5], {
    radius: 380000,
    color: '#F87171',
    fillColor: '#F87171',
    fillOpacity: 0.25,
    weight: 2,
    dashArray: '6, 6'
  }).addTo(map).bindPopup('<strong>Cyclone Core "ASANI"</strong><br/>Max Wind: 55 kts<br/>Significant wave height: 5.4m');

  // Add ports
  window.WAYPOINT_DATA.ports.forEach(p => {
    L.circleMarker([p.lat, p.lng], {
      radius: 6,
      fillColor: '#38BDF8',
      color: '#fff',
      weight: 1.5,
      fillOpacity: 1
    }).addTo(map).bindPopup(`<strong>${p.name}</strong><br/>Status: ${p.status}`);
  });
}

function focusMapRoute(routeId) {
  const route = window.WAYPOINT_DATA.routeOptions.find(r => r.id === routeId);
  const map = appState.mapInstances['riskmap'];
  if (route && map) {
    map.fitBounds(L.polyline(route.coords).getBounds(), { padding: [40, 40] });
    showToast(`Focused on ${route.name}`);
  }
}

function toggleMapLayer(layerKey) {
  const btn = document.getElementById(`layer-${layerKey}`);
  if (btn) {
    btn.classList.toggle('active');
    showToast(`Toggled ${layerKey} layer`);
  }
}

function toggleRiskMapLayer(layerKey) {
  const btn = document.getElementById(`lrm-${layerKey}`);
  if (btn) {
    btn.classList.toggle('active');
    showToast(`Toggled ${layerKey} overlay`);
  }
}

// =========================================================================
// 4. PLAN SHIPMENT INTERACTIONS
// =========================================================================
function swapPorts() {
  const origin = document.getElementById('plan-origin');
  const dest = document.getElementById('plan-dest');
  if (origin && dest) {
    const temp = origin.value;
    origin.value = dest.value;
    dest.value = temp;
    showToast('Exchanged origin and destination ports.');
    updatePlanPreview();
  }
}

function updatePlanPreview() {
  showToast('Updated route corridor trajectory.');
}

function selectCargoChip(el, cargoType) {
  appState.selectedCargo = cargoType;
  document.querySelectorAll('#cargo-chip-group .cargo-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function selectPriorityChip(el, priority) {
  appState.selectedPriority = priority;
  document.querySelectorAll('#priority-chip-group .priority-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function executeRoutePlanning() {
  const weight = document.getElementById('plan-weight').value;
  const budget = document.getElementById('plan-budget').value;
  if (!weight || !budget) {
    alert('Please enter both cargo weight and maximum budget.');
    return;
  }
  showToast('Synthesizing optimal routing corridors...');
  setTimeout(() => {
    navigate('compare');
  }, 350);
}

// =========================================================================
// 5. COMPARE ROUTES INTERACTIONS
// =========================================================================
function showRouteBreakdown(routeId) {
  const route = window.WAYPOINT_DATA.routeOptions.find(r => r.id === routeId);
  if (!route) return;

  openModal(`
    <div class="modal-head">
      <div class="modal-title">${route.name} — Cost & Hazard Breakdown</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div class="route-metric">
          <div class="metric-lbl">TOTAL ESTIMATED COST</div>
          <div class="metric-val text-accent">$${route.cost.toLocaleString()}</div>
        </div>
        <div class="route-metric">
          <div class="metric-lbl">TRANSIT DURATION</div>
          <div class="metric-val">${route.transitDays} Days</div>
        </div>
      </div>

      <h4 style="font-size:13px; font-weight:700; color:#fff; margin-bottom:8px;">Cost Components</h4>
      <div class="impact-table-wrap" style="margin-bottom:16px;">
        <table class="ste-table">
          <tr><td>Bunker Fuel Expense</td><td class="text-right mono">${route.breakdown.bunkerCost}</td></tr>
          <tr><td>Canal & Port Tariffs</td><td class="text-right mono">${route.breakdown.canalAndPortFees}</td></tr>
          <tr><td>Maritime Security & War Risk</td><td class="text-right mono">${route.breakdown.securityAndInsurance}</td></tr>
          <tr><td>Cargo Handling & Stevedoring</td><td class="text-right mono">${route.breakdown.handling}</td></tr>
          <tr><td>Estimated Carbon Emissions</td><td class="text-right mono">${route.breakdown.co2Emissions}</td></tr>
        </table>
      </div>

      <h4 style="font-size:13px; font-weight:700; color:#fff; margin-bottom:8px;">Waypoints & Sea Corridors</h4>
      <div style="font-size:12px; color:var(--text-muted); line-height:1.6; margin-bottom:16px;">
        ${route.waypoints.join(' → ')}
      </div>

      <div class="box box-note" style="margin-bottom:0;">
        <strong>METEOROLOGICAL WINDOW</strong>
        ${route.breakdown.weatherWindow}
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="confirmRouteSelection('${route.id}')">Select This Route</button>
    </div>
  `);
}

function confirmRouteSelection(routeId) {
  const route = window.WAYPOINT_DATA.routeOptions.find(r => r.id === routeId);
  if (!route) return;

  openModal(`
    <div class="modal-head">
      <div class="modal-title">Confirm Route Selection</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:14px; font-size:13px; color:var(--text-main);">
        You have selected <strong>${route.name}</strong> for the Mumbai → Singapore shipment.
      </p>
      <div class="impact-table-wrap">
        <table class="ste-table">
          <tr><td>Contracted Rate</td><td class="text-right mono">$${route.cost.toLocaleString()}</td></tr>
          <tr><td>Estimated Transit</td><td class="text-right mono">${route.transitDays} Days</td></tr>
          <tr><td>Route Risk Score</td><td class="text-right mono">${route.riskScore}/100</td></tr>
          <tr><td>Active Choke Hazards</td><td class="text-right mono">${route.hazards}</td></tr>
        </table>
      </div>
      <p style="font-size:12px; color:var(--text-muted); margin-top:10px;">
        A dispatch advisory notice will be added to your Saved Routes library.
      </p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-safe" onclick="finalizeBooking('${route.id}')">Confirm & Dispatch</button>
    </div>
  `);
}

async function finalizeBooking(routeId) {
  closeModal();
  const route = window.WAYPOINT_DATA.routeOptions.find(r => r.id === routeId);
  if (route && window.fb) {
    showToast('Saving route to Cloud Firestore...');
    const savedObj = {
      id: `SR-${Date.now().toString().slice(-4)}`,
      name: `Mumbai to Singapore — ${route.name}`,
      origin: 'Mumbai (Nhava Sheva)',
      dest: 'Singapore',
      cargo: appState.selectedCargo || 'General Cargo',
      cost: `$${route.cost.toLocaleString()}`,
      transit: `${route.transitDays} d`,
      risk: route.riskScore,
      lastSaved: new Date().toISOString().split('T')[0],
      badge: 'Active'
    };
    await window.fb.saveRoute(savedObj);
  }
  showToast(`Route ${routeId} successfully saved to Firebase portfolio!`);
  setTimeout(() => {
    navigate('saved');
  }, 400);
}

// =========================================================================
// 6. REROUTING DECISION INTERACTIONS
// =========================================================================
function acceptAlternativeRoute() {
  openModal(`
    <div class="modal-head">
      <div class="modal-title">Confirm Alternative Reroute</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="box box-warning">
        <strong>OPERATIONAL CONFIRMATION</strong>
        Accepting this recommendation instructs the vessel to deviate south around Cyclone ASANI.
      </div>
      <div class="impact-table-wrap">
        <table class="ste-table">
          <tr><td>New Route ETA</td><td class="text-right mono">+0.6 days (13.1d total)</td></tr>
          <tr><td>Incremental Fuel Cost</td><td class="text-right mono">+$850 USD</td></tr>
          <tr><td>Risk Abatement</td><td class="text-right mono text-safe" style="font-weight:700;">-49 Points (72% reduction)</td></tr>
        </table>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-safe" onclick="executeRerouteAcceptance()">Confirm Reroute</button>
    </div>
  `);
}

async function executeRerouteAcceptance() {
  closeModal();
  if (window.fb) {
    await window.fb.logRerouteDecision({
      scenario: 'Severe Tropical Storm ASANI',
      vessel: 'MV Orient Mariner (Voyage #OM-408)',
      action: 'Bypassed south via equatorial corridor',
      riskReduction: '-49 Points (72%)',
      incrementalCost: '+$850 USD'
    });
  }
  showToast('Alternative Route accepted & logged to Firebase. Teal corridor broadcast to vessel.');
}

function keepOriginalRoute() {
  showToast('Notice: Master advised of weather severity. Original transit track maintained.');
}

function compareOtherAlternatives() {
  navigate('compare');
}

function viewRiskFactors() {
  navigate('riskmap');
}

// =========================================================================
// 7. ALERTS DRAWER & FILTERING
// =========================================================================
function openAlertDrawer(alertId) {
  const alert = window.WAYPOINT_DATA.alerts.find(a => a.id === alertId);
  if (!alert) return;

  const content = document.getElementById('drawer-content');
  if (!content) return;

  content.innerHTML = `
    <div style="margin-bottom:14px;">
      <span class="tag tag-${alert.severityClass}">${alert.severity} Severity</span>
      <span class="tag tag-demo" style="margin-left:6px;">${alert.type}</span>
    </div>
    <h2 style="font-size:18px; font-weight:700; color:#fff; margin-bottom:6px;">${alert.title}</h2>
    <div style="font-size:12px; color:var(--text-dim); margin-bottom:16px;">
      📍 Region: ${alert.region} • Area: ${alert.area}
    </div>

    <div class="box box-warning">
      <strong>METEOROLOGICAL INTELLIGENCE</strong>
      ${alert.description}
    </div>

    <h4 style="font-size:13px; font-weight:700; color:#fff; margin-bottom:8px;">Recommended Navigational Mitigation</h4>
    <div style="font-size:13px; color:var(--text-main); line-height:1.5; margin-bottom:20px; background:var(--surface-alt); padding:12px; border-radius:6px;">
      ${alert.action}
    </div>

    <div style="font-size:12px; color:var(--text-muted); margin-bottom:24px;">
      Corridors affected: <strong>${alert.routesAffected}</strong><br/>
      Forecast duration: <strong>${alert.duration}</strong>
    </div>

    <div style="display:flex; gap:10px; margin-top:auto;">
      <button class="btn btn-outline btn-full" onclick="navigate('riskmap'); closeDrawer();">
        🗺️ View on Map
      </button>
      <button class="btn btn-safe btn-full" onclick="markAlertReviewed('${alert.id}')">
        ✓ Mark as Reviewed
      </button>
    </div>
  `;

  document.getElementById('alert-drawer').classList.remove('hidden');
  document.getElementById('drawer-backdrop').classList.remove('hidden');
}

function closeDrawer() {
  const drawer = document.getElementById('alert-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (drawer) drawer.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
}

function markAlertReviewed(id) {
  closeDrawer();
  showToast(`Alert ${id} acknowledged and marked as reviewed.`);
}

function filterAlerts() {
  const sev = document.getElementById('alert-filter-severity').value;
  const reg = document.getElementById('alert-filter-region').value;
  const st = document.getElementById('alert-filter-status').value;

  const rows = document.querySelectorAll('#alerts-table .alert-row');
  rows.forEach(r => {
    const rowSev = r.getAttribute('data-severity');
    const rowReg = r.getAttribute('data-region');
    const rowSt = r.getAttribute('data-status');

    let visible = true;
    if (sev !== 'all' && rowSev !== sev) visible = false;
    if (reg !== 'all' && !rowReg.includes(reg)) visible = false;
    if (st !== 'all' && rowSt !== st) visible = false;

    r.style.display = visible ? '' : 'none';
  });
}

// =========================================================================
// 8. ROUTE ASSISTANT COPILOT CHAT
// =========================================================================
function askPresetQuestion(index) {
  const preset = window.WAYPOINT_DATA.assistantPresets[index];
  if (!preset) return;

  appendUserMessage(preset.q);
  setTimeout(() => {
    appendAssistantMessage(preset.a, preset.suggestedAction, preset.recommendedRouteId);
  }, 400);
}

function sendAssistantMessage() {
  const input = document.getElementById('assistant-input');
  const txt = input.value.trim();
  if (!txt) return;

  appendUserMessage(txt);
  input.value = '';

  setTimeout(() => {
    appendAssistantMessage(
      `Based on current weather radar and sea-lane graph calculations for "${txt}":\n\n• Corridor swell indices remain stable south of the equator.\n• Route D provides the safest profile with 0 active hazards.\n• Route A provides optimal cost efficiency within approved budget margins.`,
      'compare',
      'A'
    );
  }, 500);
}

function appendUserMessage(text) {
  const stream = document.getElementById('chat-messages');
  if (!stream) return;
  const div = document.createElement('div');
  div.className = 'msg-bubble msg-user';
  div.textContent = text;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

function appendAssistantMessage(text, action, routeId) {
  const stream = document.getElementById('chat-messages');
  if (!stream) return;
  const div = document.createElement('div');
  div.className = 'msg-bubble msg-assistant';

  let actionHtml = '';
  if (action === 'compare') {
    actionHtml = `<div style="margin-top:12px;"><button class="btn btn-outline btn-sm" onclick="navigate('compare')">⚖️ Compare Routes</button></div>`;
  } else if (action === 'riskmap') {
    actionHtml = `<div style="margin-top:12px;"><button class="btn btn-outline btn-sm" onclick="navigate('riskmap')">🗺️ Show on Map</button></div>`;
  }

  div.innerHTML = `
    <div style="font-size:11px; color:var(--accent); margin-bottom:4px; font-weight:700;">
      ⚓ WAYPOINT INTELLIGENCE <span class="tag tag-demo">Demo</span>
    </div>
    <div style="white-space:pre-line;">${text}</div>
    ${actionHtml}
  `;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}

// =========================================================================
// 9. ANALYTICS CHARTS (CHART.JS)
// =========================================================================
function cleanupCharts() {
  Object.keys(appState.chartInstances).forEach(id => {
    try {
      if (appState.chartInstances[id]) {
        appState.chartInstances[id].destroy();
      }
    } catch (e) {
      console.warn('Chart cleanup error', e);
    }
  });
  appState.chartInstances = {};
}

function initAnalyticsCharts() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = '#94A3B8';
  Chart.defaults.font.family = 'Inter, sans-serif';

  // 1. Spend Chart
  const ctxSpend = document.getElementById('chart-spend');
  if (ctxSpend) {
    appState.chartInstances['spend'] = new Chart(ctxSpend, {
      type: 'line',
      data: {
        labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        datasets: [{
          label: 'Spend ($k)',
          data: [420, 390, 440, 380, 310, 284],
          borderColor: '#38BDF8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#1E3048' } },
          y: { grid: { color: '#1E3048' } }
        }
      }
    });
  }

  // 2. Transit Trends
  const ctxTransit = document.getElementById('chart-transit');
  if (ctxTransit) {
    appState.chartInstances['transit'] = new Chart(ctxTransit, {
      type: 'bar',
      data: {
        labels: ['Mumbai-Sing', 'Nhava-Felix', 'Shang-Rott', 'Colom-Sing', 'Dubai-Mumbai'],
        datasets: [{
          label: 'Avg Transit (Days)',
          data: [12.5, 28.4, 24.1, 5.2, 3.8],
          backgroundColor: '#2DD4BF',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#1E3048' } }
        }
      }
    });
  }

  // 3. Corridor Risk
  const ctxRisk = document.getElementById('chart-corridor-risk');
  if (ctxRisk) {
    appState.chartInstances['risk'] = new Chart(ctxRisk, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk (<20)', 'Moderate (20-40)', 'Elevated (40-60)', 'Critical (>60)'],
        datasets: [{
          data: [26, 11, 4, 1],
          backgroundColor: ['#2DD4BF', '#38BDF8', '#FBBF24', '#F87171'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
      }
    });
  }

  // 4. Hazard Frequency
  const ctxHazards = document.getElementById('chart-hazards');
  if (ctxHazards) {
    appState.chartInstances['hazards'] = new Chart(ctxHazards, {
      type: 'polarArea',
      data: {
        labels: ['Tropical Cyclones', 'Monsoon Swells', 'Port Congestion', 'Choke Point Risk'],
        datasets: [{
          data: [8, 14, 12, 5],
          backgroundColor: [
            'rgba(248, 113, 113, 0.7)',
            'rgba(251, 191, 36, 0.7)',
            'rgba(56, 189, 248, 0.7)',
            'rgba(45, 212, 191, 0.7)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } },
        scales: { r: { grid: { color: '#1E3048' } } }
      }
    });
  }
}

function setAnalyticsPeriod(days) {
  showToast(`Updated analytics view for past ${days} days.`);
}

// =========================================================================
// 10. SAVED ROUTES & SETTINGS ACTIONS
// =========================================================================
function exportRouteReport() {
  openModal(`
    <div class="modal-head">
      <div class="modal-title">Export Route Report</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="box box-note">
        <strong>ASD-STE100 COMPLIANCE NOTE</strong>
        PDF export integration is not connected in this prototype.
      </div>
      <p style="font-size:13px; color:var(--text-muted); line-height:1.5;">
        Production builds integrate with enterprise document generators for voyage manifests, bunker slips, and marine insurance filings.
      </p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-primary" onclick="closeModal()">Understood</button>
    </div>
  `);
}

function openSavedRoute(id) {
  navigate('compare');
  showToast(`Opened voyage template ${id}`);
}

function renameSavedRoute(id) {
  const r = window.WAYPOINT_DATA.savedRoutes.find(x => x.id === id);
  if (!r) return;
  const newName = prompt('Enter new route name:', r.name);
  if (newName && newName.trim()) {
    r.name = newName.trim();
    navigate('saved');
    showToast('Route profile renamed successfully.');
  }
}

function deleteSavedRoute(id) {
  openModal(`
    <div class="modal-head">
      <div class="modal-title">Confirm Deletion</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px; color:var(--text-main);">
        Are you sure you want to remove route template <strong>${id}</strong> from your portfolio? This action cannot be undone.
      </p>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="executeDeleteRoute('${id}')">Remove Route</button>
    </div>
  `);
}

async function executeDeleteRoute(id) {
  if (window.fb) {
    await window.fb.deleteRoute(id);
  }
  const idx = window.WAYPOINT_DATA.savedRoutes.findIndex(x => x.id === id);
  if (idx !== -1) {
    window.WAYPOINT_DATA.savedRoutes.splice(idx, 1);
  }
  closeModal();
  navigate('saved');
  showToast(`Route ${id} removed.`);
}

function switchSettingsTab(tabId) {
  ['sources', 'profile', 'org', 'notifications', 'security'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove('hidden');
}

function focusSearch() {
  openModal(`
    <div class="modal-head">
      <div class="modal-title">🔍 Quick Search Maritime Database & Live GPS</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:12px; font-size:13px; color:var(--text-muted);">
        Enter a Cargo ID, Bill of Lading (B/L), Container Number, Port, or Ship to jump directly to live tracking:
      </p>
      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <input
          type="text"
          id="global-modal-search"
          class="text-input"
          placeholder="e.g. CRG-8921-X, MAEU-9021481, MSKU-982145-2, Pacific Pioneer, Mumbai..."
          onkeydown="if(event.key==='Enter') executeGlobalSearch(this.value)"
        />
        <button class="btn btn-primary" onclick="executeGlobalSearch(document.getElementById('global-modal-search').value)">
          Track GPS ➔
        </button>
      </div>
      <div style="font-size:12px; font-weight:600; color:var(--text-dim); margin-bottom:8px;">ACTIVE SHIPMENTS AVAILABLE:</div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${(window.WAYPOINT_DATA.trackedCargos || []).map(c => `
          <div
            style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--surface-alt); border:1px solid var(--border); border-radius:6px; cursor:pointer;"
            onclick="closeModal(); openSpecificTrackedCargo('${c.id}')"
          >
            <div>
              <span class="mono text-accent" style="font-weight:600;">${c.id}</span>
              <span style="margin-left:8px; font-size:12px; color:#fff;">${c.title}</span>
              <div style="font-size:11px; color:var(--text-muted);">🚢 ${c.ship.name} • ${c.originPort.name.split(' ')[0]} ➔ ${c.destinationPort.name.split(' ')[0]}</div>
            </div>
            <span class="tag tag-${c.statusClass} mono">${c.ship.speedKnots} kts</span>
          </div>
        `).join('')}
      </div>
    </div>
  `);
  setTimeout(() => {
    const inp = document.getElementById('global-modal-search');
    if (inp) inp.focus();
  }, 100);
}

function executeGlobalSearch(query) {
  if (!query || !query.trim()) return;
  const q = query.trim().toLowerCase();
  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const match = cargos.find(c =>
    c.id.toLowerCase().includes(q) ||
    c.blNumber.toLowerCase().includes(q) ||
    c.containerId.toLowerCase().includes(q) ||
    c.ship.name.toLowerCase().includes(q) ||
    c.originPort.name.toLowerCase().includes(q) ||
    c.destinationPort.name.toLowerCase().includes(q)
  );

  closeModal();
  if (match) {
    openSpecificTrackedCargo(match.id);
  } else {
    showToast(`Navigating to Live Risk Map for query: "${query}"`);
    navigate('riskmap');
  }
}

// =========================================================================
// 11. MODAL & TOAST UTILITIES
// =========================================================================
function openModal(contentHtml) {
  const modalBox = document.getElementById('modal-content');
  const overlay = document.getElementById('modal-overlay');
  if (modalBox && overlay) {
    modalBox.innerHTML = contentHtml;
    overlay.classList.remove('hidden');
  }
}

function closeModal(e) {
  if (e && e.target && e.target.id !== 'modal-overlay' && !e.target.classList.contains('modal-close')) {
    return;
  }
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function showToast(message) {
  let toast = document.getElementById('waypoint-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'waypoint-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--surface-card);
      color: #fff;
      border: 1px solid var(--accent);
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: opacity 0.3s ease, transform 0.3s ease;
      transform: translateY(10px);
      opacity: 0;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span>⚓</span> <span>${message}</span>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 2800);
}

// =========================================================================
// 12. LIVE GPS TRACKER CONTROLLER & SATELLITE AIS SIMULATION ENGINE
// =========================================================================

function getHeadingSector(deg) {
  const normalized = (deg % 360 + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N (000° True North)';
  if (normalized < 67.5) return 'NE (045° North-East)';
  if (normalized < 112.5) return 'E (090° Due East)';
  if (normalized < 157.5) return 'SE (135° South-East)';
  if (normalized < 202.5) return 'S (180° Due South)';
  if (normalized < 247.5) return 'SW (225° South-West)';
  if (normalized < 292.5) return 'W (270° Due West)';
  return 'NW (315° North-West)';
}

function formatMarineCoords(lat, lng) {
  const latDeg = Math.floor(Math.abs(lat));
  const latMin = ((Math.abs(lat) - latDeg) * 60).toFixed(3);
  const latDir = lat >= 0 ? 'N' : 'S';

  const lngDeg = Math.floor(Math.abs(lng));
  const lngMin = ((Math.abs(lng) - lngDeg) * 60).toFixed(3);
  const lngDir = lng >= 0 ? 'E' : 'W';

  return `${latDeg}° ${latMin}' ${latDir} &nbsp; ${lngDeg}° ${lngMin}' ${lngDir}`;
}

function openSpecificTrackedCargo(cargoId) {
  appState.tracker.selectedCargoId = cargoId;
  navigate('tracker');
}

function selectTrackedCargo(cargoId) {
  stopGpsSimulation();
  appState.tracker.selectedCargoId = cargoId;
  appState.tracker.stepFraction = 0;

  // Highlight pill
  document.querySelectorAll('.tracker-shipment-pill').forEach(p => p.classList.remove('active'));
  const activePill = document.getElementById(`pill-${cargoId}`);
  if (activePill) activePill.classList.add('active');

  // Re-render tracker DOM
  const contentArea = document.getElementById('page-content');
  if (contentArea) {
    contentArea.innerHTML = window.PAGES.renderLiveTracker();
  }

  // Re-init map
  setTimeout(initTrackerMap, 60);

  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === cargoId);
  if (cargo) {
    showToast(`Focused on ${cargo.id} • ${cargo.ship.name}`);
  }
}

function initTrackerMap() {
  const container = document.getElementById('tracker-map');
  if (!container) return;

  // Cleanup past tracker map
  if (appState.mapInstances['tracker']) {
    try { appState.mapInstances['tracker'].remove(); } catch(e){}
    delete appState.mapInstances['tracker'];
  }

  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === appState.tracker.selectedCargoId) || cargos[0];

  const map = L.map('tracker-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([cargo.ship.lat, cargo.ship.lng], 6);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Marine Basemap (Esri Dark Canvas + Reference - Zero API Key, No Watermark)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map);

  appState.mapInstances['tracker'] = map;
  appState.tracker.map = map;

  // 1. Planned Route Polyline
  if (cargo.routePlannedCoords && cargo.routePlannedCoords.length > 0) {
    const routePoly = L.polyline(cargo.routePlannedCoords, {
      color: '#FBBF24',
      weight: 2.5,
      opacity: 0.75,
      dashArray: '6, 6'
    }).addTo(map);
    routePoly.bindPopup(`<strong>Planned Shipping Corridor</strong><br/>${cargo.originPort.name} ➔ ${cargo.destinationPort.name}<br/>Total: ${cargo.totalDistanceNm} nm`);
    appState.tracker.routePolyline = routePoly;
  }

  // 2. Traveled Breadcrumb Polyline & Dots
  if (cargo.breadcrumbs && cargo.breadcrumbs.length > 0) {
    const breadcrumbCoords = cargo.breadcrumbs.map(b => [b.lat, b.lng]);
    const breadPoly = L.polyline(breadcrumbCoords, {
      color: '#38BDF8',
      weight: 3.5,
      opacity: 0.95
    }).addTo(map);
    appState.tracker.breadcrumbPolyline = breadPoly;

    // Past ping markers
    cargo.breadcrumbs.forEach((b, idx) => {
      const isLatest = idx === cargo.breadcrumbs.length - 1;
      if (!isLatest) {
        L.circleMarker([b.lat, b.lng], {
          radius: 4,
          fillColor: '#38BDF8',
          color: '#0B1220',
          weight: 1.5,
          fillOpacity: 0.8
        }).addTo(map).bindPopup(`
          <strong>Historical GPS Fix</strong><br/>
          Time: ${b.time}<br/>
          Speed: ${b.speed} kts • COG: ${b.heading}°<br/>
          Location: ${b.label || 'En Route'}
        `);
      }
    });
  }

  // 3. Weather Hazard Zones (e.g. Cyclone ASANI or swells)
  if (appState.tracker.showHazards && window.WAYPOINT_DATA.reroutingScenario) {
    const sc = window.WAYPOINT_DATA.reroutingScenario;
    const hazardCircle = L.circle(sc.hazardZone.center, {
      radius: sc.hazardZone.radiusKm,
      color: '#F87171',
      fillColor: '#F87171',
      fillOpacity: 0.18,
      weight: 2,
      dashArray: '6, 6'
    }).addTo(map);
    hazardCircle.bindPopup(`<strong>⚠️ ${sc.hazardZone.label}</strong><br/>Gale Force Winds > 55 kts<br/>Significant wave height > 5.2m`);
    appState.tracker.hazardCircles = [hazardCircle];
  }

  // 4. Ports
  const originMarker = L.circleMarker([cargo.originPort.lat, cargo.originPort.lng], {
    radius: 7,
    fillColor: '#2DD4BF',
    color: '#fff',
    weight: 2,
    fillOpacity: 1
  }).addTo(map).bindPopup(`<strong>Origin Port: ${cargo.originPort.name}</strong><br/>Departed: ${cargo.originPort.departureTime}`);

  const destMarker = L.circleMarker([cargo.destinationPort.lat, cargo.destinationPort.lng], {
    radius: 7,
    fillColor: '#38BDF8',
    color: '#fff',
    weight: 2,
    fillOpacity: 1
  }).addTo(map).bindPopup(`<strong>Destination Port: ${cargo.destinationPort.name}</strong><br/>Target ETA: ${cargo.destinationPort.eta}`);

  appState.tracker.portMarkers = [originMarker, destMarker];

  // 5. Pulsing Radar Circle at Vessel GPS
  const radarCircle = L.circle([cargo.ship.lat, cargo.ship.lng], {
    radius: 26000,
    color: '#38BDF8',
    fillColor: '#38BDF8',
    fillOpacity: 0.1,
    weight: 1.5,
    dashArray: '4, 4'
  }).addTo(map);
  appState.tracker.radarCircle = radarCircle;

  // 6. Custom Rotating Vessel Icon
  const shipIcon = L.divIcon({
    className: 'custom-ship-marker-div',
    html: `
      <div class="ship-radar-pulse"></div>
      <div class="ship-marker-inner" id="tracker-ship-marker-svg" style="transform: rotate(${cargo.ship.heading}deg);">
        <svg viewBox="0 0 32 32" width="34" height="34" style="filter: drop-shadow(0 0 6px #38BDF8);">
          <path d="M16 2 L23 12 L21 28 L16 26 L11 28 L9 12 Z" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="16" cy="14" r="2.5" fill="#07101C"/>
          <line x1="16" y1="2" x2="16" y2="8" stroke="#FFFFFF" stroke-width="2"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const vesselMarker = L.marker([cargo.ship.lat, cargo.ship.lng], {
    icon: shipIcon,
    zIndexOffset: 1000
  }).addTo(map);

  vesselMarker.bindPopup(`
    <div style="font-family: var(--font-sans); color: #F1F5F9; min-width: 190px;">
      <strong style="color: #38BDF8; font-size:14px;">${cargo.ship.name}</strong><br/>
      <span style="font-size:12px; color: #94A3B8;">${cargo.ship.flag} • IMO ${cargo.ship.imo}</span><br/>
      <hr style="border:0; border-top:1px solid #1E3048; margin:6px 0;"/>
      <div style="font-family:var(--font-mono); font-size:11px; line-height:1.6;">
        <div>GPS: ${cargo.ship.lat.toFixed(3)}°N, ${cargo.ship.lng.toFixed(3)}°E</div>
        <div>SOG: <strong style="color:#2DD4BF;">${cargo.ship.speedKnots} kts</strong> | COG: ${cargo.ship.heading}°</div>
        <div>Cargo: <strong style="color:#38BDF8;">${cargo.id}</strong> (${cargo.weightTons} MT)</div>
        <div>Status: <span style="color:#2DD4BF;">${cargo.statusClass === 'safe' ? 'ON TIME' : 'REROUTING'}</span></div>
      </div>
    </div>
  `);

  appState.tracker.vesselMarker = vesselMarker;

  // Start live GPS advancement
  startGpsSimulation();
}

// Simulation Control
function startGpsSimulation() {
  stopGpsSimulation();
  appState.tracker.simulationRunning = true;
  updateSimToolbarUI();

  const intervalMs = Math.max(200, Math.round(2500 / appState.tracker.simulationSpeed));
  appState.tracker.timerId = setInterval(stepGpsSimulation, intervalMs);
}

function stopGpsSimulation() {
  if (appState.tracker.timerId) {
    clearInterval(appState.tracker.timerId);
    appState.tracker.timerId = null;
  }
  appState.tracker.simulationRunning = false;
  updateSimToolbarUI();
}

function toggleGpsSimulation() {
  if (appState.tracker.simulationRunning) {
    stopGpsSimulation();
    showToast('Paused live satellite GPS stream.');
  } else {
    startGpsSimulation();
    showToast('Resumed live satellite GPS stream.');
  }
}

function setSimulationSpeed(speed) {
  appState.tracker.simulationSpeed = speed;
  ['1', '5', '15'].forEach(s => {
    const btn = document.getElementById(`sim-speed-${s}`);
    if (btn) btn.classList.toggle('active', Number(s) === speed);
  });
  if (appState.tracker.simulationRunning) {
    startGpsSimulation();
  }
  showToast(`Simulation rate set to ${speed}x real-time.`);
}

function updateSimToolbarUI() {
  const btn = document.getElementById('btn-toggle-sim');
  const statusTxt = document.getElementById('sim-status-text');
  if (btn) {
    btn.innerHTML = appState.tracker.simulationRunning ? '⏸️ Pause Live Feed' : '▶️ Resume Live Feed';
  }
  if (statusTxt) {
    statusTxt.textContent = appState.tracker.simulationRunning
      ? `Streaming Satellite AIS Telemetry (${appState.tracker.simulationSpeed}x) • GPS Lock OK`
      : 'Live Telemetry Paused by Operator';
  }
}

function stepGpsSimulation() {
  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === appState.tracker.selectedCargoId) || cargos[0];
  if (!cargo || !cargo.routePlannedCoords || cargo.routePlannedCoords.length < 2) return;

  const planned = cargo.routePlannedCoords;
  // Find target coord (next waypoint)
  const curLeg = appState.tracker.currentLegIndex || 4;
  const targetIdx = Math.min(curLeg + 1, planned.length - 1);
  const targetPoint = planned[targetIdx];

  const currentLat = cargo.ship.lat;
  const currentLng = cargo.ship.lng;

  const dLat = targetPoint[0] - currentLat;
  const dLng = targetPoint[1] - currentLng;
  const dist = Math.hypot(dLat, dLng);

  // If close to waypoint, advance leg
  if (dist < 0.08 && targetIdx < planned.length - 1) {
    appState.tracker.currentLegIndex = targetIdx;
  }

  // Compute incremental step
  const stepMagnitude = 0.012 * (appState.tracker.simulationSpeed || 1);
  const stepRatio = Math.min(0.2, stepMagnitude / Math.max(dist, 0.001));

  const newLat = currentLat + dLat * stepRatio;
  const newLng = currentLng + dLng * stepRatio;

  // Bearing
  const y = dLng * Math.cos(newLat * Math.PI / 180);
  const x = dLat;
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  cargo.ship.heading = Math.round(bearing);

  // Speed variance
  const baseSpeed = 16.4;
  const speedNoise = Math.sin(Date.now() / 4000) * 0.3;
  cargo.ship.speedKnots = +((baseSpeed + speedNoise).toFixed(1));

  cargo.ship.lat = newLat;
  cargo.ship.lng = newLng;

  // Mileage updates
  const nmDecrement = 0.3 * (appState.tracker.simulationSpeed || 1);
  cargo.remainingDistanceNm = Math.max(12, Math.round(cargo.remainingDistanceNm - nmDecrement));
  cargo.completedDistanceNm = cargo.totalDistanceNm - cargo.remainingDistanceNm;
  cargo.progressPercent = Math.min(99.9, +((cargo.completedDistanceNm / cargo.totalDistanceNm) * 100).toFixed(1));

  // Update Leaflet marker
  if (appState.tracker.vesselMarker) {
    appState.tracker.vesselMarker.setLatLng([newLat, newLng]);
    const svgEl = document.getElementById('tracker-ship-marker-svg');
    if (svgEl) {
      svgEl.style.transform = `rotate(${cargo.ship.heading}deg)`;
    }
  }

  if (appState.tracker.radarCircle) {
    appState.tracker.radarCircle.setLatLng([newLat, newLng]);
  }

  // Update Breadcrumbs
  if (appState.tracker.breadcrumbPolyline) {
    appState.tracker.breadcrumbPolyline.addLatLng([newLat, newLng]);
  }

  // Auto-follow
  if (appState.tracker.autoFollow && appState.tracker.map) {
    appState.tracker.map.panTo([newLat, newLng], { animate: true, duration: 0.4 });
  }

  // Update DOM cockpit
  updateTrackerDOM(cargo);

  // Stream telemetry packet
  emitTelemetryPacket(cargo);
}

function updateTrackerDOM(cargo) {
  const marineEl = document.getElementById('gps-marine-readout');
  const decimalEl = document.getElementById('gps-decimal-readout');
  if (marineEl) marineEl.innerHTML = formatMarineCoords(cargo.ship.lat, cargo.ship.lng);
  if (decimalEl) decimalEl.textContent = `${cargo.ship.lat.toFixed(5)}° N, ${cargo.ship.lng.toFixed(5)}° E`;

  const sogVal = document.getElementById('tracker-sog-val');
  const sogKmh = document.getElementById('tracker-sog-kmh');
  const cogVal = document.getElementById('tracker-cog-val');
  const cogDesc = document.getElementById('tracker-heading-desc');
  const compassDial = document.getElementById('compass-dial');

  if (sogVal) sogVal.innerHTML = `${cargo.ship.speedKnots} <span class="gauge-unit">kts</span>`;
  if (sogKmh) sogKmh.textContent = `${(cargo.ship.speedKnots * 1.852).toFixed(1)} km/h`;
  if (cogVal) cogVal.innerHTML = `${cargo.ship.heading}° <span class="gauge-unit">True</span>`;
  if (cogDesc) cogDesc.textContent = getHeadingSector(cargo.ship.heading);
  if (compassDial) compassDial.style.transform = `rotate(${cargo.ship.heading}deg)`;

  const distComp = document.getElementById('tracker-dist-completed');
  const distRem = document.getElementById('tracker-dist-remaining');
  const progPct = document.getElementById('tracker-progress-pct');
  const progFill = document.getElementById('tracker-progress-fill');

  if (distComp) distComp.textContent = `${cargo.completedDistanceNm.toLocaleString()} nm traversed`;
  if (distRem) distRem.textContent = `${cargo.remainingDistanceNm.toLocaleString()} nm to go`;
  if (progPct) progPct.textContent = `${cargo.progressPercent}% completed`;
  if (progFill) progFill.style.width = `${cargo.progressPercent}%`;

  const pingAge = document.getElementById('tracker-ping-age');
  if (pingAge) pingAge.textContent = `Just now (GPS Lock • 14 Sats)`;
}

function emitTelemetryPacket(cargo) {
  const terminal = document.getElementById('telemetry-terminal-stream');
  if (!terminal) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const lines = [
    `<div class="terminal-line fix">[${timeStr}] GPS FIX: ${cargo.ship.lat.toFixed(4)}°N, ${cargo.ship.lng.toFixed(4)}°E | SOG: ${cargo.ship.speedKnots} kts | COG: ${cargo.ship.heading}° | HDOP: 0.8 | SATS: 14</div>`,
    `<div class="terminal-line sensor">[${timeStr}] TELEMETRY: Container ${cargo.containerId} Temp: ${cargo.sensorData.tempC}°C | Seal: OK | Batter: 96%</div>`
  ];

  // Randomly emit one
  const chosenLine = lines[Math.floor(Math.random() * lines.length)];
  terminal.insertAdjacentHTML('beforeend', chosenLine);

  // Keep terminal capped at 50 lines
  while (terminal.children.length > 50) {
    terminal.removeChild(terminal.firstChild);
  }
  terminal.scrollTop = terminal.scrollHeight;
}

function triggerManualGpsPing() {
  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === appState.tracker.selectedCargoId) || cargos[0];
  if (!cargo) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  const terminal = document.getElementById('telemetry-terminal-stream');
  if (terminal) {
    terminal.insertAdjacentHTML('beforeend', `
      <div class="terminal-line fix" style="color:#5EEAD4; font-weight:bold;">
        [${timeStr}] MANUAL SATELLITE POLL: Iridium Transponder Ack Received | Lat: ${cargo.ship.lat.toFixed(5)}°N, Lng: ${cargo.ship.lng.toFixed(5)}°E | Fix: 3D DGPS
      </div>
    `);
    terminal.scrollTop = terminal.scrollHeight;
  }

  showToast(`Manual satellite GPS ping acknowledged for ${cargo.ship.name}`);
  const pingAge = document.getElementById('tracker-ping-age');
  if (pingAge) pingAge.textContent = 'Just now (Manual Poll Verified)';
}

function toggleTrackerAutoFollow() {
  appState.tracker.autoFollow = !appState.tracker.autoFollow;
  const btn = document.getElementById('btn-auto-follow');
  if (btn) btn.classList.toggle('active', appState.tracker.autoFollow);
  showToast(appState.tracker.autoFollow ? 'Auto-Follow Enabled: Map will center on vessel' : 'Auto-Follow Disabled');
}

function toggleTrackerBreadcrumbs() {
  appState.tracker.showBreadcrumbs = !appState.tracker.showBreadcrumbs;
  const btn = document.getElementById('btn-breadcrumbs');
  if (btn) btn.classList.toggle('active', appState.tracker.showBreadcrumbs);
  if (appState.tracker.breadcrumbPolyline) {
    if (appState.tracker.showBreadcrumbs) {
      appState.tracker.breadcrumbPolyline.addTo(appState.tracker.map);
    } else {
      appState.tracker.breadcrumbPolyline.remove();
    }
  }
}

function toggleTrackerRoutePath() {
  appState.tracker.showRoute = !appState.tracker.showRoute;
  const btn = document.getElementById('btn-route-path');
  if (btn) btn.classList.toggle('active', appState.tracker.showRoute);
  if (appState.tracker.routePolyline) {
    if (appState.tracker.showRoute) {
      appState.tracker.routePolyline.addTo(appState.tracker.map);
    } else {
      appState.tracker.routePolyline.remove();
    }
  }
}

function toggleTrackerHazards() {
  appState.tracker.showHazards = !appState.tracker.showHazards;
  const btn = document.getElementById('btn-hazards-overlay');
  if (btn) btn.classList.toggle('active', appState.tracker.showHazards);
  (appState.tracker.hazardCircles || []).forEach(c => {
    if (appState.tracker.showHazards) {
      c.addTo(appState.tracker.map);
    } else {
      c.remove();
    }
  });
}

function recenterTrackerMap() {
  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === appState.tracker.selectedCargoId) || cargos[0];
  if (appState.tracker.map && cargo) {
    appState.tracker.map.setView([cargo.ship.lat, cargo.ship.lng], 7, { animate: true });
    showToast(`Centered map on ${cargo.ship.name}`);
  }
}

function copyGpsCoords() {
  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === appState.tracker.selectedCargoId) || cargos[0];
  if (!cargo) return;

  const latDeg = Math.floor(Math.abs(cargo.ship.lat));
  const latMin = ((Math.abs(cargo.ship.lat) - latDeg) * 60).toFixed(3);
  const latDir = cargo.ship.lat >= 0 ? 'N' : 'S';

  const lngDeg = Math.floor(Math.abs(cargo.ship.lng));
  const lngMin = ((Math.abs(cargo.ship.lng) - lngDeg) * 60).toFixed(3);
  const lngDir = cargo.ship.lng >= 0 ? 'E' : 'W';

  const coordsText = `${latDeg}° ${latMin}' ${latDir}, ${lngDeg}° ${lngMin}' ${lngDir} (${cargo.ship.lat.toFixed(5)}, ${cargo.ship.lng.toFixed(5)})`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(coordsText);
  }
  showToast(`Copied GPS: ${coordsText}`);
}

function handleTrackerSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const pills = document.querySelectorAll('.tracker-shipment-pill');
  pills.forEach(pill => {
    const text = pill.textContent.toLowerCase();
    pill.style.display = (!q || text.includes(q)) ? 'block' : 'none';
  });
}

function clearTelemetryLog() {
  const terminal = document.getElementById('telemetry-terminal-stream');
  if (terminal) {
    terminal.innerHTML = '<div class="terminal-line system">[STREAM RESET] Log cleared by operator. Resuming satellite telemetry...</div>';
  }
}

function copyTelemetryLog() {
  const terminal = document.getElementById('telemetry-terminal-stream');
  if (terminal && navigator.clipboard) {
    navigator.clipboard.writeText(terminal.innerText);
    showToast('Copied satellite telemetry stream to clipboard.');
  }
}

// Shipper Share Tracking Modal with QR Code
function openShareTrackingModal(cargoId) {
  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === cargoId) || cargos[0];
  const trackingUrl = `${window.location.origin}${window.location.pathname}?track=${cargo.id}`;

  openModal(`
    <div class="modal-head">
      <div class="modal-title">🔗 Share Live GPS Cargo Tracking</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
        Provide this secure real-time tracking link to consignees, buyers, or logistics dispatchers to monitor live ship GPS location without internal login.
      </p>

      <div style="background:var(--surface-alt); padding:16px; border:1px solid var(--border); border-radius:10px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:11px; text-transform:uppercase; color:var(--text-dim); font-weight:700;">Consignment Information</span>
          <span class="tag tag-${cargo.statusClass}">LIVE TRACKING ACTIVE</span>
        </div>
        <div style="font-size:15px; font-weight:700; color:#fff; margin-bottom:4px;">${cargo.title}</div>
        <div style="font-size:12px; color:var(--text-muted); line-height:1.6;">
          • <strong>Carrying Ship:</strong> ${cargo.ship.name} (${cargo.ship.flag})<br/>
          • <strong>Bill of Lading:</strong> <span class="mono text-accent">${cargo.blNumber}</span> | Container: <span class="mono">${cargo.containerId}</span><br/>
          • <strong>Route:</strong> ${cargo.originPort.name} ➔ ${cargo.destinationPort.name}<br/>
          • <strong>ETA:</strong> <span class="mono text-safe">${cargo.etaFormatted} (${cargo.etaCountdown})</span>
        </div>
      </div>

      <div class="field-group" style="margin-bottom:18px;">
        <label class="field-label">Shareable Live Tracking URL</label>
        <div style="display:flex; gap:8px;">
          <input type="text" class="text-input mono" id="share-link-input" value="${trackingUrl}" readonly style="font-size:12px;"/>
          <button class="btn btn-primary" onclick="copyShareTrackingLink()">
            📋 Copy Link
          </button>
        </div>
      </div>

      <!-- Live QR Code Card -->
      <div style="display:flex; gap:16px; align-items:center; background:var(--surface-card); padding:14px; border:1px solid var(--border); border-radius:8px;">
        <div style="background:#fff; padding:8px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center;">
          <!-- SVG QR Code representation -->
          <svg viewBox="0 0 100 100" width="80" height="80">
            <rect width="100" height="100" fill="#ffffff"/>
            <!-- Corners -->
            <rect x="10" y="10" width="24" height="24" fill="#07101C"/>
            <rect x="14" y="14" width="16" height="16" fill="#ffffff"/>
            <rect x="18" y="18" width="8" height="8" fill="#07101C"/>

            <rect x="66" y="10" width="24" height="24" fill="#07101C"/>
            <rect x="70" y="14" width="16" height="16" fill="#ffffff"/>
            <rect x="74" y="18" width="8" height="8" fill="#07101C"/>

            <rect x="10" y="66" width="24" height="24" fill="#07101C"/>
            <rect x="14" y="70" width="16" height="16" fill="#ffffff"/>
            <rect x="18" y="74" width="8" height="8" fill="#07101C"/>

            <!-- Data patterns -->
            <rect x="42" y="12" width="6" height="6" fill="#07101C"/>
            <rect x="52" y="16" width="6" height="6" fill="#07101C"/>
            <rect x="42" y="24" width="16" height="6" fill="#07101C"/>
            <rect x="12" y="42" width="6" height="16" fill="#07101C"/>
            <rect x="24" y="46" width="12" height="6" fill="#07101C"/>
            <rect x="42" y="42" width="16" height="16" fill="#38BDF8"/>
            <rect x="66" y="44" width="12" height="6" fill="#07101C"/>
            <rect x="80" y="52" width="8" height="12" fill="#07101C"/>
            <rect x="42" y="66" width="6" height="14" fill="#07101C"/>
            <rect x="54" y="72" width="14" height="6" fill="#07101C"/>
            <rect x="74" y="70" width="14" height="14" fill="#07101C"/>
          </svg>
        </div>
        <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
          <strong style="color:#fff;">Smartphone Instant Scan</strong><br/>
          Consignees can scan this QR code on any mobile device to open live marine GPS tracking directly without downloading an app.
        </div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-safe" onclick="openPublicTrackingView('${cargo.id}')">Open Consignment Slip</button>
    </div>
  `);
}

function copyShareTrackingLink() {
  const inp = document.getElementById('share-link-input');
  if (inp) {
    inp.select();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inp.value);
    }
    showToast('Tracking link copied to clipboard!');
  }
}

// Official Shipper Public Consignment Tracking Pass / Certificate
function openPublicTrackingView(cargoId) {
  const cargos = window.WAYPOINT_DATA.trackedCargos || [];
  const cargo = cargos.find(c => c.id === cargoId) || cargos[0];

  openModal(`
    <div class="modal-head">
      <div class="modal-title">📄 Ocean Bill of Lading & GPS Tracking Pass</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body printable-slip" style="max-height:75vh; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; border-bottom:2px solid var(--accent); padding-bottom:12px; margin-bottom:16px;">
        <div>
          <div style="font-size:18px; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">
            <span>⚓ WAYPOINT</span>
            <span style="font-size:12px; font-weight:500; color:var(--text-muted);">MARITIME TELEMATICS</span>
          </div>
          <div style="font-size:11px; color:var(--text-dim);">GLOBAL FREIGHT AUDIT & SATELLITE GPS VERIFICATION</div>
        </div>
        <div style="text-align:right;">
          <div class="mono text-safe" style="font-weight:700; font-size:13px;">STATUS: IN TRANSIT (LIVE)</div>
          <div class="mono" style="font-size:11px; color:var(--text-muted);">Issued: 17 Oct 2026 UTC</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <div style="background:var(--surface-alt); padding:12px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Shipper / Consignor</div>
          <div style="font-weight:600; color:#fff; font-size:13px; margin-top:2px;">${cargo.shipper}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Port of Loading: ${cargo.originPort.name}</div>
        </div>
        <div style="background:var(--surface-alt); padding:12px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; font-weight:700; color:var(--text-dim); text-transform:uppercase;">Consignee / Notify Party</div>
          <div style="font-weight:600; color:#fff; font-size:13px; margin-top:2px;">${cargo.consignee}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Port of Discharge: ${cargo.destinationPort.name}</div>
        </div>
      </div>

      <div style="background:var(--surface-card); padding:14px; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
        <div style="font-size:12px; font-weight:700; color:var(--accent); margin-bottom:10px;">CARGO TELEMETRY & CONTAINER INTEGRITY</div>
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; font-size:12px;">
          <div>
            <span class="text-dim" style="font-size:11px;">Container No:</span>
            <div class="mono" style="font-weight:600; color:#fff;">${cargo.containerId}</div>
          </div>
          <div>
            <span class="text-dim" style="font-size:11px;">Customs Seal:</span>
            <div class="mono text-safe" style="font-weight:600;">${cargo.sealNumber}</div>
          </div>
          <div>
            <span class="text-dim" style="font-size:11px;">Cargo Temp:</span>
            <div class="mono" style="font-weight:600; color:#fff;">${cargo.sensorData.tempC}°C</div>
          </div>
          <div>
            <span class="text-dim" style="font-size:11px;">G-Shock Load:</span>
            <div class="mono text-safe" style="font-weight:600;">${cargo.sensorData.shockG} G (Nominal)</div>
          </div>
        </div>
      </div>

      <div style="background:var(--surface-alt); padding:14px; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:12px; font-weight:700; color:#fff;">CURRENT SATELLITE GPS POSITION</span>
          <span class="tag tag-safe mono">${cargo.ship.speedKnots} KTS • ${cargo.ship.heading}° COG</span>
        </div>
        <div class="mono text-accent" style="font-size:15px; font-weight:700;">
          ${cargo.ship.lat.toFixed(5)}° N, ${cargo.ship.lng.toFixed(5)}° E
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
          Carried by <strong>${cargo.ship.name}</strong> (${cargo.ship.flag}) • IMO ${cargo.ship.imo} • Source: ${cargo.ship.gpsSource}
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted); border-top:1px solid var(--border); padding-top:12px;">
        <div>Verified Carrier Digital Certificate: <span class="mono text-dim">SHA256: 8f9b...a412</span></div>
        <div class="mono text-safe" style="font-weight:700;">ETA: ${cargo.etaFormatted}</div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print Tracking Certificate</button>
    </div>
  `);
}

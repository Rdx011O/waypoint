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
  mapInstances: {},
  chartInstances: {}
};

// =========================================================================
// 1. AUTHENTICATION & ROLE-LOCKED NAVIGATION
// =========================================================================
appState.signupSelectedRole = 'shipper';

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
  appState.currentPage = pageId;

  // Update Breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  const labels = {
    dashboard: 'Dashboard',
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
    breadcrumb.innerHTML = `${labels[pageId] || pageId} <span class="breadcrumb-badge mono">DEMO</span>`;
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

  // Dark basemap tiles (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd'
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd'
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    subdomains: 'abcd'
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
  const query = prompt('Search routes, ports, vessels, or hazards:');
  if (query && query.trim()) {
    showToast(`Searching for "${query}" across marine database...`);
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

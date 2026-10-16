/* app.js — Voyage Fit main application logic */

// ============================================================
// STATE
// ============================================================
const state = {
  role:       "shipper",    // "shipper" | "carrier"
  screen:     "plan",       // "plan" | "results" | "compare" | "route" | "confirm" | "carrier"
  step:       1,
  cargo:      null,
  portFrom:   "INNSA",
  portTo:     "GBFXT",
  container:  "40ft Dry",
  readyDate:  "",
  sort:       "cheap",
  compareSet: new Set(),
  selectedRoute: null,
  delayOffset:   0,
  showHelp:   false,
  carrierTab: "add",
  carrierQuotes: JSON.parse(JSON.stringify(SAMPLE_CARRIERS)),
  portFromSearch: "",
  portToSearch:   "",
};

// ============================================================
// ROUTING HELPERS
// ============================================================
function setRole(r)    { state.role = r; state.screen = r === "shipper" ? "plan" : "carrier"; state.step = 1; state.compareSet.clear(); renderApp(); }
function goHome()      { state.screen = "plan"; state.step = 1; state.cargo = null; state.compareSet.clear(); renderApp(); }
function jumpStep(n)   { if (n <= state.step) { state.step = n; state.screen = n===1?"plan":n===2?"results":"route"; renderApp(); } }
function goToRoute(id) { state.selectedRoute = SAMPLE_ROUTES.find(r => r.id === id); state.screen = "route"; state.step = 3; renderApp(); }
function toggleCompare(id, checked) {
  if (checked) {
    if (state.compareSet.size >= 3) {
      alert("You can compare up to 3 carriers at a time.");
      document.getElementById("cmp-"+id).checked = false;
      return;
    }
    state.compareSet.add(id);
  } else {
    state.compareSet.delete(id);
  }
  const n = state.compareSet.size;
  // re-render compare button + text
  const btn = document.getElementById("compare-cta");
  if (btn) {
    btn.disabled = n < 2;
    btn.textContent = n >= 2 ? `Compare selected (${n}/3)` : `Select 2–3 carriers to compare (${n}/3)`;
  }
  // update card borders
  SAMPLE_ROUTES.forEach(r => {
    const card = document.getElementById("card-"+r.id);
    if (card) card.classList.toggle("selected-compare", state.compareSet.has(r.id));
  });
}
function goCompare()   { if (state.compareSet.size >= 2) { state.screen = "compare"; renderApp(); } }
function goConfirm()   { state.screen = "confirm"; renderApp(); }
function toggleHelp()  { state.showHelp = !state.showHelp; document.getElementById("help-modal").classList.toggle("hidden", !state.showHelp); }
function closeHelp(e)  { if (e.target.id === "help-modal") toggleHelp(); }

// ============================================================
// PLAN STEP HELPERS
// ============================================================
function selectCargo(id) {
  state.cargo = id;
  renderApp();
}
function selectPort(which, code) {
  if (which === "from") state.portFrom = code;
  else state.portTo = code;
  renderApp();
}
function updatePortSearch(which, val) {
  if (which === "from") state.portFromSearch = val;
  else state.portToSearch = val;
  // live filter chips — just re-render the chips section
  const id = which === "from" ? "from-chips" : "to-chips";
  const el = document.getElementById(id);
  if (el) el.innerHTML = renderPortChips(which);
}
function renderPortChips(which) {
  const search = which === "from" ? state.portFromSearch : state.portToSearch;
  const selected = which === "from" ? state.portFrom : state.portTo;
  return COMMON_PORTS
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
    .map(p => `<span class="chip ${selected===p.code?"selected":""}" onclick="selectPort('${which}','${p.code}')">${p.country} ${p.name}</span>`)
    .join("");
}

function goToResults() {
  if (!state.cargo) { alert("Please choose a cargo type first."); return; }
  state.screen = "results";
  state.step = 2;
  renderApp();
}

// ============================================================
// SORT ROUTES
// ============================================================
function sortedRoutes() {
  return [...SAMPLE_ROUTES].sort((a, b) => {
    if (state.sort === "cheap")   return a.priceUSD - b.priceUSD;
    if (state.sort === "fast")    return a.days - b.days;
    if (state.sort === "changes") return a.changes - b.changes;
    if (state.sort === "co2")     return a.co2 - b.co2;
    return 0;
  });
}
function setSort(s) { state.sort = s; renderApp(); }

// ============================================================
// CARRIER HELPERS
// ============================================================
function setCarrierTab(t) { state.carrierTab = t; renderApp(); }
function toggleQuote(id) {
  const q = state.carrierQuotes.find(q => q.id === id);
  if (q) { q.active = !q.active; renderApp(); }
}
function submitQuote(e) {
  e.preventDefault();
  const form = e.target;
  const newQ = {
    id: "c" + Date.now(),
    name: form.cname.value || "My Company",
    route: `${form.fromp.value} → ${form.top.value}`,
    container: form.ctype.value,
    priceUSD: parseInt(form.price.value) || 0,
    days: parseInt(form.days.value) || 0,
    changes: parseInt(form.changes.value) || 0,
    validity: form.validity.value,
    active: true,
    badge: "quoted",
    sample: false
  };
  state.carrierQuotes.unshift(newQ);
  state.carrierTab = "list";
  renderApp();
}
function updateDelay(val) {
  state.delayOffset = parseInt(val);
  const clockEl = document.getElementById("shelf-clock");
  if (clockEl && state.selectedRoute) {
    clockEl.innerHTML = renderShelfClock(state.selectedRoute, state.cargo || "mango", state.delayOffset);
  }
  const lbl = document.getElementById("delay-val");
  if (lbl) lbl.textContent = val;
}

// ============================================================
// SCREEN RENDERERS
// ============================================================
function renderPlanScreen() {
  const cargo = CARGO_TYPES.find(c => c.id === state.cargo);
  return `
  <div class="screen" id="screen-plan">
    <div class="screen-intro">
      <h1 style="font-size:1.5rem;">${t("q_cargo")}</h1>
      <p style="font-size:0.85rem;margin-top:4px;">Choose your cargo to see routes that fit.</p>
    </div>

    <!-- Q1: Cargo -->
    <div class="question-card mt16 ${state.cargo ? "answered" : ""}">
      <div class="question-label"><span class="question-label-icon">📦</span>${t("q_cargo")}</div>
      <div class="cargo-grid">
        ${CARGO_TYPES.map(c => `
          <div class="cargo-tile ${state.cargo === c.id ? "selected" : ""}" onclick="selectCargo('${c.id}')" role="button" tabindex="0" aria-label="${c.label}">
            <span class="cargo-tile-emoji">${c.emoji}</span>
            <span class="cargo-tile-label">${c.label}</span>
          </div>`).join("")}
      </div>
      ${cargo ? `<div class="cargo-hint"><span class="cargo-hint-icon">${cargo.emoji}</span><span class="cargo-hint-text"><strong>${cargo.label}:</strong> ${cargo.hint}</span></div>` : ""}
    </div>

    <!-- Q2: Ports -->
    <div class="question-card mt16">
      <div class="question-label"><span class="question-label-icon">🗺</span>${t("q_ports")}</div>
      <div class="field-group">
        <div class="field-label">⬆ ${t("portFrom")}</div>
        <input class="port-search-input" type="text" placeholder="${t("portFromPh")}" value="${state.portFromSearch}"
          oninput="updatePortSearch('from', this.value)" id="from-search" autocomplete="off" />
        <div class="port-chips" id="from-chips">${renderPortChips("from")}</div>
      </div>
      <div class="port-arrow">↕</div>
      <div class="field-group mt8">
        <div class="field-label">⬇ ${t("portTo")}</div>
        <input class="port-search-input" type="text" placeholder="${t("portToPh")}" value="${state.portToSearch}"
          oninput="updatePortSearch('to', this.value)" id="to-search" autocomplete="off" />
        <div class="port-chips" id="to-chips">${renderPortChips("to")}</div>
      </div>
    </div>

    <!-- Q3: Container + date -->
    <div class="question-card mt16">
      <div class="question-label"><span class="question-label-icon">🚢</span>${t("q_container")}</div>
      <div class="field-group">
        <div class="field-label">🔲 ${t("containerType")}</div>
        <div class="field-select-wrap">
          <select class="field-select" onchange="state.container=this.value" id="container-select">
            <option value="20ft Dry"   ${state.container==="20ft Dry"?"selected":""}>${t("dr_20")}</option>
            <option value="40ft Dry"   ${state.container==="40ft Dry"?"selected":""}>${t("dr_40")}</option>
            <option value="20ft Reefer"${state.container==="20ft Reefer"?"selected":""}>${t("re_20")}</option>
            <option value="40ft Reefer"${state.container==="40ft Reefer"?"selected":""}>${t("re_40")}</option>
            <option value="Hazardous"  ${state.container==="Hazardous"?"selected":""}>${t("haz")}</option>
          </select>
        </div>
      </div>
      <div class="field-group">
        <div class="field-label">📅 ${t("readyDate")}</div>
        <input class="field-input" type="date" id="ready-date"
          value="${state.readyDate}" onchange="state.readyDate=this.value"
          min="${new Date().toISOString().split('T')[0]}" />
      </div>
    </div>

    <!-- Port Radar mini -->
    <div style="margin-top:4px;">
      <div style="font-size:0.78rem;font-weight:700;color:var(--teal);margin:16px 0 4px;text-transform:uppercase;letter-spacing:0.05em;">⚓ ${t("portRadar")}</div>
      ${renderPortRadarMini()}
    </div>

    <!-- Help strip -->
    <div style="display:flex;justify-content:center;margin-top:16px;">
      <button class="btn btn-ghost btn-sm" onclick="toggleHelp()">💬 ${t("helpChoose")}</button>
    </div>
  </div>

  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      <button class="btn btn-primary btn-full" onclick="goToResults()" ${!state.cargo?"disabled":""}>
        ${t("next")}
      </button>
    </div>
  </div>`;
}

function renderResultsScreen() {
  const routes = sortedRoutes();
  const hasCompare = state.compareSet.size >= 2;
  return `
  <div class="screen" id="screen-results">
    <div class="flex-b mb8">
      <h2 style="color:var(--teal);">Carrier options</h2>
      <button class="btn btn-ghost btn-sm" onclick="goHome()">← ${t("back")}</button>
    </div>

    <!-- Sort bar -->
    <div class="sort-bar">
      ${[["cheap","sort_cheap"],["fast","sort_fast"],["changes","sort_changes"],["co2","sort_co2"]].map(([k,tk]) =>
        `<button class="sort-btn ${state.sort===k?"active":""}" onclick="setSort('${k}')">${t(tk)}</button>`
      ).join("")}
    </div>
    <div class="sort-honesty">${t("honesty")}</div>

    <!-- Cards -->
    <div class="flex-col gap16" id="carrier-cards">
      ${routes.map(r => renderCarrierCard(r, state.cargo, state.compareSet, toggleCompare)).join("")}
    </div>
  </div>

  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      <button class="btn btn-outline btn-full" id="compare-cta" onclick="goCompare()" ${!hasCompare?"disabled":""}>
        ${state.compareSet.size < 2 ? `☑ Tick cards to compare (${state.compareSet.size}/3)` : `Compare selected (${state.compareSet.size}/3) →`}
      </button>
    </div>
  </div>`;
}

function renderCompareScreen() {
  const selected = SAMPLE_ROUTES.filter(r => state.compareSet.has(r.id));
  if (selected.length < 2) {
    return `<div class="screen"><div class="empty-state">
      <span class="empty-state-emoji">📊</span>
      <h3>${t("compare_btn")}</h3>
      <p>${t("empty_compare")}</p>
      <button class="btn btn-primary mt16" onclick="setScreen('results')">${t("back")}</button>
    </div></div>`;
  }
  const cols = selected.length;
  const gridCols = `1fr ${Array(cols).fill("1fr").join(" ")}`;

  const rows = [
    { key: "price",    label: "💰 Price", values: selected.map(r => `$${r.priceUSD.toLocaleString()}`),  nums: selected.map(r => r.priceUSD),   lower: true  },
    { key: "days",     label: "⚡ Days at sea", values: selected.map(r => `${r.days} days`),              nums: selected.map(r => r.days),       lower: true  },
    { key: "changes",  label: "↔ Ship changes", values: selected.map(r => r.changes === 0 ? "✓ Direct" : `${r.changes} change${r.changes>1?"s":""}`), nums: selected.map(r => r.changes), lower: true },
    { key: "co2",      label: "🌿 CO₂ (tonnes)", values: selected.map(r => `${r.co2}t`),                 nums: selected.map(r => r.co2),        lower: true  },
    { key: "fit",      label: "🛡️ Fit score",   values: selected.map(r => `${calcFitScore(r, state.cargo)}/100`), nums: selected.map(r => calcFitScore(r, state.cargo)), lower: false },
    { key: "badge",    label: "📡 Data source", values: selected.map(r => ({ live:"Live 📡", published:"Published 📄", estimated:"Estimated ~", quoted:"Carrier-quoted 🤝" }[r.badgeType])), nums: null, lower: false },
  ];

  return `
  <div class="screen" id="screen-compare">
    <div class="flex-b mb16">
      <h2 style="color:var(--teal);">Side-by-side</h2>
      <button class="btn btn-ghost btn-sm" onclick="state.screen='results';renderApp()">← ${t("back")}</button>
    </div>
    <div class="compare-grid" style="--cols:${cols};">
      <!-- Header -->
      <div class="compare-header-row" style="display:grid;grid-template-columns:${gridCols};">
        <div class="compare-cell" style="background:var(--teal-dark);font-weight:700;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.7);">Carrier</div>
        ${selected.map(r => `<div class="compare-cell" style="font-weight:700;">${r.carrierIcon} ${r.carrier}</div>`).join("")}
      </div>
      <!-- Rows -->
      ${rows.map(row => {
        const bestIdx = row.nums ? (row.lower
          ? row.nums.indexOf(Math.min(...row.nums))
          : row.nums.indexOf(Math.max(...row.nums))) : -1;
        return `<div class="compare-row" style="display:grid;grid-template-columns:${gridCols};">
          <div class="compare-row-label">${row.label}</div>
          ${row.values.map((v, i) => `<div class="compare-val ${i === bestIdx ? "best" : ""}">${v}</div>`).join("")}
        </div>`;
      }).join("")}
      <!-- Action row -->
      <div class="compare-row" style="display:grid;grid-template-columns:${gridCols};">
        <div class="compare-row-label">📋 Book</div>
        ${selected.map(r => `<div class="compare-val"><button class="btn btn-primary btn-sm" onclick="goToRoute('${r.id}')">View →</button></div>`).join("")}
      </div>
    </div>
    <p style="font-size:0.72rem;text-align:center;margin-top:12px;color:var(--ink-soft);">🛡️ Green highlight = best value in that row. We rank nothing for commission.</p>
  </div>
  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      <button class="btn btn-outline btn-full" onclick="state.screen='results';renderApp()">← Back to results</button>
    </div>
  </div>`;
}

function renderRouteScreen() {
  const route = state.selectedRoute || SAMPLE_ROUTES[0];
  state.delayOffset = state.delayOffset || 0;
  return `
  <div class="screen" id="screen-route">
    <div class="flex-b mb16">
      <div>
        <h2 style="color:var(--teal);">${route.carrierIcon} ${route.carrier}</h2>
        <div style="margin-top:4px;">${renderBadge(route.badgeType)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="state.screen='results';renderApp()">← ${t("back")}</button>
    </div>

    <div class="route-clock-layout">
      <!-- Left: Route map -->
      <div>
        <div style="font-size:0.78rem;font-weight:700;color:var(--teal);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">🗺 Route</div>
        ${renderRouteMap(route)}
      </div>

      <!-- Right: Shelf Clock -->
      <div class="mt16">
        <div style="font-size:0.78rem;font-weight:700;color:var(--teal);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.05em;">⏱ ${t("shelf_clock")}</div>
        <div class="card" style="padding:16px;">
          <div id="shelf-clock">
            ${renderShelfClock(route, state.cargo || "mango", state.delayOffset)}
          </div>

          <!-- What-if slider -->
          <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--mist);">
            <div class="whatif-label">
              <span>🔮 ${t("whatif")}</span>
              <span>+<span id="delay-val">${state.delayOffset}</span> ${t("whatif_label")}</span>
            </div>
            <input type="range" class="whatif-slider" min="0" max="10" value="${state.delayOffset}"
              oninput="updateDelay(this.value)" id="delay-slider" aria-label="Delay slider" />
          </div>
        </div>
      </div>
    </div>

    <!-- Fit Score -->
    <div class="mt16">
      ${renderFitScore(route, state.cargo || "mango")}
    </div>

    <!-- Price summary -->
    <div class="card mt16" style="padding:16px 20px;">
      <div class="flex-b">
        <span style="font-size:0.85rem;color:var(--ink-soft);">Total estimated price</span>
        <span style="font-family:var(--font-head);font-size:1.5rem;font-weight:700;color:var(--teal);">$${route.priceUSD.toLocaleString()}<span style="font-size:0.75rem;color:var(--ink-soft);font-weight:400;">/container</span></span>
      </div>
      <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:6px;">${renderBadge(route.badgeType)} — price shown as-is, not adjusted.</div>
    </div>

    <p style="font-size:0.75rem;text-align:center;color:var(--ink-soft);margin-top:12px;">${t("request_note")}</p>
  </div>

  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      <button class="btn btn-primary btn-full" onclick="goConfirm()" id="request-btn" style="background:var(--teal);">
        ${t("request_btn")}
      </button>
    </div>
  </div>`;
}

function renderConfirmScreen() {
  const route = state.selectedRoute || SAMPLE_ROUTES[0];
  const trackingId = "VF-" + Math.random().toString(36).slice(2,8).toUpperCase();
  return `
  <div class="screen" id="screen-confirm">
    <div class="confirmation-hero">
      <span class="confirmation-plane">✈️</span>
      <h1 class="confirmation-title">${t("confirm_title")}</h1>
      <p class="confirmation-sub">${t("confirm_sub")}</p>
      <div class="tracking-id">${t("tracking")}: ${trackingId}</div>
    </div>

    <div class="card mt24" style="padding:20px;">
      <div style="font-size:0.8rem;font-weight:700;color:var(--teal);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Booking summary</div>
      ${[
        ["Carrier",     `${route.carrierIcon} ${route.carrier}`],
        ["Price",       `$${route.priceUSD.toLocaleString()} per container`],
        ["Days at sea", `${route.days} days`],
        ["Ship changes",route.changes === 0 ? "None — direct" : `${route.changes}`],
        ["Container",   state.container],
        ["Cargo",       CARGO_TYPES.find(c=>c.id===state.cargo)?.label || "—"],
      ].map(([k,v]) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--mist);font-size:0.85rem;">
          <span style="color:var(--ink-soft);">${k}</span>
          <span style="font-weight:600;color:var(--ink);">${v}</span>
        </div>`).join("")}
    </div>

    <div style="background:var(--green-bg);border-radius:var(--r12);padding:14px 16px;margin-top:16px;font-size:0.82rem;color:var(--green);border:1px solid var(--green);">
      ✅ Your request has been sent. The carrier will reply within 24 hours. This is a <strong>request only</strong>, not a confirmed booking.
    </div>
  </div>

  <div class="bottom-bar">
    <div class="bottom-bar-inner">
      <button class="btn btn-outline btn-full" onclick="goHome()">${t("new_search")} 🔍</button>
    </div>
  </div>`;
}

function renderCarrierScreen() {
  return `
  <div class="screen" id="screen-carrier">
    <h2 style="color:var(--teal);">⚓ ${t("carrier_role")} Portal</h2>
    <p style="font-size:0.85rem;margin-top:4px;margin-bottom:16px;">Publish your freight quotes and manage visibility.</p>

    <div class="carrier-banner">
      <span class="carrier-banner-icon">🤝</span>
      <span>${t("carrier_badge_note")}</span>
    </div>

    <div class="tab-bar">
      <button class="tab-btn ${state.carrierTab==="add"?"active":""}" onclick="setCarrierTab('add')">➕ ${t("add_quote")}</button>
      <button class="tab-btn ${state.carrierTab==="list"?"active":""}" onclick="setCarrierTab('list')">📋 ${t("my_quotes")}</button>
    </div>

    ${state.carrierTab === "add" ? renderCarrierAddForm() : renderCarrierQuoteList()}
  </div>`;
}

function renderCarrierAddForm() {
  return `
  <form class="quote-form-card" onsubmit="submitQuote(event)" id="quote-form">
    <div class="field-row">
      <div class="field-group">
        <div class="field-label">🏢 Company name</div>
        <input class="field-input" name="cname" type="text" placeholder="e.g. Maersk Line" required />
      </div>
      <div class="field-group">
        <div class="field-label">🔲 ${t("containerType")}</div>
        <div class="field-select-wrap">
          <select class="field-select" name="ctype">
            <option>${t("dr_20")}</option>
            <option>${t("dr_40")}</option>
            <option>${t("re_20")}</option>
            <option>${t("re_40")}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="field-row">
      <div class="field-group">
        <div class="field-label">⬆ From port</div>
        <input class="field-input" name="fromp" type="text" placeholder="e.g. Nhava Sheva" required />
      </div>
      <div class="field-group">
        <div class="field-label">⬇ To port</div>
        <input class="field-input" name="top" type="text" placeholder="e.g. Rotterdam" required />
      </div>
    </div>
    <div class="field-row">
      <div class="field-group">
        <div class="field-label">💰 Price (USD)</div>
        <input class="field-input" name="price" type="number" placeholder="1200" min="1" required />
      </div>
      <div class="field-group">
        <div class="field-label">⚡ Days at sea</div>
        <input class="field-input" name="days" type="number" placeholder="21" min="1" max="120" required />
      </div>
    </div>
    <div class="field-row">
      <div class="field-group">
        <div class="field-label">↔ Ship changes</div>
        <div class="field-select-wrap">
          <select class="field-select" name="changes">
            <option value="0">0 — Direct</option>
            <option value="1">1 ship change</option>
            <option value="2">2 ship changes</option>
          </select>
        </div>
      </div>
      <div class="field-group">
        <div class="field-label">📅 ${t("validity")}</div>
        <input class="field-input" name="validity" type="date" required />
      </div>
    </div>
    <button class="btn btn-primary btn-full mt16" type="submit">📤 ${t("submit_quote")}</button>
  </form>`;
}

function renderCarrierQuoteList() {
  if (state.carrierQuotes.length === 0) {
    return `<div class="empty-state"><span class="empty-state-emoji">📋</span><h3>No quotes yet</h3><p>Add your first quote using the form.</p></div>`;
  }
  return `
  <div id="quote-list">
    ${state.carrierQuotes.map(q => `
    <div class="quote-list-item">
      <div class="quote-list-info">
        <div class="quote-list-route">${q.name} ${q.sample ? '<span class="sample-label">Sample</span>' : ""} ${renderBadge(q.badge)}</div>
        <div class="quote-list-meta">📍 ${q.route} · 🔲 ${q.container}</div>
        <div class="quote-list-meta">💰 $${q.priceUSD.toLocaleString()} · ⚡ ${q.days}d · ↔ ${q.changes} changes · 📅 Until ${q.validity}</div>
      </div>
      <label class="quote-toggle-switch" title="${q.active ? "Active — shippers can see this" : "Inactive — hidden from shippers"}">
        <input type="checkbox" ${q.active ? "checked" : ""} onchange="toggleQuote('${q.id}')" />
        <span class="toggle-slider"></span>
      </label>
    </div>`).join("")}
  </div>`;
}

// ============================================================
// MASTER RENDER
// ============================================================
function renderApp() {
  const app = document.getElementById("app");

  let progressStep = null;
  if (state.role === "shipper") {
    if      (state.screen === "plan")    progressStep = 1;
    else if (state.screen === "results" || state.screen === "compare") progressStep = 2;
    else if (state.screen === "route" || state.screen === "confirm")   progressStep = 3;
  }

  let screenHTML = "";
  if (state.screen === "plan")    screenHTML = renderPlanScreen();
  else if (state.screen === "results") screenHTML = renderResultsScreen();
  else if (state.screen === "compare") screenHTML = renderCompareScreen();
  else if (state.screen === "route")   screenHTML = renderRouteScreen();
  else if (state.screen === "confirm") screenHTML = renderConfirmScreen();
  else if (state.screen === "carrier") screenHTML = renderCarrierScreen();

  app.innerHTML = `
    <div class="app-wrap">
      ${renderTopNav(state.role)}
      ${progressStep ? renderProgressBar(progressStep) : ""}
      ${screenHTML}
      ${renderHelpFab()}
      ${renderHelpModal()}
    </div>`;

  // Restore help modal visibility
  const modal = document.getElementById("help-modal");
  if (modal) modal.classList.toggle("hidden", !state.showHelp);

  // Re-attach event listeners for dynamic elements
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  state.readyDate = new Date().toISOString().split("T")[0];
  renderApp();
});

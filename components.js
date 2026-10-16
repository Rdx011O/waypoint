/* components.js — Reusable HTML builders */

function renderBadge(type) {
  const map = {
    live:      `<span class="badge badge-live">📡 ${t("badge_live").replace("📡 ","")}</span>`,
    published: `<span class="badge badge-published">📄 ${t("badge_pub").replace("📄 ","")}</span>`,
    estimated: `<span class="badge badge-estimated">~ ${t("badge_est").replace("~ ","")}</span>`,
    quoted:    `<span class="badge badge-quoted">🤝 ${t("badge_quoted").replace("🤝 ","")}</span>`
  };
  return map[type] || "";
}

function renderFitMeter(score) {
  const level = getFitLevel(score);
  const cls = { good: "fit-good", ok: "fit-ok", risky: "fit-risky" }[level];
  const label = { good: t("fit_good"), ok: t("fit_ok"), risky: t("fit_risky") }[level];
  const icon = { good: "🛡️", ok: "⚠️", risky: "🚨" }[level];
  return `
    <div class="fit-meter ${cls}">
      <span style="font-size:1rem;">${icon}</span>
      <div class="fit-meter-bar"><div class="fit-meter-fill" style="width:${score}%"></div></div>
      <span class="fit-meter-label">${label} ${score}/100</span>
    </div>`;
}

function renderBadgeRow(type) {
  return `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">${renderBadge(type)}</div>`;
}

function renderCarrierCard(route, cargoId, compareSet, onCompareToggle) {
  const score = calcFitScore(route, cargoId);
  const level = getFitLevel(score);
  const isSelected = compareSet && compareSet.has(route.id);
  const viaText = route.changes === 0
    ? `<span style="color:var(--green);font-weight:700;">✓ Direct — no ship changes</span>`
    : `<span style="color:var(--turmeric-dk);">Changes ship at ${route.via.join(", ")}</span>`;

  return `
  <div class="carrier-card ${isSelected ? "selected-compare" : ""}" id="card-${route.id}">
    <div class="carrier-card-header">
      <div>
        <div class="carrier-name">${route.carrierIcon} ${route.carrier} ${route.sample ? '<span class="sample-label">Sample</span>' : ''}</div>
        <div style="margin-top:4px;">${renderBadge(route.badgeType)}</div>
      </div>
      <div style="text-align:right;">
        <div class="carrier-price">$${route.priceUSD.toLocaleString()}<span class="carrier-price-unit">/container</span></div>
        <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:2px;">USD</div>
      </div>
    </div>
    <div class="carrier-card-body">
      <div class="carrier-stats">
        <div class="carrier-stat"><span class="carrier-stat-icon">⚡</span><strong>${route.days}</strong>&nbsp;days at sea</div>
        <div class="carrier-stat"><span class="carrier-stat-icon">↔</span><strong>${route.changes}</strong>&nbsp;${t("shipChanges")}</div>
        <div class="carrier-stat"><span class="carrier-stat-icon">🌿</span><strong>${route.co2}</strong>&nbsp;t CO₂</div>
      </div>
      <div style="font-size:0.8rem;margin-bottom:10px;">${viaText}</div>
      ${renderFitMeter(score)}
    </div>
    <div class="carrier-card-footer">
      <label class="compare-check" for="cmp-${route.id}">
        <input type="checkbox" id="cmp-${route.id}" ${isSelected ? "checked" : ""} onchange="toggleCompare('${route.id}', this.checked)" />
        ${t("compare_sel")}
      </label>
      <button class="btn btn-primary btn-sm" onclick="goToRoute('${route.id}')">View route →</button>
    </div>
  </div>`;
}

function renderShelfClock(route, cargoId, delayOffset = 0) {
  const cargo = CARGO_TYPES.find(c => c.id === cargoId) || CARGO_TYPES[4];
  const total = cargo.shelfDays >= 999 ? (route.seaDays + route.portDays + 7) : cargo.shelfDays;
  const margin = cargo.shelfDays >= 999 ? 7 : Math.max(0, cargo.shelfDays - route.days - delayOffset);
  const effectiveSea  = route.seaDays + delayOffset;
  const effectivePort = route.portDays;
  const effectiveTotal = total;

  // SVG ring calculations (radius 80, cx/cy 100)
  const R = 78; const CX = 100; const CY = 100;
  const circ = 2 * Math.PI * R;

  function arc(start, end, color, strokeWidth = 16) {
    const frac = Math.min((end - start) / effectiveTotal, 1);
    const startFrac = start / effectiveTotal;
    const dash = frac * circ;
    const gap  = circ - dash;
    const rot  = startFrac * 360;
    return `<circle cx="${CX}" cy="${CY}" r="${R}"
      fill="none" stroke="${color}" stroke-width="${strokeWidth}"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="0"
      transform="rotate(${rot.toFixed(2)}, ${CX}, ${CY})"
      stroke-linecap="round" />`;
  }

  const seaColor    = "#0F4C5C";
  const portColor   = "#DCEBEF";
  const marginColor = margin <= 2 ? "#E4572E" : "#2E8B6A";
  const seaEnd   = effectiveSea;
  const portEnd  = seaEnd + effectivePort;
  const marginEnd = portEnd + margin;

  let verdict = "";
  if (cargo.shelfDays >= 999) {
    verdict = "✅ No shelf-life limit — focus on cost and speed.";
  } else if (margin <= 0) {
    verdict = "🚨 Cargo may arrive too late — choose a faster route.";
  } else if (margin <= 2) {
    verdict = `⏱ Arrives with only ${margin} day${margin===1?"":"s"} to spare — risky.`;
  } else {
    verdict = `✅ ${t("arrives_with")} ${margin} ${t("days_spare")}.`;
  }

  return `
  <div class="clock-wrap">
    <div class="clock-svg-wrap">
      <svg class="clock-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <!-- Background ring -->
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#DCEBEF" stroke-width="16"/>
        ${arc(0, seaEnd, seaColor)}
        ${portEnd > seaEnd ? arc(seaEnd, portEnd, "#89B9CA") : ""}
        ${margin > 0 ? arc(portEnd, Math.min(marginEnd, effectiveTotal), marginColor) : ""}
      </svg>
      <div class="clock-center-text">
        <span class="clock-center-days">${margin >= 0 ? margin : 0}</span>
        <span class="clock-center-label">${t("margin_days")}</span>
      </div>
    </div>
    <div class="clock-verdict">${verdict}</div>
    <div class="clock-legend">
      <div class="clock-legend-item">
        <div class="clock-legend-dot" style="background:${seaColor}"></div> ${t("sea_days")} (${effectiveSea}d)
      </div>
      <div class="clock-legend-item">
        <div class="clock-legend-dot" style="background:#89B9CA"></div> ${t("port_days")} (${effectivePort}d)
      </div>
      <div class="clock-legend-item">
        <div class="clock-legend-dot" style="background:${marginColor}"></div> ${t("margin_days")} (${Math.max(0,margin)}d)
      </div>
    </div>
  </div>`;
}

function renderFitScore(route, cargoId) {
  const score = calcFitScore(route, cargoId);
  const level = getFitLevel(score);
  const shieldColor = { good: "var(--green-bg)", ok: "#FFF8E6", risky: "var(--coral-bg)" }[level];
  const numColor    = { good: "var(--green)", ok: "var(--turmeric-dk)", risky: "var(--coral)" }[level];
  const reasons = getFitReasons(route, cargoId);
  return `
  <div class="fit-score-wrap">
    <div class="fit-score-header">
      <div class="fit-score-shield" style="background:${shieldColor};">🛡️</div>
      <div>
        <div class="fit-score-number" style="color:${numColor};">${score}<span style="font-size:1rem;color:var(--ink-soft);">/100</span></div>
        <div class="fit-score-label">${t("fitScore")}</div>
      </div>
    </div>
    <div class="fit-reasons">
      ${reasons.map(r => `<div class="fit-reason"><span class="fit-reason-icon">${r.icon}</span><span class="fit-reason-text">${r.text}</span></div>`).join("")}
    </div>
  </div>`;
}

function renderRouteMap(route) {
  const ports = ["Nhava Sheva", ...route.via, "Felixstowe"];
  const n = ports.length;
  const svgW = 340; const svgH = 130;
  const margin = 20;
  const lineY = 65;
  const step = (svgW - margin * 2) / Math.max(n - 1, 1);

  // Build SVG
  let svgContent = "";
  // Draw track segments
  for (let i = 0; i < n - 1; i++) {
    const x1 = margin + i * step;
    const x2 = margin + (i + 1) * step;
    svgContent += `<line x1="${x1}" y1="${lineY}" x2="${x2}" y2="${lineY}" stroke="#0F4C5C" stroke-width="3" stroke-dasharray="6 3"/>`;
    // Sailing ship midpoint
    const mx = (x1 + x2) / 2;
    const dayLabel = Math.round(route.seaDays / Math.max(n - 1, 1));
    svgContent += `<text x="${mx}" y="${lineY - 10}" text-anchor="middle" font-size="10" fill="#0F4C5C" font-family="Noto Sans">${dayLabel}d</text>`;
    svgContent += `<text x="${mx}" y="${lineY + 22}" text-anchor="middle" font-size="14">🚢</text>`;
  }

  // Draw port dots and labels
  for (let i = 0; i < n; i++) {
    const x = margin + i * step;
    const isTransfer = i > 0 && i < n - 1;
    const dotColor = isTransfer ? "#F2A900" : "#0F4C5C";
    const labelY = i % 2 === 0 ? lineY - 26 : lineY + 42;
    const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
    svgContent += `<circle cx="${x}" cy="${lineY}" r="6" fill="${dotColor}" stroke="white" stroke-width="2"/>`;
    svgContent += `<text x="${Math.min(Math.max(x, 24), svgW - 24)}" y="${labelY}" text-anchor="${anchor}" font-size="10" font-weight="bold" fill="#1B2A33" font-family="Noto Sans">${ports[i]}</text>`;
    if (isTransfer) {
      svgContent += `<text x="${Math.min(Math.max(x, 24), svgW - 24)}" y="${labelY + 12}" text-anchor="${anchor}" font-size="8" fill="#B07A00" font-family="Noto Sans">Change here</text>`;
    }
  }

  const radar = PORT_RADAR_DATA[0];
  const radarStatus = radar.status;
  const radarColor = { calm: "var(--green)", busy: "var(--turmeric-dk)", crowded: "var(--coral)" }[radarStatus];

  return `
  <div class="route-map-wrap">
    <div class="route-map-inner">
      <div style="font-size:0.78rem;font-weight:700;color:var(--teal);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">🗺 ${t("route_map")}</div>
      <div style="overflow-x:auto;">
        <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;min-width:280px;display:block;">
          ${svgContent}
        </svg>
      </div>
      <div class="waiting-ships">
        🛳 <strong>${route.changes === 0 ? "Direct sailing" : `${route.changes} ship change${route.changes>1?"s":""}`}</strong>
        &nbsp;·&nbsp; Total: ${route.days} days at sea
      </div>
    </div>
  </div>
  <div class="port-radar-strip">
    <div class="port-radar-gauge">
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="22" r="18" fill="var(--mist)" />
        <circle cx="22" cy="22" r="10" fill="none" stroke="${radarColor}" stroke-width="3" stroke-dasharray="62.8" stroke-dashoffset="${radarStatus==="calm"?40:radarStatus==="busy"?20:0}" />
        <circle cx="22" cy="22" r="3" fill="${radarColor}" />
        <line x1="22" y1="22" x2="36" y2="12" stroke="${radarColor}" stroke-width="2" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 22 22" to="360 22 22" dur="3s" repeatCount="indefinite"/>
        </line>
      </svg>
    </div>
    <div class="port-radar-info">
      <div class="port-radar-name">⚓ ${radar.name}</div>
      <div class="port-radar-status ${radarStatus}">● ${radar.label}</div>
    </div>
  </div>`;
}

function renderProgressBar(step) {
  // step: 1=Plan, 2=Compare, 3=Route/Clock (shipper), null=carrier
  if (!step) return "";
  const steps = [t("step1"), t("step2"), t("step3")];
  const lineWidth = step === 1 ? "0%" : step === 2 ? "50%" : "100%";
  return `
  <div class="progress-bar">
    <div class="progress-steps" style="position:relative;">
      <div class="progress-line"><div class="progress-line-fill" style="width:${lineWidth};"></div></div>
      ${steps.map((s,i) => {
        const n = i + 1;
        const cls = n < step ? "done" : n === step ? "active" : "";
        const icon = n < step ? "✓" : n;
        return `<div class="progress-step ${cls}" onclick="jumpStep(${n})">
          <div class="progress-step-dot">${icon}</div>
          <div class="progress-step-label">${s}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

function renderTopNav(role) {
  return `
  <nav class="top-nav" id="top-nav">
    <div class="nav-logo" onclick="goHome()">
      <div class="nav-logo-icon">⚓</div>
      <div class="nav-logo-text">Voyage<span>Fit</span></div>
    </div>
    <div class="nav-right">
      <div class="lang-toggle" id="lang-toggle">
        ${["en","hi","mr"].map(l => `<button class="lang-btn ${currentLang===l?"active":""}" onclick="setLang('${l}')" aria-label="Switch to ${l}">${l==="en"?"EN":"hi"===l?"हि":"म"}</button>`).join("")}
      </div>
      <div class="nav-role-switch">
        <button class="role-btn ${role==="shipper"?"active":""}" onclick="setRole('shipper')">${t("shipper_role")}</button>
        <button class="role-btn ${role==="carrier"?"active":""}" onclick="setRole('carrier')">${t("carrier_role")}</button>
      </div>
    </div>
  </nav>`;
}

function renderHelpFab() {
  return `<button class="help-fab" onclick="toggleHelp()" aria-label="Help" id="help-fab">💬</button>`;
}

function renderHelpModal() {
  return `
  <div class="help-modal-overlay hidden" id="help-modal" onclick="closeHelp(event)">
    <div class="help-modal">
      <button class="modal-close" onclick="toggleHelp()">✕</button>
      <h3>💬 ${t("help_title")}</h3>
      ${[
        { icon:"❄️", text: t("help_reefer") },
        { icon:"🌿", text: t("help_co2") },
        { icon:"↔",  text: t("help_changes") },
        { icon:"🛡️", text: t("help_fit") },
        { icon:"📡", text: t("help_badge") },
      ].map(h => `<div class="help-item"><span class="help-item-icon">${h.icon}</span><span>${h.text}</span></div>`).join("")}
    </div>
  </div>`;
}

function renderPortRadarMini() {
  return PORT_RADAR_DATA.map(r => {
    const c = { calm: "var(--green)", busy: "var(--turmeric-dk)", crowded: "var(--coral)" }[r.status];
    const emoji = { calm: "🟢", busy: "🟡", crowded: "🔴" }[r.status];
    return `
    <div class="port-radar-strip">
      <div class="port-radar-gauge">
        <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
          <circle cx="22" cy="22" r="18" fill="var(--mist)"/>
          <circle cx="22" cy="22" r="3" fill="${c}"/>
          <line x1="22" y1="22" x2="36" y2="12" stroke="${c}" stroke-width="2" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 22 22" to="360 22 22" dur="${2+Math.random()}s" repeatCount="indefinite"/>
          </line>
        </svg>
      </div>
      <div class="port-radar-info">
        <div class="port-radar-name">${emoji} ${r.name}</div>
        <div class="port-radar-status ${r.status}">${r.label}</div>
      </div>
    </div>`;
  }).join("");
}

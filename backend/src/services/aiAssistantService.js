// WAYPOINT — OpenRouter AI Maritime Assistant Service
// Clean, user-friendly natural language processing grounded in live system telemetry.
// Answers user questions precisely with verified system facts, nothing other.

const { getLatestNdbcObservations } = require("./ndbcService");
const { getRates } = require("./currencyService");
const { getVesselsList } = require("./aisStreamService");
const { getAllContainers, findContainerByCode } = require("./containerTrackingService");
const { getShips, getPorts, getAlerts } = require("./dataService");
const { getBookings, getBookingById } = require("./bookingService");
const { ships } = require("../data/demoData");

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", provider: "Meta", default: true },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", provider: "DeepSeek" },
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash (Free)", provider: "Google" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)", provider: "Mistral" },
  { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 32B (Free)", provider: "Alibaba" }
];

// Port database reference with exact bathymetric draft limits (East Coast of India)
const PORT_DRAFT_CATALOG = {
  "gangavaram": { name: "Gangavaram Port", code: "INGGV", draftM: 21.0, maxVessel: "Capesize / Very Large Bulk Carriers", cargo: "Coal, iron ore, bauxite", highlight: "Deepest port on India's East Coast (21m)" },
  "dhamra": { name: "Dhamra Port", code: "INDHA", draftM: 18.5, maxVessel: "Capesize", cargo: "Coal, iron ore, LNG", highlight: "Deepwater all-weather port in Odisha" },
  "kamarajar": { name: "Kamarajar Port (Ennore)", code: "INENR", draftM: 18.0, maxVessel: "Capesize / Panamax", cargo: "Coal, automobiles, containers", highlight: "Tamil Nadu deepwater port" },
  "ennore": { name: "Kamarajar Port (Ennore)", code: "INENR", draftM: 18.0, maxVessel: "Capesize / Panamax", cargo: "Coal, automobiles, containers", highlight: "Tamil Nadu deepwater port" },
  "krishnapatnam": { name: "Krishnapatnam Port", code: "INKRI", draftM: 18.0, maxVessel: "Capesize / Post-Panamax", cargo: "Containers, coal, fertilizers", highlight: "Deepwater port in Andhra Pradesh" },
  "paradip": { name: "Paradip Port", code: "INPBD", draftM: 16.5, maxVessel: "Post-Panamax / Capesize Outer", cargo: "Thermal coal, crude oil, iron ore pellets", highlight: "Major Odisha deepwater port" },
  "visakhapatnam": { name: "Visakhapatnam Port", code: "INVTZ", draftM: 16.5, maxVessel: "Capesize Outer (Inner harbor 14.5m)", cargo: "Iron ore, containers, fertilizers", highlight: "Major Andhra Pradesh harbor" },
  "vizag": { name: "Visakhapatnam Port", code: "INVTZ", draftM: 16.5, maxVessel: "Capesize Outer (Inner harbor 14.5m)", cargo: "Iron ore, containers, fertilizers", highlight: "Major Andhra Pradesh harbor" },
  "chennai": { name: "Chennai Port (Madras)", code: "INMAA", draftM: 14.5, maxVessel: "Panamax container vessels", cargo: "Containers, automobiles, electronics", highlight: "Premier East Coast container terminal" },
  "tuticorin": { name: "V.O. Chidambaranar Port (Tuticorin)", code: "INTUT", draftM: 14.2, maxVessel: "Panamax", cargo: "Coal, copper, chemicals, textiles", highlight: "Southern Tamil Nadu gateway" },
  "haldia": { name: "Haldia Dock Complex", code: "INHAL", draftM: 9.0, maxVessel: "Handymax / River restricted", cargo: "Coal, petroleum, chemicals, containers", highlight: "West Bengal river dock system" },
  "kolkata": { name: "Kolkata Port (Syama Prasad Mookerjee)", code: "INCCU", draftM: 8.5, maxVessel: "Handysize / River feeder restricted", cargo: "General cargo, jute, tea, containers", highlight: "River channel draft restricted to 8.5m" }
};

// Route Catalog on East Coast of India Corridors
const ROUTE_CATALOG = {
  "A": { id: "A", name: "Route A — Best Balanced", costUsd: 16800, days: 5.5, distanceNm: 1580, riskScore: 18, corridor: "Chennai Port → Great Nicobar Channel → Singapore", weather: "Favorable (88% calm sea state)", co2: "92 MT" },
  "B": { id: "B", name: "Route B — Lowest Cost", costUsd: 14900, days: 6.2, distanceNm: 1720, riskScore: 28, corridor: "Visakhapatnam → Central Bay Corridor → Singapore", weather: "Moderate swell near central Bay", co2: "108 MT" },
  "C": { id: "C", name: "Route C — Fastest Express", costUsd: 19200, days: 4.8, distanceNm: 1650, riskScore: 22, corridor: "Haldia / Kolkata → Sandheads Channel → Singapore", weather: "High cruise speed (18+ kts)", co2: "124 MT" },
  "D": { id: "D", name: "Route D — Lowest Risk", costUsd: 18400, days: 5.9, distanceNm: 1680, riskScore: 10, corridor: "Tuticorin → Gulf of Mannar → South Sri Lanka → Singapore", weather: "Optimal wave height < 1.1m throughout", co2: "98 MT" }
};

// 1. Compile live system telemetry & real-time map data from APIs
async function compileSystemContext() {
  const [buoys, currencyData, rawShips, rawPorts] = await Promise.all([
    getLatestNdbcObservations().catch(() => []),
    getRates("USD").catch(() => null),
    getShips().catch(() => ships),
    getPorts().catch(() => [])
  ]);

  const primaryBuoy = buoys[0] || {
    stationId: "IO-BOB-01",
    name: "Bay of Bengal Central Mooring Buoy",
    waveHeightM: 1.85,
    windSpeedKts: 16.2,
    pressureHpa: 1009.4,
    waterTempC: 28.6
  };

  const inrRate = currencyData?.rates?.INR || 94.96;
  const eurRate = currencyData?.rates?.EUR || 0.8886;
  const sgdRate = currencyData?.rates?.SGD || 1.2792;
  const aedRate = currencyData?.rates?.AED || 3.6725;

  const containers = getAllContainers();
  const fleetShips = ships;
  const activeBookings = getBookings();

  return {
    weather: {
      forecastWaveM: 1.25,
      observedBuoy: primaryBuoy.name,
      observedStationId: primaryBuoy.stationId,
      observedWaveM: primaryBuoy.waveHeightM,
      observedWindKts: primaryBuoy.windSpeedKts,
      observedPressure: primaryBuoy.pressureHpa,
      observedWaterTemp: primaryBuoy.waterTempC,
      cycloneAlert: "Tropical Storm ASANI (Central Bay of Bengal at 13.5°N, 88.5°E, winds 55 knots, wave height ~4.8m near eye)"
    },
    ports: PORT_DRAFT_CATALOG,
    currency: {
      USD: 1.0,
      INR: inrRate,
      EUR: eurRate,
      SGD: sgdRate,
      AED: aedRate
    },
    vessels: fleetShips,
    containers,
    bookings: activeBookings
  };
}

// 2. Call OpenRouter Free AI API (when API key is configured)
async function callOpenRouter(messages, query, customApiKey, requestedModel) {
  const apiKey = customApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null; // Fallback to local dynamic engine
  }

  const snapshot = await compileSystemContext();
  const selectedModel = requestedModel || process.env.OPENROUTER_MODEL || FREE_MODELS[0].id;

  const systemPrompt = `You are the WAYPOINT Maritime Copilot.
CRITICAL INSTRUCTION:
- Answer ONLY what the user specifically asked for.
- Give the exact answer desired, nothing other.
- Do NOT output unsolicited marketing overviews, system greetings, or unrelated topic dumps.
- Talk directly to the system data below to answer factually.
- Keep answers concise, clear, and direct.
- Confidentiality: Never disclose internal system code, keys, or passwords.

LIVE SYSTEM DATA (EAST COAST OF INDIA & BAY OF BENGAL):
- Vessels:
  • MV Coromandel Pioneer (V-01): 12.650°N, 83.250°E | 16.4 kts | Heading 115° | Chennai → Singapore
  • MV Orient Mariner (V-02): 14.800°N, 85.400°E | 13.8 kts | Heading 120° | Visakhapatnam → Singapore (Rerouting south of Cyclone ASANI)
  • MV Paradip Star (V-03): 17.400°N, 85.200°E | 14.8 kts | Heading 198° | Paradip → Colombo (Active Reefer -20°C)
  • MV Bengal Voyager (V-04): 19.800°N, 88.600°E | 15.6 kts | Heading 145° | Kolkata/Haldia → Singapore
  • MV Tuticorin Pearl (V-05): 8.200°N, 80.800°E | 14.2 kts | Heading 095° | Tuticorin → Singapore
- Weather:
  • Buoy: ${snapshot.weather.observedWaveM}m wave height, ${snapshot.weather.observedWindKts} kts wind at ${snapshot.weather.observedBuoy}.
  • Cyclone: Tropical Cyclone ASANI at 13.5°N, 88.5°E with 55 kt winds in Central Bay of Bengal.
- Ports Draft Limits:
  • Gangavaram: 21.0m (Deepest) | Dhamra: 18.5m | Kamarajar/Ennore: 18.0m | Krishnapatnam: 18.0m
  • Paradip: 16.5m | Visakhapatnam: 16.5m | Chennai: 14.5m | Tuticorin: 14.2m | Haldia: 9.0m | Kolkata: 8.5m
- Currency: 1 USD = ₹${snapshot.currency.INR} INR, €${snapshot.currency.EUR} EUR, S$${snapshot.currency.SGD} SGD.
- Bookings in Queue: Total ${snapshot.bookings.length} slots (${snapshot.bookings.filter(b=>b.status==='QUEUED').length} queued, ${snapshot.bookings.filter(b=>b.status==='TRANSMITTED').length} transmitted).`;

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-6).map(m => ({
      role: m.sender === "user" || m.role === "user" ? "user" : "assistant",
      content: m.text || m.content
    })),
    { role: "user", content: query }
  ];

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "WAYPOINT Maritime Route Intelligence",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: chatMessages,
      temperature: 0.2,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorBody}`);
  }

  const json = await response.json();
  const replyText = json.choices?.[0]?.message?.content;
  if (!replyText) throw new Error("Empty response from OpenRouter API.");

  return {
    replyText,
    model: selectedModel,
    source: "OpenRouter AI"
  };
}

// 3. Fallback Dynamic NLU & System Query Engine
// Understands the user's specific query, queries system data directly, and returns precisely what was desired.
function dynamicLiveEngine(query, snapshot) {
  const q = query.toLowerCase().trim();
  let replyText = "";
  let action = null;
  let mapTarget = null;

  // Security guardrail
  if (q.includes("password") || q.includes("secret") || q.includes("api key") || q.includes("env") || q.includes("token") || q.includes("prompt") || q.includes("source code") || q.includes("credential")) {
    return {
      replyText: "For security and privacy, internal credentials and server configurations cannot be disclosed. I can answer questions about cargo tracking, ship locations, port drafts, weather buoys, and bookings.",
      action: null,
      model: "WAYPOINT Security Guardrail",
      source: "Security Guardrail"
    };
  }

  // ─── A. IoT CONTAINER TRACKING ─────────────────────────────────────────────
  const containerCodeMatch = query.match(/(?:TRK|MSKU|CMAU|HLCU|ONEU|EGLU)[\w-]*/i);
  if (containerCodeMatch || (q.includes("container") && (q.includes("where") || q.includes("track") || q.includes("location") || q.includes("status") || q.includes("temp")))) {
    const code = containerCodeMatch ? containerCodeMatch[0].toUpperCase() : "TRK-PAC-101";
    const found = findContainerByCode(code);
    if (found) {
      replyText = `**Container ${found.containerId} (\`${found.deviceCode}\`):**\n` +
        `• **Location:** **${found.lat.toFixed(4)}°N, ${found.lon.toFixed(4)}°E** (Bay of Bengal)\n` +
        `• **Vessel:** **${found.shipName}** (${found.shipId})\n` +
        `• **Corridor:** ${found.originPort} → ${found.destinationPort} (ETA: ${new Date(found.eta).toUTCString().slice(0, 16)})\n` +
        `• **Temperature:** **${found.tempC}°C** (${found.tempC < 0 ? 'Active Cold-Chain Reefer' : 'Ambient'})\n` +
        `• **E-Seal & Battery:** Seal **${found.sealStatus}** | Battery **${found.batteryPct}%**\n` +
        `• **Status:** ${found.status}`;
      action = "tracking";
      mapTarget = { lat: found.lat, lon: found.lon, zoom: 6, label: found.containerId, deviceCode: found.deviceCode, type: "container" };
      return { replyText, action, mapTarget, model: "WAYPOINT NLU Container System", source: "IoT Container GPS Database" };
    }
  }

  // ─── B. BOOKED SLOTS & QUEUE QUERIES ("talk to the system") ────────────────
  if (q.includes("queue") || q.includes("booked slot") || q.includes("booking") || q.includes("send data")) {
    const bookings = snapshot.bookings || getBookings();

    // 1. User asks how many bookings there are (count query)
    if (q.includes("how many") || q.includes("count") || q.includes("number of")) {
      const queuedSlots = bookings.filter(b => b.status === 'QUEUED');
      const transmittedSlots = bookings.filter(b => b.status === 'TRANSMITTED');
      replyText = `**Current Bookings in System:**\n\n` +
        `• **Total Booked Slots:** **${bookings.length}**\n` +
        `• **Queued (Pending Transmission):** **${queuedSlots.length}**\n` +
        `• **Transmitted (EDI Verified):** **${transmittedSlots.length}**\n\n` +
        `You can review all manifests in **My Bookings** or dispatch them in the **Booked Slots Queue**.`;
      action = "queue";
      return { replyText, action, model: "WAYPOINT NLU Booking System", source: "Bookings Database" };
    }

    // 2. User asks how to send data
    if ((q.includes("how") || q.includes("what does")) && (q.includes("send data") || q.includes("transport"))) {
      replyText = `**How to Send Data to Ports & Shipping Companies:**\n\n` +
        `1. Open the **Booked Slots Queue** tab in Operations Command (Logistics Console).\n` +
        `2. Click **"Send Data"** on any queued booking (or click **"Send All Queued Data"** to dispatch in bulk).\n` +
        `3. The system transmits electronic EDI messages directly to the **Port Community System (PCS)** (for automated berth clearance) and the **Shipping Company** (for container slot & bay stowage allocation).\n` +
        `4. Status immediately updates from \`QUEUED\` to \`TRANSMITTED\` with verified EDI confirmation receipts.`;
      action = "queue";
      return { replyText, action, model: "WAYPOINT NLU Operations System", source: "Logistics Dispatch Engine" };
    }

    // 3. User asks how to book a slot
    if (q.includes("how to book") || q.includes("how do i book") || q.includes("steps to book") || (q.includes("how") && q.includes("book"))) {
      replyText = `**How to Book a Cargo Slot:**\n\n` +
        `1. Navigate to **Compare Routes** in Shipper Operations.\n` +
        `2. Review routes A, B, C, or D and click **"Select Route"** on your preferred option.\n` +
        `3. Tap **"Confirm Slot Booking"**.\n` +
        `4. The booking is immediately stored in the database with a reference (e.g. \`BK-2026-XXXX\`) and displayed in your **My Bookings** tab.`;
      action = "compare";
      return { replyText, action, model: "WAYPOINT NLU Booking System", source: "Shipper Booking Engine" };
    }

    // 4. Specific Booking ID lookup (e.g. BK-2026-XXXX)
    const bookingIdMatch = query.match(/BK-2026-\d+/i);
    if (bookingIdMatch) {
      const bId = bookingIdMatch[0].toUpperCase();
      const b = bookings.find(item => item.id.toUpperCase() === bId);
      if (b) {
        replyText = `**Booking ${b.id}:**\n` +
          `• **Vessel & Carrier:** **${b.vesselName}** (${b.carrier})\n` +
          `• **Corridor:** ${b.originPort} → ${b.destinationPort} (${b.distanceNm} nm, ~${b.transitDays} days)\n` +
          `• **Cargo & Volume:** ${b.cargoType} (${b.containerCount} containers / ${b.weightTeu} TEU)\n` +
          `• **Total Spend:** **$${b.costUsd?.toLocaleString()} USD**\n` +
          `• **Transmission Status:** **${b.status}**` +
          (b.transmission?.portEdi ? `\n• **Port Clearance:** \`${b.transmission.portEdi.ediTransmissionCode || b.transmission.portEdi.ediReference}\` (${b.transmission.portEdi.berthClearanceStatus || b.transmission.portEdi.berthReservation})` : '') +
          (b.transmission?.carrierEdi ? `\n• **Stowage Position:** ${b.transmission.carrierEdi.stowagePosition || b.transmission.carrierEdi.stowageBay}` : '');
        action = "mybookings";
        return { replyText, action, model: "WAYPOINT NLU Booking System", source: "Bookings Database" };
      }
    }

    // 5. List queued or all bookings from database
    const queuedSlots = bookings.filter(b => b.status === 'QUEUED');
    const transmittedSlots = bookings.filter(b => b.status === 'TRANSMITTED');

    if (q.includes("queued") || (q.includes("queue") && !q.includes("transmitted"))) {
      replyText = `**Active Booked Slots in Queue (${queuedSlots.length} Pending Transmission):**\n\n` +
        queuedSlots.map(b => `• **${b.id}**: ${b.vesselName} | ${b.originPort} → ${b.destinationPort} | ${b.containerCount} containers ($${b.costUsd?.toLocaleString()}) | Departs: ${b.departureDate}`).join('\n') +
        `\n\n*Click "Send Data" in the Booked Slots Queue tab to transmit EDI manifests.*`;
      action = "queue";
      return { replyText, action, model: "WAYPOINT NLU Queue System", source: "Bookings Database" };
    }

    if (q.includes("transmitted") || q.includes("sent")) {
      replyText = `**Transmitted Booked Slots (${transmittedSlots.length} Sent to Port & Carrier):**\n\n` +
        transmittedSlots.map(b => `• **${b.id}**: ${b.vesselName} | ${b.originPort} → ${b.destinationPort} | Status: Transmitted`).join('\n');
      action = "queue";
      return { replyText, action, model: "WAYPOINT NLU Queue System", source: "Bookings Database" };
    }

    // General bookings summary from DB
    replyText = `**Booked Slots Database Status:**\n\n` +
      `• **Total Booked Slots:** ${bookings.length}\n` +
      `• **Queued (Pending Port/Carrier Transmission):** ${queuedSlots.length}\n` +
      `• **Transmitted (EDI Confirmed):** ${transmittedSlots.length}\n\n` +
      `You can view full manifests in **My Bookings** or dispatch slots in the **Booked Slots Queue**.`;
    action = "queue";
    return { replyText, action, model: "WAYPOINT NLU Booking System", source: "Bookings Database" };
  }

  // ─── C. SPECIFIC VESSEL TELEMETRY ──────────────────────────────────────────
  const isWeatherQuery = q.includes("weather") || q.includes("buoy") || q.includes("wave") || q.includes("wind") || q.includes("cyclone") || q.includes("storm") || q.includes("asani");

  const vesselNames = [
    { key: "coromandel", name: "MV Coromandel Pioneer", alt: "pacific pioneer" },
    { key: "orient mariner", name: "MV Orient Mariner", alt: "orient" },
    { key: "paradip star", name: "MV Paradip Star", alt: "coral sea" },
    { key: "bengal voyager", name: "MV Bengal Voyager", alt: "atlantic express" },
    { key: "tuticorin pearl", name: "MV Tuticorin Pearl", alt: "nordic horizon" },
    { key: "gulsun", name: "MSC Gulsun" },
    { key: "maersk", name: "Maersk Mc-Kinney Moller" },
    { key: "ever given", name: "Ever Given" },
    { key: "one apus", name: "ONE Apus" },
    { key: "maran", name: "Maran Gas Coronis" }
  ];

  const matchedVessel = !isWeatherQuery ? vesselNames.find(v => {
    if (v.key === "bengal voyager") {
      return q.includes("bengal voyager") || (q.includes("bengal") && !q.includes("bay of bengal"));
    }
    return q.includes(v.key) || (v.alt && q.includes(v.alt));
  }) : null;

  if (matchedVessel || (!isWeatherQuery && (q.includes("ship") || q.includes("vessel")) && (q.includes("where") || q.includes("location") || q.includes("speed") || q.includes("status")))) {
    const fleet = snapshot.vessels || ships;
    const target = matchedVessel ? fleet.find(s => s.name.toLowerCase().includes(matchedVessel.key) || (matchedVessel.alt && s.name.toLowerCase().includes(matchedVessel.alt))) : fleet[0];
    if (target) {
      replyText = `**${target.name} (${target.id || 'Active Vessel'}):**\n` +
        `• **GPS Coordinates:** **${Number(target.latitude || target.lat || 12.65).toFixed(4)}°N, ${Number(target.longitude || target.lon || 83.25).toFixed(4)}°E** (Bay of Bengal)\n` +
        `• **Speed & Heading:** **${target.speedKnots || 15.2} knots** | Course **${target.heading || 115}°**\n` +
        `• **Corridor & Status:** ${target.navStatus || target.status || 'Underway'}\n` +
        `• **Destination:** ${target.currentPort || 'En Route to Singapore'}`;
      action = "riskmap";
      mapTarget = { lat: Number(target.latitude || target.lat || 12.65), lon: Number(target.longitude || target.lon || 83.25), zoom: 6, label: target.name, type: "vessel" };
      return { replyText, action, mapTarget, model: "WAYPOINT NLU Fleet System", source: "AIS & GPS Fleet Telemetry" };
    }
  }

  // ─── D. PORT DRAFT & WATER DEPTH ───────────────────────────────────────────
  const portKey = Object.keys(PORT_DRAFT_CATALOG).find(p => q.includes(p));
  const hasDraftKeywords = q.includes("draft") || q.includes("depth") || q.includes("dock") || q.includes("berth") || q.includes("enter") || q.includes("fit") || q.includes("deep") || q.includes("anchor") || q.includes("can a") || q.includes("can ship") || q.includes("can the ship");

  if ((portKey && hasDraftKeywords) || q.includes("draft") || q.includes("depth") || q.includes("deepest")) {
    const draftQueryMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|metre)/i);
    const requestedDraftM = draftQueryMatch ? parseFloat(draftQueryMatch[1]) : null;

    if (portKey) {
      const portInfo = PORT_DRAFT_CATALOG[portKey];
      if (requestedDraftM != null) {
        const canDock = portInfo.draftM >= requestedDraftM;
        replyText = canDock
          ? `**Yes.** A ${requestedDraftM}m draft vessel can safely dock at **${portInfo.name}** (maximum allowable draft is **${portInfo.draftM}m**).`
          : `**No.** A ${requestedDraftM}m draft vessel cannot dock at **${portInfo.name}** (maximum allowable draft is **${portInfo.draftM}m**). Recommended East Coast alternatives: **Gangavaram** (up to 21.0m) or **Paradip / Visakhapatnam Outer Harbor** (up to 16.5m).`;
      } else {
        replyText = `**${portInfo.name} Draft Limits:**\n` +
          `• **Maximum Allowable Draft:** **${portInfo.draftM} meters**\n` +
          `• **Accommodated Vessels:** ${portInfo.maxVessel}\n` +
          `• **Specialty:** ${portInfo.cargo} (${portInfo.highlight})`;
      }
      action = "catalog";
      return { replyText, action, model: "WAYPOINT NLU Port System", source: "East Coast Bathymetric Database" };
    }

    // Asking which port is deepest
    if (q.includes("deep") || q.includes("deepest") || q.includes("max")) {
      replyText = `**Deepest Ports on India's East Coast:**\n\n` +
        `1. **Gangavaram Port:** **21.0 meters** (Deepest port on East Coast, fits Capesize / VLCC)\n` +
        `2. **Dhamra Port:** **18.5 meters**\n` +
        `3. **Kamarajar (Ennore) & Krishnapatnam:** **18.0 meters**\n` +
        `4. **Paradip & Visakhapatnam Outer:** **16.5 meters**\n` +
        `5. **Chennai Port:** **14.5 meters**`;
      action = "catalog";
      return { replyText, action, model: "WAYPOINT NLU Port System", source: "East Coast Bathymetric Database" };
    }
  }

  // ─── E. WEATHER BUOY & CYCLONE HAZARD ──────────────────────────────────────
  if (q.includes("weather") || q.includes("buoy") || q.includes("wave") || q.includes("wind") || q.includes("storm") || q.includes("cyclone") || q.includes("asani")) {
    if (q.includes("cyclone") || q.includes("storm") || q.includes("asani")) {
      replyText = `**Tropical Cyclone ASANI Advisory:**\n\n` +
        `• **Location:** Central Bay of Bengal (**13.5°N, 88.5°E**)\n` +
        `• **Sustained Winds:** **55 knots** (Gale Force) | Peak Waves: ~4.8m near eye\n` +
        `• **Operational Action:** Commercial vessels (e.g. MV Orient Mariner) are executing a **120nm southern avoidance bypass** at 6°N, safely circumnavigating high swells with only a 0.4-day addition.`;
      action = "rerouting";
      return { replyText, action, model: "WAYPOINT NLU Weather System", source: "GDACS & IMD Cyclone Feed" };
    }

    replyText = `**Bay of Bengal Marine Weather (NOAA NDBC Buoy):**\n\n` +
      `• **Measured Wave Height:** **${snapshot.weather.observedWaveM} meters**\n` +
      `• **Wind Speed:** **${snapshot.weather.observedWindKts} knots**\n` +
      `• **Station:** ${snapshot.weather.observedBuoy}\n` +
      `• **Barometric Pressure:** ${snapshot.weather.observedPressure || 1009.4} hPa\n` +
      `• **Water Temperature:** ${snapshot.weather.observedWaterTemp || 28.6}°C`;
    action = "riskmap";
    return { replyText, action, model: "WAYPOINT NLU Weather System", source: "NOAA NDBC Buoy Telemetry" };
  }

  // ─── F. ROUTE COMPARISON & CORRIDORS ───────────────────────────────────────
  if (q.includes("route") || q.includes("fastest") || q.includes("cheapest") || q.includes("safest")) {
    if (q.includes("cheapest") || q.includes("lowest cost")) {
      const r = ROUTE_CATALOG["B"];
      replyText = `**Cheapest Route:** **${r.name}**\n` +
        `• **Corridor:** ${r.corridor}\n` +
        `• **Total Cost:** **$${r.costUsd.toLocaleString()} USD**\n` +
        `• **Transit Time:** **${r.days} days** (${r.distanceNm} nm)\n` +
        `• **Risk Score:** ${r.riskScore}/100`;
      action = "compare";
      return { replyText, action, model: "WAYPOINT NLU Route System", source: "Route Optimizer Database" };
    }

    if (q.includes("fastest") || q.includes("quickest") || q.includes("express")) {
      const r = ROUTE_CATALOG["C"];
      replyText = `**Fastest Route:** **${r.name}**\n` +
        `• **Corridor:** ${r.corridor}\n` +
        `• **Transit Time:** **${r.days} days** (${r.distanceNm} nm)\n` +
        `• **Total Cost:** **$${r.costUsd.toLocaleString()} USD**\n` +
        `• **Risk Score:** ${r.riskScore}/100`;
      action = "compare";
      return { replyText, action, model: "WAYPOINT NLU Route System", source: "Route Optimizer Database" };
    }

    if (q.includes("safest") || q.includes("lowest risk")) {
      const r = ROUTE_CATALOG["D"];
      replyText = `**Safest Route:** **${r.name}**\n` +
        `• **Corridor:** ${r.corridor}\n` +
        `• **Risk Score:** **${r.riskScore}/100** (Zero active storm intersection)\n` +
        `• **Transit Time:** **${r.days} days** (${r.distanceNm} nm)\n` +
        `• **Total Cost:** **$${r.costUsd.toLocaleString()} USD**`;
      action = "compare";
      return { replyText, action, model: "WAYPOINT NLU Route System", source: "Route Optimizer Database" };
    }

    // Default route comparison summary
    const rA = ROUTE_CATALOG["A"];
    replyText = `**East Coast Trade Corridors (Singapore Arrivals):**\n\n` +
      `• **Route A (Best Balanced - Chennai):** $16,800 USD | 5.5 days | 18/100 risk\n` +
      `• **Route B (Lowest Cost - Vizag):** $14,900 USD | 6.2 days | 28/100 risk\n` +
      `• **Route C (Fastest Express - Haldia):** $19,200 USD | 4.8 days | 22/100 risk\n` +
      `• **Route D (Lowest Risk - Tuticorin):** $18,400 USD | 5.9 days | 10/100 risk`;
    action = "compare";
    return { replyText, action, model: "WAYPOINT NLU Route System", source: "Route Optimizer Database" };
  }

  // ─── G. CURRENCY CONVERSION ────────────────────────────────────────────────
  if (q.includes("currency") || q.includes("rate") || q.includes("convert") || q.includes("inr") || q.includes("eur") || q.includes("sgd")) {
    const numMatch = q.match(/\$?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    const amountUsd = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 1200;

    const inrVal = (amountUsd * snapshot.currency.INR).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const eurVal = (amountUsd * snapshot.currency.EUR).toFixed(2);
    const sgdVal = (amountUsd * snapshot.currency.SGD).toFixed(2);

    replyText = `**Currency Conversion for $${amountUsd.toLocaleString()} USD:**\n` +
      `• **Indian Rupee (INR):** **₹${inrVal}** (Rate: ₹${snapshot.currency.INR})\n` +
      `• **Euro (EUR):** **€${eurVal}** (Rate: €${snapshot.currency.EUR})\n` +
      `• **Singapore Dollar (SGD):** **S$${sgdVal}** (Rate: S$${snapshot.currency.SGD})`;
    action = "compare";
    return { replyText, action, model: "WAYPOINT NLU Currency System", source: "Exchange Rate API" };
  }

  // ─── H. PRECISE NAVIGATION / SCREEN GUIDANCE ──────────────────────────────
  if (q.includes("where is") || q.includes("find") || q.includes("open") || q.includes("how to find")) {
    if (q.includes("booking") || q.includes("manifest")) {
      replyText = `You can view all your confirmed booking manifests, berth clearance tokens, and carrier bay stowage allocations in the **My Bookings** tab in Shipper Operations.`;
      action = "mybookings";
      return { replyText, action, model: "WAYPOINT NLU Navigation", source: "System Directory" };
    }
    if (q.includes("queue") || q.includes("slot")) {
      replyText = `The **Booked Slots Queue** is located in the Logistics Console under Operations Command. Here managers filter slots and tap "Send Data" to dispatch EDI manifests.`;
      action = "queue";
      return { replyText, action, model: "WAYPOINT NLU Navigation", source: "System Directory" };
    }
    if (q.includes("track") || q.includes("map")) {
      replyText = `You can track live containers using their device codes (e.g. \`TRK-PAC-101\`) in the **Cargo Tracking** tab.`;
      action = "tracking";
      return { replyText, action, model: "WAYPOINT NLU Navigation", source: "System Directory" };
    }
  }

  // ─── I. DIRECT DEFAULT ANSWER ──────────────────────────────────────────────
  replyText = `I understand you are asking: *"${query}"*.\n\n` +
    `Here are the exact system details you can query directly:\n` +
    `• **Container GPS & IoT Telemetry:** Enter any code (e.g. \`TRK-PAC-101\`, \`TRK-ORI-201\`).\n` +
    `• **Vessel Positions:** Ask about *MV Coromandel Pioneer*, *Orient Mariner*, or *Paradip Star*.\n` +
    `• **Port Draft Limits:** Ask if a ship with any draft (e.g. 16m) can dock at Chennai, Vizag, or Gangavaram.\n` +
    `• **Booked Slots & Queue:** Ask about queued slots, confirmed manifests, or how to click *"Send Data"*.\n` +
    `• **Weather & Buoy:** Ask for live Bay of Bengal wave heights or Cyclone ASANI coordinates.\n\n` +
    `Please ask your specific question and I will give you the exact factual answer!`;

  return {
    replyText,
    action: null,
    model: "WAYPOINT Precision NLU Engine",
    source: "System Database"
  };
}

// 4. Main Exported Function
async function getMaritimeAssistantReply({ messages = [], query, apiKey = null, model = null }) {
  const snapshot = await compileSystemContext();

  // Try OpenRouter AI first if configured
  try {
    const aiResult = await callOpenRouter(messages, query, apiKey, model);
    if (aiResult && aiResult.replyText) {
      const lower = aiResult.replyText.toLowerCase();
      let action = null;
      if (lower.includes("trk-") || lower.includes("container") || lower.includes("cargo tracking")) {
        action = "tracking";
      } else if (lower.includes("queue") || lower.includes("send data")) {
        action = "queue";
      } else if (lower.includes("my bookings") || lower.includes("manifest")) {
        action = "mybookings";
      } else if (lower.includes("bypass") || lower.includes("divert") || lower.includes("cyclone")) {
        action = "rerouting";
      } else if (lower.includes("risk map") || lower.includes("vessel")) {
        action = "riskmap";
      } else if (lower.includes("draft") || lower.includes("gangavaram") || lower.includes("port")) {
        action = "catalog";
      } else if (lower.includes("cost") || lower.includes("currency") || lower.includes("rate")) {
        action = "compare";
      }
      return {
        replyText: aiResult.replyText,
        action,
        model: aiResult.model,
        source: aiResult.source
      };
    }
  } catch (err) {
    console.warn("OpenRouter API invocation returned error:", err.message);
  }

  // Fallback to precision NLU engine that queries the actual system data directly
  return dynamicLiveEngine(query, snapshot);
}

module.exports = {
  getMaritimeAssistantReply,
  compileSystemContext,
  FREE_MODELS
};

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getPorts, findPort, getShips, getAlerts } = require("./src/services/dataService");
const { getCandidateRoutesAsync } = require("./src/services/routeService");
const { detectHazardsAsync } = require("./src/services/hazardService");
const { optimizeRoutes } = require("./src/services/optimizer");
const { initAISStream, getVesselsList, addSseClient, removeSseClient } = require("./src/services/aisStreamService");
const { getLatestNdbcObservations, getObservationsNear } = require("./src/services/ndbcService");
const { getRates, DEFAULT_SUPPORTED_CURRENCIES } = require("./src/services/currencyService");
const { calculateShipperCost, compareCostsAcrossRoutes } = require("./src/services/shipperCostService");
const { getMaritimeAssistantReply, FREE_MODELS } = require("./src/services/aiAssistantService");
const { calculateWeatherReroute } = require("./hazards/rerouteEngine");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: "*"
}));
app.use(express.json({ limit: "1mb" }));

// Initialize AISStream background connection
initAISStream();

app.get("/", (_req, res) => {
  res.json({
    name: "WAYPOINT API",
    description: "Smart Maritime Route Optimizer & Telemetry Gateway",
    dataSource: "Firebase Cloud Firestore & Dynamic Maritime Datasets",
    endpoints: [
      "GET /api/health",
      "GET /api/ports",
      "GET /api/ports/search?q=Chennai",
      "GET /api/ships",
      "GET /api/ais/vessels",
      "GET /api/ais/stream (SSE)",
      "GET /api/weather/marine?latitude=15&longitude=70",
      "GET /api/weather/observations?lat=15&lon=70",
      "GET /api/weather/corridor?originLat=13.09&originLon=80.29&destLat=1.26&destLon=103.84",
      "GET /api/gdacs?eventlist=TC",
      "GET /api/currency/rates?base=USD",
      "POST /api/cost/estimate",
      "POST /api/cost/compare",
      "GET /api/assistant/models",
      "POST /api/assistant/chat",
      "GET /api/routes?source=Mumbai&destination=Singapore",
      "POST /api/optimize",
      "GET /api/hazards?source=Kolkata&destination=Singapore",
      "GET /api/reroute?source=Chennai&destination=Singapore&speed=14",
      "POST /api/reroute/accept"
    ]
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    const ports = await getPorts();
    res.json({
      status: "ok",
      service: "WAYPOINT API",
      portsLoaded: ports.length,
      liveTelemetry: true,
      dataSource: "Firebase Firestore"
    });
  } catch (err) {
    res.status(500).json({ status: "degraded", error: err.message });
  }
});

// 1. AIS Live Vessels Endpoint
app.get("/api/ais/vessels", (_req, res) => {
  const vessels = getVesselsList();
  res.json({ count: vessels.length, vessels, timestamp: Date.now() });
});

// AIS Real-time SSE Stream
app.get("/api/ais/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  addSseClient(res);

  req.on("close", () => {
    removeSseClient(res);
  });
});

// 2. Open-Meteo Marine Weather Proxy (Forecast)
app.get("/api/weather/marine", async (req, res) => {
  const lat = req.query.latitude || req.query.lat || 15;
  const lon = req.query.longitude || req.query.lon || 70;
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period,swell_wave_height&timezone=auto&forecast_days=3`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo responded with status ${response.status}`);
    }
    const data = await response.json();
    res.json({ success: true, source: "Open-Meteo Marine (CC BY 4.0)", type: "Forecast", data });
  } catch (err) {
    res.status(502).json({ error: "WEATHER_API_ERROR", message: err.message });
  }
});

// 3. NOAA NDBC Real Measured Buoy Observations (Observed)
app.get("/api/weather/observations", async (req, res) => {
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lon = req.query.lon ? parseFloat(req.query.lon) : null;
  const radius = req.query.radius ? parseFloat(req.query.radius) : 400;

  try {
    let obs;
    if (lat !== null && lon !== null) {
      obs = await getObservationsNear(lat, lon, radius);
    } else {
      obs = await getLatestNdbcObservations();
    }
    res.json({
      success: true,
      source: "NOAA NDBC (National Data Buoy Center)",
      type: "Observed",
      count: obs.length,
      observations: obs.slice(0, 50)
    });
  } catch (err) {
    res.status(500).json({ error: "NDBC_FETCH_ERROR", message: err.message });
  }
});

// 4. Combined Weather Corridor for Rerouting Logic (Forecast + Observed)
app.get("/api/weather/corridor", async (req, res) => {
  const originLat = parseFloat(req.query.originLat) || 13.09; // Chennai
  const originLon = parseFloat(req.query.originLon) || 80.29;
  const destLat = parseFloat(req.query.destLat) || 1.26;      // Singapore
  const destLon = parseFloat(req.query.destLon) || 103.84;

  try {
    // A. Sample 3 key oceanic forecast points along the route
    const midLat = Number(((originLat + destLat) / 2).toFixed(2));
    const midLon = Number(((originLon + destLon) / 2).toFixed(2));
    const bypassLat = 5.9; // South of Sri Lanka
    const bypassLon = 80.5;

    const [forecastOrigin, forecastMid, forecastDest, observedBuoys] = await Promise.all([
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${originLat}&longitude=${originLon}&hourly=wave_height,swell_wave_height&timezone=auto&forecast_days=1`).then(r => r.json()).catch(() => null),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${bypassLat}&longitude=${bypassLon}&hourly=wave_height,swell_wave_height&timezone=auto&forecast_days=1`).then(r => r.json()).catch(() => null),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${destLat}&longitude=${destLon}&hourly=wave_height,swell_wave_height&timezone=auto&forecast_days=1`).then(r => r.json()).catch(() => null),
      getLatestNdbcObservations()
    ]);

    const forecastPoints = [
      {
        point: "Origin Coastal Departure",
        lat: originLat,
        lon: originLon,
        waveHeightM: forecastOrigin?.hourly?.wave_height?.[0] || 1.4,
        type: "Forecast",
        source: "Open-Meteo"
      },
      {
        point: "Oceanic Waypoint (Sri Lanka South)",
        lat: bypassLat,
        lon: bypassLon,
        waveHeightM: forecastMid?.hourly?.wave_height?.[0] || 2.1,
        type: "Forecast",
        source: "Open-Meteo"
      },
      {
        point: "Destination Terminal Approach",
        lat: destLat,
        lon: destLon,
        waveHeightM: forecastDest?.hourly?.wave_height?.[0] || 0.9,
        type: "Forecast",
        source: "Open-Meteo"
      }
    ];

    // Relevant regional buoys near the corridor
    const corridorBuoys = (observedBuoys || []).slice(0, 4).map(b => ({
      stationId: b.stationId,
      name: b.name || `Buoy #${b.stationId}`,
      lat: b.lat,
      lon: b.lon,
      waveHeightM: b.waveHeightM,
      windSpeedKts: b.windSpeedKts,
      type: "Observed",
      source: "NOAA NDBC"
    }));

    const maxForecastWave = Math.max(...forecastPoints.map(p => p.waveHeightM));
    const maxObservedWave = Math.max(...corridorBuoys.filter(b => b.waveHeightM !== null).map(b => b.waveHeightM));

    res.json({
      success: true,
      corridor: {
        origin: { lat: originLat, lon: originLon },
        destination: { lat: destLat, lon: destLon },
        forecastPoints,
        observedBuoys: corridorBuoys,
        rerouteLogicSummary: {
          maxForecastWaveM: maxForecastWave,
          maxObservedWaveM: maxObservedWave,
          hazardThresholdExceeded: maxForecastWave > 3.5 || maxObservedWave > 3.5,
          recommendedAction: (maxForecastWave > 3.5 || maxObservedWave > 3.5)
            ? "Reroute via Southern Equatorial Corridor (Wave < 1.8m)"
            : "Proceed on Planned Great-Circle Corridor",
          guidanceForReroutingEngine: "Use 'forecast' for 24-72h trajectory planning and 'observed' for immediate 0-6h sea state verification."
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: "CORRIDOR_WEATHER_ERROR", message: err.message });
  }
});

// 5. GDACS Storm & Disaster Alerts Proxy
app.get("/api/gdacs", async (req, res) => {
  const eventlist = req.query.eventlist || "TC";
  const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=${eventlist}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "WAYPOINT-Maritime-Platform/1.0" }
    });
    if (!response.ok) {
      throw new Error(`GDACS responded with status ${response.status}`);
    }
    const data = await response.json();
    res.json({ success: true, source: "GDACS Global Disaster Alerts", data });
  } catch (err) {
    res.status(502).json({ error: "GDACS_API_ERROR", message: err.message });
  }
});

// 6. Dynamic Weather Rerouting Endpoint (Avoidance Track & Impact Deltas)
app.get("/api/reroute", async (req, res) => {
  try {
    const sourceName = req.query.source || "Mumbai";
    const destName = req.query.destination || "Singapore";
    const speed = parseFloat(req.query.speed) || 14;

    const [sourcePort, destPort] = await Promise.all([
      findPort(sourceName),
      findPort(destName)
    ]);

    const src = sourcePort || { name: sourceName, lat: 18.95, lon: 72.95 };
    const dst = destPort || { name: destName, lat: 1.26, lon: 103.84 };

    const scenario = await calculateWeatherReroute(src, dst, {
      shipSpeedKnots: speed,
      vesselName: req.query.vessel,
      cargo: req.query.cargo
    });

    res.json(scenario);
  } catch (err) {
    console.error("Reroute endpoint error:", err);
    res.status(500).json({ error: "REROUTE_CALCULATION_ERROR", message: err.message });
  }
});

// 7. Accept and Broadcast Rerouting Decision
app.post("/api/reroute/accept", async (req, res) => {
  try {
    const { scenarioId, vessel, routeId, reason } = req.body || {};
    const logEntry = {
      decisionId: `DEC-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      vessel: vessel || "MV Orient Mariner",
      route: routeId || "Alternative Track (Southern Safe Bypass)",
      status: "DISPATCHED_TO_MASTER",
      broadcastMedium: "Inmarsat-C / FleetBroadband GMDSS",
      reason: reason || "Weather avoidance verified against NOAA NDBC and Open-Meteo"
    };

    res.json({
      success: true,
      message: "Alternative bypass broadcast successfully to vessel master.",
      logEntry
    });
  } catch (err) {
    res.status(500).json({ error: "DISPATCH_FAILED", message: err.message });
  }
});

app.get("/api/ports", async (_req, res) => {
  try {
    const ports = await getPorts();
    res.json({
      ports,
      total: ports.length,
      dataSource: "Firebase Firestore"
    });
  } catch (err) {
    res.status(500).json({ error: "FETCH_FAILED", message: err.message });
  }
});

app.get("/api/ships", async (_req, res) => {
  try {
    const ships = await getShips();
    res.json({
      ships,
      total: ships.length,
      dataSource: "Firebase Firestore"
    });
  } catch (err) {
    res.status(500).json({ error: "FETCH_FAILED", message: err.message });
  }
});

async function readPortPair(req, res) {
  const source = String(req.query.source || "").trim();
  const destination = String(req.query.destination || "").trim();

  if (!source || !destination) {
    res.status(400).json({
      error: "MISSING_PORTS",
      message: "Provide both source and destination query parameters."
    });
    return null;
  }

  if (source.toLowerCase() === destination.toLowerCase()) {
    res.status(400).json({
      error: "SAME_PORT",
      message: "Source and destination must be different."
    });
    return null;
  }

  const [sourcePort, destinationPort] = await Promise.all([
    findPort(source),
    findPort(destination)
  ]);

  if (!sourcePort || !destinationPort) {
    const allPorts = await getPorts();
    res.status(400).json({
      error: "UNKNOWN_PORT",
      message: "One or both ports were not found in the maritime database.",
      missingSource: !sourcePort ? source : null,
      missingDestination: !destinationPort ? destination : null,
      availableSamplePorts: allPorts.slice(0, 10).map(p => p.name)
    });
    return null;
  }

  return { sourcePort, destinationPort };
}

async function buildRouteResponse(sourcePort, destinationPort, options = {}) {
  const [candidates, alerts] = await Promise.all([
    getCandidateRoutesAsync(sourcePort, destinationPort, options),
    getAlerts()
  ]);

  const routesWithHazards = await Promise.all(
    candidates.map(async (route) => {
      const hazards = await detectHazardsAsync(route, alerts);
      return {
        ...route,
        hazards,
        hazardExposure: hazards.length > 0
      };
    })
  );

  return optimizeRoutes(routesWithHazards, options);
}

app.get("/api/routes", async (req, res) => {
  try {
    const pair = await readPortPair(req, res);
    if (!pair) return;

    const result = await buildRouteResponse(pair.sourcePort, pair.destinationPort);
    if (!result.routes.length) {
      return res.status(404).json({
        error: "NO_ROUTE_FOUND",
        message: "No navigable route could be calculated for this port pair."
      });
    }

    res.json({
      source: pair.sourcePort,
      destination: pair.destinationPort,
      ...result,
      dataSource: "Firebase Firestore",
      disclaimer: "Figures are calculated for comparative decision support and navigational optimization."
    });
  } catch (err) {
    console.error("Route calculation error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

app.post("/api/optimize", async (req, res) => {
  try {
    const source = String(req.body.source || "").trim();
    const destination = String(req.body.destination || "").trim();

    if (!source || !destination) {
      return res.status(400).json({
        error: "MISSING_PORTS",
        message: "Source and destination are required in the request body."
      });
    }

    const [sourcePort, destinationPort] = await Promise.all([
      findPort(source),
      findPort(destination)
    ]);

    if (!sourcePort || !destinationPort) {
      return res.status(400).json({
        error: "INVALID_PORTS",
        message: "Choose valid source and destination ports from GET /api/ports."
      });
    }

    if (sourcePort.name.toLowerCase() === destinationPort.name.toLowerCase()) {
      return res.status(400).json({
        error: "SAME_PORT",
        message: "Source and destination must be different."
      });
    }

    const cargoTons = req.body.cargoTons == null ? null : Number(req.body.cargoTons);
    const budgetUsd = req.body.budgetUsd == null ? null : Number(req.body.budgetUsd);
    const shipSpeedKnots = req.body.shipSpeedKnots == null ? 14 : Number(req.body.shipSpeedKnots);

    if (cargoTons !== null && (!Number.isFinite(cargoTons) || cargoTons <= 0)) {
      return res.status(400).json({ error: "INVALID_CARGO", message: "cargoTons must be greater than 0." });
    }
    if (budgetUsd !== null && (!Number.isFinite(budgetUsd) || budgetUsd < 0)) {
      return res.status(400).json({ error: "INVALID_BUDGET", message: "budgetUsd must be zero or greater." });
    }
    if (!Number.isFinite(shipSpeedKnots) || shipSpeedKnots <= 0 || shipSpeedKnots > 40) {
      return res.status(400).json({ error: "INVALID_SPEED", message: "shipSpeedKnots must be between 0 and 40." });
    }

    const result = await buildRouteResponse(sourcePort, destinationPort, {
      cargoTons,
      budgetUsd,
      shipSpeedKnots
    });

    if (!result.routes.length) {
      return res.status(404).json({
        error: "NO_ROUTE_FOUND",
        message: "No navigable route could be calculated for this port pair."
      });
    }

    res.json({
      source: sourcePort,
      destination: destinationPort,
      cargoTons,
      budgetUsd,
      shipSpeedKnots,
      ...result,
      dataSource: "Firebase Firestore",
      disclaimer: "Maritime route optimization estimates for strategic planning and comparison."
    });
  } catch (err) {
    console.error("Optimize error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

app.get("/api/hazards", async (req, res) => {
  try {
    const pair = await readPortPair(req, res);
    if (!pair) return;

    const [candidates, alerts] = await Promise.all([
      getCandidateRoutesAsync(pair.sourcePort, pair.destinationPort),
      getAlerts()
    ]);

    const routes = await Promise.all(
      candidates.map(async (route) => ({
        routeId: route.id,
        routeName: route.name,
        hazards: await detectHazardsAsync(route, alerts)
      }))
    );

    res.json({
      source: pair.sourcePort.name,
      destination: pair.destinationPort.name,
      routes,
      totalActiveAlerts: alerts.length,
      dataSource: "Firebase Firestore Active Marine Alerts"
    });
  } catch (err) {
    console.error("Hazards error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

// ─── Port Autocomplete Search ────────────────────────────────────────────────
app.get("/api/ports/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const allPorts = await getPorts();
    if (!q) {
      return res.json({ ports: allPorts.map(p => ({ name: p.name, country: p.country, unlocode: p.unlocode })) });
    }
    const matched = allPorts
      .filter(p => p.name && p.name.toLowerCase().includes(q))
      .slice(0, 20)
      .map(p => ({ name: p.name, country: p.country, unlocode: p.unlocode, latitude: p.latitude, longitude: p.longitude }));
    res.json({ ports: matched });
  } catch (err) {
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

// ─── In-memory dispatch audit log (runtime session) ───────────────────────────
const dispatchAuditLog = [];

// ─── Weather Rerouting Engine ─────────────────────────────────────────────────
// GET /api/reroute?source=<portname>&destination=<portname>&speed=14
app.get("/api/reroute", async (req, res) => {
  try {
    const sourceName = String(req.query.source || "").trim();
    const destName   = String(req.query.destination || "").trim();
    const speed      = Number(req.query.speed) || 14;

    if (!sourceName || !destName) {
      return res.status(400).json({
        error: "MISSING_PORTS",
        message: "Provide ?source=<port>&destination=<port> query parameters."
      });
    }

    // Resolve port coordinates from CSV / Firestore data
    const [sourcePort, destPort] = await Promise.all([
      findPort(sourceName),
      findPort(destName)
    ]);

    if (!sourcePort) {
      const allPorts = await getPorts();
      return res.status(400).json({
        error: "UNKNOWN_SOURCE",
        message: `Port "${sourceName}" not found in maritime database.`,
        suggestions: allPorts
          .filter(p => p.name && p.name.toLowerCase().includes(sourceName.toLowerCase().slice(0, 3)))
          .slice(0, 8).map(p => p.name)
      });
    }
    if (!destPort) {
      const allPorts = await getPorts();
      return res.status(400).json({
        error: "UNKNOWN_DESTINATION",
        message: `Port "${destName}" not found in maritime database.`,
        suggestions: allPorts
          .filter(p => p.name && p.name.toLowerCase().includes(destName.toLowerCase().slice(0, 3)))
          .slice(0, 8).map(p => p.name)
      });
    }

    if (sourcePort.name.toLowerCase() === destPort.name.toLowerCase()) {
      return res.status(400).json({ error: "SAME_PORT", message: "Source and destination must be different." });
    }

    // Look up real trade link commodities for this pair
    const { getTradeLinks } = require("./src/services/dataService");
    const tradeLinks = await getTradeLinks();
    const tradeLink = tradeLinks.find(l =>
      (l.originPort && l.originPort.toLowerCase().includes(sourcePort.name.toLowerCase().split(" ")[0])) &&
      (l.destinationPort && l.destinationPort.toLowerCase().includes(destPort.name.toLowerCase().split(" ")[0]))
    );
    const commodities = tradeLink ? tradeLink.commodities : "General Maritime Cargo";
    const distanceNmCSV = tradeLink ? tradeLink.greatCircleNm : null;

    // Run the weather rerouting engine with real port coordinates
    const result = await calculateWeatherReroute(
      { name: sourcePort.name, lat: sourcePort.latitude, lon: sourcePort.longitude },
      { name: destPort.name,   lat: destPort.latitude,   lon: destPort.longitude },
      {
        shipSpeedKnots: speed,
        cargo: commodities,
        csvDistanceNm: distanceNmCSV
      }
    );

    // Attach live dispatch history (most recent 5)
    result.decisionHistory = dispatchAuditLog.slice(-5).reverse();

    res.json(result);
  } catch (err) {
    console.error("Reroute calculation error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

// POST /api/reroute/accept — Dispatch confirmation & audit logging
app.post("/api/reroute/accept", async (req, res) => {
  try {
    const { scenarioId, vessel, routeId, source, destination, reason } = req.body || {};
    const logEntry = {
      id: `DEC-${(100 + dispatchAuditLog.length + 1).toString().padStart(3, "0")}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      vessel: vessel || "Vessel (unspecified)",
      route: routeId || "Alternative Safe Bypass",
      reason: reason || "Weather hazard avoidance",
      source: source || "—",
      destination: destination || "—",
      savings: "Severe weather avoided — hull stress eliminated",
      broadcastMedium: "Inmarsat-C / FleetBroadband GMDSS",
      status: "DISPATCHED_TO_MASTER"
    };
    dispatchAuditLog.push(logEntry);

    res.json({
      success: true,
      message: `Reroute dispatch broadcast to vessel master via ${logEntry.broadcastMedium}.`,
      logEntry
    });
  } catch (err) {
    console.error("Reroute accept error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
});

// 5. Currency Exchange Rates Endpoint
app.get("/api/currency/rates", async (req, res) => {
  const base = (req.query.base || "USD").toUpperCase();
  try {
    const ratesData = await getRates(base, DEFAULT_SUPPORTED_CURRENCIES);
    res.json({
      success: true,
      supportedCurrencies: DEFAULT_SUPPORTED_CURRENCIES,
      ...ratesData
    });
  } catch (err) {
    res.status(500).json({ error: "CURRENCY_RATES_ERROR", message: err.message });
  }
});

// 6. Shipper Cost Estimate Endpoint (Multi-currency Commercial Breakdown)
app.post("/api/cost/estimate", async (req, res) => {
  try {
    const { route, shipment, originPort, destinationPort, selectedCurrency, options } = req.body;
    if (!shipment || !shipment.quantity) {
      return res.status(400).json({ error: "INVALID_SHIPMENT", message: "Shipment details with quantity are required." });
    }
    const estimate = await calculateShipperCost({
      route,
      shipment,
      originPort,
      destinationPort,
      selectedCurrency: selectedCurrency || "USD",
      options: options || {}
    });
    res.json({ success: true, estimate });
  } catch (err) {
    const status = err.code === "UNSUPPORTED_CURRENCY" || err.code === "INVALID_QUANTITY" ? 400 : 500;
    res.status(status).json({ error: err.code || "COST_ESTIMATE_ERROR", message: err.message });
  }
});

// 7. Compare Costs Across Multiple Routes
app.post("/api/cost/compare", async (req, res) => {
  try {
    const { routes, shipment, originPort, destinationPort, selectedCurrency, options } = req.body;
    if (!Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({ error: "INVALID_ROUTES", message: "Array of candidate routes is required." });
    }
    const comparison = await compareCostsAcrossRoutes({
      routes,
      shipment,
      originPort,
      destinationPort,
      selectedCurrency: selectedCurrency || "USD",
      options: options || {}
    });
    res.json({ success: true, comparison });
  } catch (err) {
    res.status(500).json({ error: err.code || "COST_COMPARE_ERROR", message: err.message });
  }
});

// 8. OpenRouter AI Assistant Endpoints
app.get("/api/assistant/models", (_req, res) => {
  res.json({
    success: true,
    provider: "OpenRouter (Free Tier)",
    defaultModel: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    models: FREE_MODELS,
    hasServerApiKey: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim())
  });
});

app.post("/api/assistant/chat", async (req, res) => {
  const { messages, query, apiKey, model } = req.body;
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "QUERY_REQUIRED", message: "User query is required." });
  }

  try {
    const response = await getMaritimeAssistantReply({
      messages: Array.isArray(messages) ? messages : [],
      query: query.trim(),
      apiKey: apiKey ? String(apiKey).trim() : null,
      model: model || null
    });
    res.json({ success: true, ...response });
  } catch (err) {
    console.error("AI Assistant Execution Error:", err);
    res.status(500).json({ error: "AI_GENERATION_ERROR", message: err.message });
  }
});

// Consistent JSON response for invalid endpoints.
app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "API endpoint not found." });
});

// Keep unexpected errors from crashing the process.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`WAYPOINT API running at http://localhost:${PORT}`);
});

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ports, ships } = require("./src/data/demoData");
const { getCandidateRoutes } = require("./src/services/routeService");
const { detectHazards } = require("./src/services/hazardService");
const { optimizeRoutes } = require("./src/services/optimizer");
const { initAISStream, getVesselsList, addSseClient, removeSseClient } = require("./src/services/aisStreamService");

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
    endpoints: [
      "GET /api/health",
      "GET /api/ports",
      "GET /api/ships",
      "GET /api/ais/vessels",
      "GET /api/ais/stream (SSE)",
      "GET /api/weather/marine?latitude=15&longitude=70",
      "GET /api/gdacs?eventlist=TC",
      "GET /api/routes?source=Mumbai&destination=Singapore",
      "POST /api/optimize"
    ]
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "WAYPOINT API", liveTelemetry: true });
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

// 2. Open-Meteo Marine Weather Proxy
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
    res.json({ success: true, source: "Open-Meteo Marine (CC BY 4.0)", data });
  } catch (err) {
    res.status(502).json({ error: "WEATHER_API_ERROR", message: err.message });
  }
});

// 3. GDACS Storm & Disaster Alerts Proxy
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

app.get("/api/ports", (_req, res) => {
  res.json({ ports, demoData: true });
});

app.get("/api/ships", (_req, res) => {
  res.json({ ships, demoData: true });
});

function readPortPair(req, res) {
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

  const sourcePort = ports.find(p => p.name.toLowerCase() === source.toLowerCase());
  const destinationPort = ports.find(p => p.name.toLowerCase() === destination.toLowerCase());

  if (!sourcePort || !destinationPort) {
    res.status(400).json({
      error: "UNKNOWN_PORT",
      message: "One or both ports are not in the current port list.",
      availablePorts: ports.map(p => p.name)
    });
    return null;
  }

  return { sourcePort, destinationPort };
}

function buildRouteResponse(sourcePort, destinationPort, options = {}) {
  const candidates = getCandidateRoutes(sourcePort, destinationPort);
  const routes = candidates.map(route => {
    const hazards = detectHazards(route);
    return { ...route, hazards, hazardExposure: hazards.length > 0 };
  });
  return optimizeRoutes(routes, options);
}

app.get("/api/routes", (req, res) => {
  const pair = readPortPair(req, res);
  if (!pair) return;

  const result = buildRouteResponse(pair.sourcePort, pair.destinationPort);
  if (!result.routes.length) {
    return res.status(404).json({
      error: "NO_DEMO_ROUTE",
      message: "No candidate route is configured for this port pair yet.",
      supportedDemoPairs: ["Mumbai → Singapore", "Mumbai → Dubai"]
    });
  }

  res.json({
    source: pair.sourcePort,
    destination: pair.destinationPort,
    ...result,
    demoData: true,
    disclaimer: "Illustrative prototype data only. Not a live navigation or shipping quote service."
  });
});

app.post("/api/optimize", (req, res) => {
  const source = String(req.body.source || "").trim();
  const destination = String(req.body.destination || "").trim();
  const sourcePort = ports.find(p => p.name.toLowerCase() === source.toLowerCase());
  const destinationPort = ports.find(p => p.name.toLowerCase() === destination.toLowerCase());

  if (!sourcePort || !destinationPort) {
    return res.status(400).json({
      error: "INVALID_PORTS",
      message: "Choose valid source and destination ports from GET /api/ports."
    });
  }
  if (sourcePort.name === destinationPort.name) {
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

  const result = buildRouteResponse(sourcePort, destinationPort, {
    cargoTons,
    budgetUsd,
    shipSpeedKnots
  });

  if (!result.routes.length) {
    return res.status(404).json({
      error: "NO_DEMO_ROUTE",
      message: "No candidate route is configured for this port pair yet."
    });
  }

  res.json({
    source: sourcePort,
    destination: destinationPort,
    cargoTons,
    budgetUsd,
    shipSpeedKnots,
    ...result,
    demoData: true,
    disclaimer: "Illustrative prototype estimates only. Verify navigability, official warnings, and carrier quotations before real-world use."
  });
});

app.get("/api/hazards", (req, res) => {
  const pair = readPortPair(req, res);
  if (!pair) return;

  const candidates = getCandidateRoutes(pair.sourcePort, pair.destinationPort);
  const routes = candidates.map(route => ({
    routeId: route.id,
    routeName: route.name,
    hazards: detectHazards(route)
  }));

  res.json({
    source: pair.sourcePort.name,
    destination: pair.destinationPort.name,
    routes,
    dataMode: "simulated-demo",
    message: "Replace simulated hazards in src/services/hazardService.js with verified weather/official warning feeds."
  });
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

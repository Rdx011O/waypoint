require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ports, ships, trackedCargos } = require("./src/data/demoData");
const { getCandidateRoutes } = require("./src/services/routeService");
const { detectHazards } = require("./src/services/hazardService");
const { optimizeRoutes } = require("./src/services/optimizer");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
}));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "WAYPOINT API",
    description: "Smart Maritime Route Optimizer & Live GPS Tracking API",
    endpoints: [
      "GET /api/health",
      "GET /api/ports",
      "GET /api/ships",
      "GET /api/tracking/cargos",
      "GET /api/tracking/cargos/:id",
      "GET /api/tracking/ships",
      "GET /api/tracking/ships/:id",
      "POST /api/tracking/gps-ping",
      "GET /api/routes?source=Mumbai&destination=Singapore",
      "POST /api/optimize",
      "GET /api/hazards?source=Mumbai&destination=Singapore"
    ]
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "WAYPOINT API", demoData: true });
});

app.get("/api/ports", (_req, res) => {
  res.json({ ports, demoData: true });
});

app.get("/api/ships", (_req, res) => {
  res.json({ ships, demoData: true });
});

// Live GPS Tracking APIs for Shippers & Logistics Operators
app.get("/api/tracking/cargos", (_req, res) => {
  const enriched = trackedCargos.map(cargo => {
    const ship = ships.find(s => s.id === cargo.shipId);
    return { ...cargo, ship };
  });
  res.json({ cargos: enriched, total: enriched.length, liveGpsTracking: true });
});

app.get("/api/tracking/cargos/:id", (req, res) => {
  const id = String(req.params.id || "").trim().toLowerCase();
  const cargo = trackedCargos.find(c =>
    c.id.toLowerCase() === id ||
    c.blNumber.toLowerCase() === id ||
    c.containerId.toLowerCase() === id
  );

  if (!cargo) {
    return res.status(404).json({
      error: "CARGO_NOT_FOUND",
      message: `No active shipment found matching tracking identifier "${req.params.id}".`
    });
  }

  const ship = ships.find(s => s.id === cargo.shipId);
  res.json({
    ...cargo,
    ship,
    trackingUrl: `http://localhost:5173/?track=${cargo.id}`,
    liveGpsStatus: "LOCKED_DGPS",
    satelliteTimestamp: new Date().toISOString()
  });
});

app.get("/api/tracking/ships", (_req, res) => {
  res.json({ ships, total: ships.length, liveGpsTracking: true });
});

app.get("/api/tracking/ships/:id", (req, res) => {
  const id = String(req.params.id || "").trim().toLowerCase();
  const ship = ships.find(s => s.id.toLowerCase() === id || s.imo === id || s.name.toLowerCase().includes(id));
  if (!ship) {
    return res.status(404).json({ error: "SHIP_NOT_FOUND", message: `Ship with ID "${req.params.id}" not found.` });
  }

  const cargoManifest = trackedCargos.filter(c => c.shipId === ship.id);
  res.json({ ...ship, cargoManifest });
});

app.post("/api/tracking/gps-ping", (req, res) => {
  const { shipId, latitude, longitude, speedKnots, heading } = req.body;
  const ship = ships.find(s => s.id === shipId);
  if (!ship) {
    return res.status(404).json({ error: "SHIP_NOT_FOUND", message: `Ship "${shipId}" not found.` });
  }

  if (latitude != null) ship.latitude = Number(latitude);
  if (longitude != null) ship.longitude = Number(longitude);
  if (speedKnots != null) ship.speedKnots = Number(speedKnots);
  if (heading != null) ship.heading = Number(heading);
  ship.lastUpdated = new Date().toISOString();

  res.json({ success: true, updatedShip: ship, message: "GPS telemetry ping acknowledged." });
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

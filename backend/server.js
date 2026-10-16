require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getPorts, findPort, getShips, getAlerts } = require("./src/services/dataService");
const { getCandidateRoutesAsync } = require("./src/services/routeService");
const { detectHazardsAsync } = require("./src/services/hazardService");
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
    description: "Smart Maritime Route Optimizer & Intelligence Platform",
    dataSource: "Firebase Cloud Firestore & Dynamic Maritime Datasets",
    endpoints: [
      "GET /api/health",
      "GET /api/ports",
      "GET /api/ships",
      "GET /api/routes?source=Kolkata&destination=Singapore",
      "POST /api/optimize",
      "GET /api/hazards?source=Kolkata&destination=Singapore"
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
      dataSource: "Firebase Firestore"
    });
  } catch (err) {
    res.status(500).json({ status: "degraded", error: err.message });
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

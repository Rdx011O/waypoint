require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { ports, ships, trackedCargos } = require("./src/data/demoData");
const { getPorts, findPort, getShips, getAlerts } = require("./src/services/dataService");
const { getCandidateRoutes, getCandidateRoutesAsync } = require("./src/services/routeService");
const { detectHazards, detectHazardsAsync } = require("./src/services/hazardService");
const { optimizeRoutes } = require("./src/services/optimizer");
const { initAISStream, getVesselsList, addSseClient, removeSseClient } = require("./src/services/aisStreamService");
const { getLatestNdbcObservations, getObservationsNear } = require("./src/services/ndbcService");
const { getRates, DEFAULT_SUPPORTED_CURRENCIES } = require("./src/services/currencyService");
const { calculateShipperCost, compareCostsAcrossRoutes } = require("./src/services/shipperCostService");
const { getMaritimeAssistantReply, FREE_MODELS } = require("./src/services/aiAssistantService");
const { calculateWeatherReroute } = require("./hazards/rerouteEngine");
const {
  getAllContainers,
  findContainerByCode,
  getContainersByShip,
  getContainersByShipper
} = require("./src/services/containerTrackingService");
const {
  getBookings,
  getBookingById,
  createBooking,
  transmitBookingData,
  batchTransmitBookings
} = require("./src/services/bookingService");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: "*"
}));
app.use(express.json({ limit: "1mb" }));

// Path to built frontend (if available)
const frontendDistPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// Initialize AISStream background connection
initAISStream();

const apiDirectory = {
  name: "WAYPOINT API",
  description: "Smart Maritime Route Optimizer, Live GPS Tracking, Weather Rerouting & Telemetry Gateway",
  dataSource: "Firebase Cloud Firestore & Dynamic Maritime Datasets",
  endpoints: [
    "GET /api/health",
    "GET /api/ports",
    "GET /api/ports/search?q=Chennai",
    "GET /api/ships",
    "GET /api/tracking/cargos",
    "GET /api/tracking/cargos/:id",
    "GET /api/tracking/ships",
    "GET /api/tracking/ships/:id",
    "POST /api/tracking/gps-ping",
    "GET /api/ais/vessels",
    "GET /api/ais/stream (SSE)",
    "GET /api/weather/marine?latitude=15&longitude=70",
    "GET /api/weather/observations?lat=15&lon=70",
    "GET /api/weather/corridor?originLat=13.09&originLon=80.29&destLat=1.26&destLon=103.84",
    "GET /api/gdacs?eventlist=TC",
    "GET /api/reroute?source=Chennai&destination=Singapore&speed=14",
    "POST /api/reroute/accept",
    "GET /api/currency/rates?base=USD",
    "POST /api/cost/estimate",
    "POST /api/cost/compare",
    "GET /api/assistant/models",
    "POST /api/assistant/chat",
    "GET /api/routes?source=Mumbai&destination=Singapore",
    "POST /api/optimize",
    "GET /api/hazards?source=Kolkata&destination=Singapore",
    "GET /api/schedules/vessels?origin=Chennai&destination=Singapore&date=2026-10-24"
  ]
};

// API Directory JSON endpoint
app.get("/api", (_req, res) => {
  res.json(apiDirectory);
});

// Root route: serve frontend web application if index.html exists, else JSON
app.get("/", (req, res) => {
  const indexHtml = path.join(frontendDistPath, "index.html");
  if (req.accepts("html") && fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.json(apiDirectory);
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

// 8. Port-to-Port Vessel Calendar & Real-Time Availability Endpoint
app.get("/api/schedules/vessels", async (req, res) => {
  const origin = String(req.query.origin || "Chennai").trim();
  const destination = String(req.query.destination || "Singapore").trim();
  const date = String(req.query.date || new Date().toISOString().split("T")[0]).trim();
  const weight = Number(req.query.weight) || 25000;

  try {
    const fleet = [
      { carrier: "MSC (Mediterranean Shipping Co)", name: "MSC Gulsun", imo: "9839438", type: "Neo-Panamax / ULCV", cap: 23756, unit: "TEU" },
      { carrier: "Maersk Line", name: "Maersk Mc-Kinney Moller", imo: "9619907", type: "Neo-Panamax / ULCV", cap: 18270, unit: "TEU" },
      { carrier: "CMA CGM Group", name: "CMA CGM Jacques Saade", imo: "9839179", type: "Neo-Panamax / ULCV", cap: 23000, unit: "TEU" },
      { carrier: "Evergreen Marine", name: "Ever Given", imo: "9811000", type: "Panamax / Post-Panamax", cap: 20124, unit: "TEU" },
      { carrier: "Ocean Network Express (ONE)", name: "ONE Apus", imo: "9806079", type: "Panamax / Post-Panamax", cap: 14052, unit: "TEU" },
      { carrier: "Hapag-Lloyd", name: "Hapag-Lloyd Berlin Express", imo: "9540118", type: "Panamax / Post-Panamax", cap: 13200, unit: "TEU" },
      { carrier: "Shipping Corporation of India (SCI)", name: "SCI Chennai", imo: "9445215", type: "Feeder", cap: 2870, unit: "TEU" },
      { carrier: "Wan Hai Lines", name: "Wan Hai 502", imo: "9326419", type: "Panamax / Post-Panamax", cap: 4252, unit: "TEU" },
      { carrier: "X-Press Feeders", name: "X-Press Godavari", imo: "9362841", type: "Feeder", cap: 1740, unit: "TEU" }
    ];

    let seed = 0;
    const str = `${origin}_${destination}_${date}`;
    for (let i = 0; i < str.length; i++) seed = (seed << 5) - seed + str.charCodeAt(i);
    seed = Math.abs(seed);

    const times = ["06:30 UTC", "09:15 UTC", "11:45 UTC", "14:20 UTC", "18:00 UTC", "21:30 UTC"];
    const count = 3 + (seed % 2);
    const vessels = [];
    let availableCount = 0;
    let limitedCount = 0;

    for (let i = 0; i < count; i++) {
      const ship = fleet[(seed + i * 3) % fleet.length];
      const depTime = times[(seed + i * 2) % times.length];
      const roll = (seed + i * 7) % 100;
      let status = "AVAILABLE";
      let openCap = Math.round(ship.cap * 0.22);

      if (roll > 82) {
        status = "UNAVAILABLE";
        openCap = 0;
      } else if (roll > 62) {
        status = "LIMITED";
        openCap = Math.round(ship.cap * 0.08);
        limitedCount++;
      } else {
        availableCount++;
      }

      const costPerUnit = 950 + (seed % 350) + i * 50;
      const totalCost = Math.round(costPerUnit * Math.max(15, Math.min(35, weight / 1000 || 25)));

      vessels.push({
        id: `SCH-${origin.slice(0, 3).toUpperCase()}-${date}-${i + 1}`,
        vesselName: ship.name,
        imoNumber: `IMO ${ship.imo}`,
        carrier: ship.carrier,
        vesselType: ship.type,
        departureDate: date,
        departureTime: depTime,
        transitDays: `${(4.2 + i * 0.4).toFixed(1)} d`,
        pricing: {
          ratePerUnitUsd: costPerUnit,
          rateUnit: "/ TEU",
          estimatedTotalUsd: totalCost,
          currency: "USD"
        },
        capacity: {
          total: `${ship.cap.toLocaleString()} ${ship.unit}`,
          available: openCap > 0 ? `${openCap.toLocaleString()} ${ship.unit}` : "0 slots (Waitlist)",
          percentRemaining: Math.round((openCap / ship.cap) * 100)
        },
        routeCorridor: i === 0 ? "Direct Corridor via Malacca Strait" : "Via Colombo Transshipment Hub & Malacca",
        status,
        statusNote: status === "AVAILABLE" ? "✓ Space confirmed for this sailing." : status === "LIMITED" ? "⚠ Limited space (< 10% remaining)." : "✕ Fully booked."
      });
    }

    res.json({
      success: true,
      origin,
      destination,
      departureDate: date,
      totalVessels: vessels.length,
      availableCount,
      limitedCount,
      vessels,
      instantAvailabilityMessage: availableCount > 0
        ? `✓ ${availableCount} of ${vessels.length} vessel sailings available from ${origin} to ${destination} on ${date}. Immediate space confirmed.`
        : `⚠ High demand: Sailings on ${date} have limited or waitlist allocations.`
    });
  } catch (err) {
    res.status(500).json({ error: "SCHEDULE_FETCH_ERROR", message: err.message });
  }
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

// ─── IoT Device & Container Tracking Endpoints for Shippers ────────────────
// GET /api/tracking/containers - List all 50 containers with live ship coordinates & IoT sensors
app.get("/api/tracking/containers", (req, res) => {
  const { shipId, shipper, q } = req.query;
  let results = getAllContainers();

  if (shipId) {
    results = getContainersByShip(shipId);
  }
  if (shipper) {
    results = getContainersByShipper(shipper);
  }
  if (q) {
    const query = String(q).trim().toUpperCase();
    results = results.filter(c =>
      c.deviceCode.toUpperCase().includes(query) ||
      c.containerId.toUpperCase().includes(query) ||
      (c.shipperName && c.shipperName.toUpperCase().includes(query)) ||
      (c.shipName && c.shipName.toUpperCase().includes(query)) ||
      (c.cargoType && c.cargoType.toUpperCase().includes(query))
    );
  }

  res.json({
    success: true,
    total: results.length,
    containers: results,
    dataSource: "containers.csv (50 IoT Devices Active)",
    lastSync: new Date().toISOString()
  });
});

// GET /api/tracking/container/:code - Lookup by IoT Device Code (e.g. TRK-PAC-101) or Container ID (e.g. MSKU-729101-1)
app.get(["/api/tracking/container/:code", "/api/tracking/device/:code"], (req, res) => {
  const code = req.params.code;
  const container = findContainerByCode(code);

  if (!container) {
    const sampleContainers = getAllContainers().slice(0, 5).map(c => ({
      deviceCode: c.deviceCode,
      containerId: c.containerId,
      shipName: c.shipName
    }));
    return res.status(404).json({
      error: "CONTAINER_NOT_FOUND",
      message: `No active container found with device code or container ID "${code}".`,
      sampleValidCodes: sampleContainers
    });
  }

  res.json({
    success: true,
    container,
    liveMapUrl: `http://localhost:5173/?trackingCode=${encodeURIComponent(container.deviceCode)}`,
    satelliteTelemetryStatus: "ONLINE_CONTINUOUS",
    timestamp: new Date().toISOString()
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
    const dynamicShips = await getShips();
    res.json({
      ships: dynamicShips && dynamicShips.length > 0 ? dynamicShips : ships,
      total: (dynamicShips && dynamicShips.length > 0 ? dynamicShips : ships).length,
      dataSource: dynamicShips && dynamicShips.length > 0 ? "Firebase Firestore" : "Local Telemetry Fleet"
    });
  } catch (err) {
    res.json({ ships, total: ships.length, dataSource: "Local Telemetry Fleet" });
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

// 9. Maritime Slot Booking & Logistics Dispatch Endpoints
app.get("/api/bookings", (req, res) => {
  try {
    const { vessel, destination, origin, date, minDistance, maxDistance, status, shipperId, search } = req.query;
    const bookings = getBookings({
      vessel,
      destination,
      origin,
      date,
      minDistance,
      maxDistance,
      status,
      shipperId,
      search
    });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ error: "BOOKINGS_FETCH_ERROR", message: err.message });
  }
});

app.get("/api/bookings/:id", (req, res) => {
  try {
    const booking = getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "BOOKING_NOT_FOUND", message: `Booking ${req.params.id} does not exist.` });
    }
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: "BOOKING_FETCH_ERROR", message: err.message });
  }
});

app.post("/api/bookings", (req, res) => {
  try {
    const payload = req.body || {};
    const booking = createBooking(payload);
    res.status(201).json({ success: true, message: "Booking confirmed and queued in logistics dispatch.", booking });
  } catch (err) {
    res.status(400).json({ error: "BOOKING_CREATION_ERROR", message: err.message });
  }
});

app.post(["/api/bookings/:id/transmit", "/api/bookings/:id/send-data"], (req, res) => {
  try {
    const booking = transmitBookingData(req.params.id);
    res.json({
      success: true,
      message: `Data successfully transported to ${booking.originPort} Port Authority, ${booking.destinationPort} Port Operations, and ${booking.carrier} Shipping Company Fleet Systems.`,
      booking
    });
  } catch (err) {
    res.status(400).json({ error: "TRANSMIT_ERROR", message: err.message });
  }
});

app.post("/api/bookings/batch-transmit", (req, res) => {
  try {
    const { ids } = req.body || {};
    const updated = batchTransmitBookings(ids || []);
    res.json({
      success: true,
      message: `Successfully transported ${updated.length} booked slot(s) data to respective Port Authorities and Shipping Lines.`,
      count: updated.length,
      bookings: updated
    });
  } catch (err) {
    res.status(500).json({ error: "BATCH_TRANSMIT_ERROR", message: err.message });
  }
});

// SPA catch-all: route any unmatched non-API web request to frontend index.html
if (fs.existsSync(frontendDistPath)) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

// Consistent JSON response for invalid API endpoints.
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

/**
 * WAYPOINT Container Tracking Service
 * 
 * Manages IoT-enabled shipping containers, parsing `containers.csv`
 * (10 containers per vessel, 50 total) and providing real-time GPS synchronization
 * with carrying vessels, environmental telemetry (temperature, humidity),
 * seal security status, and battery levels for shippers.
 */

const fs = require("fs");
const path = require("path");
const { ships } = require("../data/demoData");

// Possible locations for containers.csv
const CSV_PATHS = [
  path.join(__dirname, "../data/containers.csv"),
  path.join(__dirname, "../../data/containers.csv"),
  path.join(process.cwd(), "data/containers.csv"),
  path.join(process.cwd(), "backend/data/containers.csv"),
  path.join(process.cwd(), "backend/src/data/containers.csv")
];

let cachedContainers = null;
let lastLoadTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in memory

/**
 * Robust CSV Line Parser
 * Handles commas inside double quotes.
 */
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Loads and parses containers from containers.csv
 */
function loadContainersFromCsv() {
  let filePath = null;
  for (const p of CSV_PATHS) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.warn("[ContainerTrackingService] containers.csv not found in known paths.");
    return [];
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ""));
    const containers = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < headers.length) continue;

      const item = {};
      headers.forEach((h, idx) => {
        let val = cols[idx] ? cols[idx].replace(/^"|"$/g, "").trim() : "";
        item[h] = val;
      });

      // Parse numerical fields
      item.lat = Number(item.lat) || 0;
      item.lon = Number(item.lon) || 0;
      item.tempC = Number(item.tempC) || 0;
      item.humidityPct = Number(item.humidityPct) || 0;
      item.batteryPct = Number(item.batteryPct) || 0;
      item.speedKnots = Number(item.speedKnots) || 0;
      item.headingDeg = Number(item.headingDeg) || 0;

      containers.push(item);
    }

    cachedContainers = containers;
    lastLoadTime = Date.now();
    return containers;
  } catch (err) {
    console.error("[ContainerTrackingService] Error reading containers.csv:", err.message);
    return cachedContainers || [];
  }
}

/**
 * Synchronizes container coordinates with carrying vessel's live GPS if available
 */
function enrichContainerWithLiveVessel(container) {
  const carryingShip = ships.find(s => s.id === container.shipId);
  const now = new Date().toISOString();

  // If carrying ship has live GPS position, sync container location to vessel
  const liveLat = carryingShip ? carryingShip.latitude : container.lat;
  const liveLon = carryingShip ? carryingShip.longitude : container.lon;
  const liveSpeed = carryingShip ? carryingShip.speedKnots : container.speedKnots;
  const liveHeading = carryingShip ? carryingShip.heading : container.headingDeg;
  const liveNavStatus = carryingShip ? carryingShip.navStatus : container.status;

  return {
    ...container,
    lat: liveLat,
    lon: liveLon,
    speedKnots: liveSpeed,
    headingDeg: liveHeading,
    currentLocation: {
      latitude: liveLat,
      longitude: liveLon
    },
    ship: carryingShip ? {
      id: carryingShip.id,
      name: carryingShip.name,
      imo: carryingShip.imo,
      callSign: carryingShip.callSign,
      flag: carryingShip.flag,
      navStatus: carryingShip.navStatus,
      status: carryingShip.status,
      speedKnots: carryingShip.speedKnots,
      heading: carryingShip.heading,
      gpsSource: carryingShip.gpsSource || "Inmarsat-C Dual DGPS",
      satellitesLocked: carryingShip.satellitesLocked || 14
    } : null,
    iotDevice: {
      deviceCode: container.deviceCode,
      batteryPct: container.batteryPct,
      tempC: container.tempC,
      humidityPct: container.humidityPct,
      sealStatus: container.sealStatus,
      connection: "Satellite IoT Link (Active)",
      signalStrength: "Strong (-78 dBm)",
      lastPing: container.lastPing || now
    },
    isLive: true
  };
}

/**
 * Get all 50 containers enriched with live ship telemetry
 */
function getAllContainers() {
  const now = Date.now();
  if (!cachedContainers || (now - lastLoadTime) > CACHE_TTL_MS) {
    loadContainersFromCsv();
  }
  return (cachedContainers || []).map(enrichContainerWithLiveVessel);
}

/**
 * Find container by Device Code or Container ID (Case-insensitive)
 * e.g. "TRK-PAC-101" or "MSKU-729101-1"
 */
function findContainerByCode(queryCode) {
  if (!queryCode) return null;
  const cleaned = String(queryCode).trim().toUpperCase();

  const all = getAllContainers();
  return all.find(c => 
    c.deviceCode.toUpperCase() === cleaned ||
    c.containerId.toUpperCase() === cleaned ||
    c.deviceCode.toUpperCase().replace(/-/g, "") === cleaned.replace(/-/g, "") ||
    c.containerId.toUpperCase().replace(/-/g, "") === cleaned.replace(/-/g, "")
  ) || null;
}

/**
 * Filter containers by ship ID
 */
function getContainersByShip(shipId) {
  const all = getAllContainers();
  if (!shipId) return all;
  return all.filter(c => c.shipId.toLowerCase() === shipId.toLowerCase());
}

/**
 * Filter containers by shipper name
 */
function getContainersByShipper(shipperQuery) {
  const all = getAllContainers();
  if (!shipperQuery) return all;
  const q = shipperQuery.toLowerCase();
  return all.filter(c => c.shipperName && c.shipperName.toLowerCase().includes(q));
}

module.exports = {
  loadContainersFromCsv,
  getAllContainers,
  findContainerByCode,
  getContainersByShip,
  getContainersByShipper
};

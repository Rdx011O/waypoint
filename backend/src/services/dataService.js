/**
 * WAYPOINT Data Service
 * 
 * Provides dynamic data fetching from Firebase Firestore (and local CSV fallbacks)
 * for ports, vessels, trade links, and maritime hazard alerts.
 * Eliminates all hardcoded data structures across the application.
 */

const fs = require("fs");
const path = require("path");

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "waypoint-maritime";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// In-memory cache
const cache = {
  ports: null,
  portsTimestamp: 0,
  vessels: null,
  vesselsTimestamp: 0,
  tradeLinks: null,
  tradeLinksTimestamp: 0,
  alerts: null,
  alertsTimestamp: 0
};

/**
 * Unwraps Firestore REST document fields into a plain JavaScript object.
 * @param {object} doc - Firestore document from REST API
 * @returns {object}
 */
function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return {};
  const result = {};
  
  // Extract ID from document resource name if available (e.g. .../ports_india/EC01 -> EC01)
  if (doc.name) {
    const segments = doc.name.split("/");
    result._firestoreId = segments[segments.length - 1];
  }

  for (const [key, val] of Object.entries(doc.fields)) {
    if (val.stringValue !== undefined) {
      result[key] = val.stringValue;
    } else if (val.doubleValue !== undefined) {
      result[key] = Number(val.doubleValue);
    } else if (val.integerValue !== undefined) {
      result[key] = Number(val.integerValue);
    } else if (val.booleanValue !== undefined) {
      result[key] = Boolean(val.booleanValue);
    } else if (val.nullValue !== undefined) {
      result[key] = null;
    } else if (val.arrayValue !== undefined) {
      result[key] = (val.arrayValue.values || []).map(v => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.doubleValue !== undefined) return Number(v.doubleValue);
        if (v.integerValue !== undefined) return Number(v.integerValue);
        return Object.values(v)[0];
      });
    } else if (val.mapValue !== undefined) {
      result[key] = parseFirestoreDoc(val.mapValue);
    } else {
      result[key] = Object.values(val)[0];
    }
  }

  return result;
}

/**
 * Fetch a Firestore collection via standard REST API.
 * @param {string} collection - Name of collection
 * @returns {Promise<Array<object>>}
 */
async function fetchFirestoreCollection(collection) {
  try {
    const url = `${FIRESTORE_BASE_URL}/${collection}?pageSize=300`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.warn(`[DataService] Firestore fetch failed for '${collection}': status ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.documents || []).map(parseFirestoreDoc);
  } catch (err) {
    console.warn(`[DataService] Firestore fetch error for '${collection}':`, err.message);
    return [];
  }
}

/**
 * Basic native CSV parser for fallback when local CSV files exist.
 * @param {string} text 
 * @returns {Array<object>}
 */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
    const row = {};
    headers.forEach((h, idx) => {
      let val = rawCols[idx] ? rawCols[idx].trim().replace(/^"|"$/g, "") : "";
      row[h] = val;
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Attempt to read local CSV files if they exist in standard teammate paths.
 * @param {Array<string>} candidatePaths
 * @returns {Array<object>|null}
 */
function tryLoadLocalCsv(candidatePaths) {
  for (const relPath of candidatePaths) {
    const fullPath = path.resolve(__dirname, "../../..", relPath);
    if (fs.existsSync(fullPath)) {
      try {
        const text = fs.readFileSync(fullPath, "utf8");
        const parsed = parseCsv(text);
        if (parsed.length > 0) return parsed;
      } catch (e) {
        console.warn(`[DataService] Error reading CSV at ${fullPath}:`, e.message);
      }
    }
  }
  return null;
}

/**
 * Fetch and normalize all ports (Indian & Foreign).
 * Priority: Firestore -> Local CSV -> Empty array.
 * @returns {Promise<Array<object>>}
 */
async function getPorts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.ports && (now - cache.portsTimestamp) < CACHE_TTL_MS) {
    return cache.ports;
  }

  // 1. Try Firebase Firestore
  const [indianRaw, foreignRaw] = await Promise.all([
    fetchFirestoreCollection("ports_india"),
    fetchFirestoreCollection("ports_foreign")
  ]);

  let portsList = [];

  if (indianRaw.length > 0 || foreignRaw.length > 0) {
    const mappedIndian = indianRaw.map(p => ({
      id: p.portId || p._firestoreId || p.unlocode,
      name: p.name || p.port_name || "Unknown Port",
      country: p.country || "India",
      state: p.state || null,
      unlocode: p.unlocode || null,
      type: p.type || "Major",
      latitude: Number(p.lat ?? p.latitude ?? 0),
      longitude: Number(p.lng ?? p.longitude ?? 0),
      maxDraftM: Number(p.maxDraftM ?? p.max_draft_m_approx ?? 0),
      cargoCapacityMTPA: Number(p.cargoCapacityMTPA ?? p.cargo_capacity_MTPA_approx ?? 0),
      containerCapacityTEU: Number(p.containerCapacityTEU ?? p.container_capacity_TEU_approx ?? 0),
      mainCargo: p.mainCargo || null,
      coastRegion: p.coastRegion || null
    }));

    const mappedForeign = foreignRaw.map(p => ({
      id: p.portId || p._firestoreId || p.unlocode,
      name: p.name || p.foreign_port || "Unknown Port",
      country: p.country || "International",
      unlocode: p.unlocode || null,
      type: "Foreign Partner",
      latitude: Number(p.lat ?? p.latitude ?? 0),
      longitude: Number(p.lng ?? p.longitude ?? 0),
      maxDraftM: 14,
      cargoCapacityMTPA: 0,
      containerCapacityTEU: 0,
      mainCargo: null,
      coastRegion: null
    }));

    portsList = [...mappedIndian, ...mappedForeign];
  } else {
    // 2. CSV Fallback
    const localIndian = tryLoadLocalCsv(["csv/ports_east_coast_india.csv", "backend/data/ports.csv"]);
    const localForeign = tryLoadLocalCsv(["csv/foreign_partner_ports.csv"]);

    if (localIndian) {
      localIndian.forEach(p => {
        portsList.push({
          id: p.port_id || p.unlocode,
          name: p.port_name || p.name,
          country: p.country || "India",
          latitude: parseFloat(p.latitude) || 0,
          longitude: parseFloat(p.longitude) || 0,
          unlocode: p.unlocode || null,
          type: p.port_type || "Major"
        });
      });
    }
    if (localForeign) {
      localForeign.forEach(p => {
        portsList.push({
          id: p.fport_id || p.unlocode,
          name: p.foreign_port || p.name,
          country: p.country || "International",
          latitude: parseFloat(p.latitude) || 0,
          longitude: parseFloat(p.longitude) || 0,
          unlocode: p.unlocode || null,
          type: "Foreign Partner"
        });
      });
    }
  }

  cache.ports = portsList;
  cache.portsTimestamp = now;
  return portsList;
}

/**
 * Find a port by name, unlocode, or id (case-insensitive).
 * @param {string} query 
 * @returns {Promise<object|null>}
 */
async function findPort(query) {
  if (!query) return null;
  const clean = String(query).trim().toLowerCase();
  const ports = await getPorts();

  return ports.find(p => {
    const nameMatch = p.name && p.name.toLowerCase().includes(clean);
    const idMatch = p.id && p.id.toLowerCase() === clean;
    const unlocodeMatch = p.unlocode && p.unlocode.toLowerCase() === clean;
    return nameMatch || idMatch || unlocodeMatch;
  }) || null;
}

/**
 * Fetch and normalize all ships/vessels.
 * Priority: Firestore (vessel_types) -> Local CSV -> Empty array.
 * @returns {Promise<Array<object>>}
 */
async function getShips(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.vessels && (now - cache.vesselsTimestamp) < CACHE_TTL_MS) {
    return cache.vessels;
  }

  const rawVessels = await fetchFirestoreCollection("vessel_types");
  let vesselsList = [];

  if (rawVessels.length > 0) {
    vesselsList = rawVessels.map((v, idx) => ({
      id: v._firestoreId || `VESSEL-${idx + 1}`,
      name: v.type || v.vessel_type || `Vessel Type ${idx + 1}`,
      category: v.category || "Commercial",
      type: v.type || "Cargo",
      capacity: v.capacityRange || v.capacity || null,
      typicalCargo: v.typicalCargo || null,
      portsServed: v.portsServed || null
    }));
  } else {
    const localCsv = tryLoadLocalCsv(["csv/vessel_types_capacity.csv", "backend/data/vessels.csv"]);
    if (localCsv) {
      vesselsList = localCsv.map((v, idx) => ({
        id: `VESSEL-CSV-${idx + 1}`,
        name: v.vessel_type || v.type || `Vessel ${idx + 1}`,
        category: v.category || "Commercial",
        type: v.type || "Cargo",
        capacity: v.typical_capacity || v.capacityRange || null
      }));
    }
  }

  cache.vessels = vesselsList;
  cache.vesselsTimestamp = now;
  return vesselsList;
}

/**
 * Fetch trade links connecting ports from Firestore or CSV.
 * @returns {Promise<Array<object>>}
 */
async function getTradeLinks(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.tradeLinks && (now - cache.tradeLinksTimestamp) < CACHE_TTL_MS) {
    return cache.tradeLinks;
  }

  const rawLinks = await fetchFirestoreCollection("trade_links");
  let linksList = [];

  if (rawLinks.length > 0) {
    linksList = rawLinks.map(l => ({
      originPort: l.originPort,
      originPortId: l.originPortId,
      originLat: Number(l.originLat ?? 0),
      originLng: Number(l.originLng ?? 0),
      destinationPort: l.destinationPort,
      destinationUnlocode: l.destinationUnlocode,
      destinationLat: Number(l.destinationLat ?? 0),
      destinationLng: Number(l.destinationLng ?? 0),
      country: l.country,
      greatCircleNm: Number(l.greatCircleNm ?? 0),
      greatCircleKm: Number(l.greatCircleKm ?? 0),
      tradeDirection: l.tradeDirection || "Bilateral",
      commodities: l.commodities || ""
    }));
  } else {
    const localCsv = tryLoadLocalCsv(["csv/trade_links_east_coast.csv"]);
    if (localCsv) {
      linksList = localCsv.map(l => ({
        originPort: l.indian_port,
        originPortId: l.indian_port_id,
        originLat: parseFloat(l.indian_lat) || 0,
        originLng: parseFloat(l.indian_lon) || 0,
        destinationPort: l.foreign_port,
        destinationUnlocode: l.foreign_unlocode,
        destinationLat: parseFloat(l.foreign_lat) || 0,
        destinationLng: parseFloat(l.foreign_lon) || 0,
        greatCircleNm: parseInt(l.great_circle_nm, 10) || 0,
        greatCircleKm: parseInt(l.great_circle_km, 10) || 0,
        commodities: l.main_commodities || ""
      }));
    }
  }

  cache.tradeLinks = linksList;
  cache.tradeLinksTimestamp = now;
  return linksList;
}

/**
 * Fetch active hazard alerts from Firestore collection 'alerts'.
 * @returns {Promise<Array<object>>}
 */
async function getAlerts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.alerts && (now - cache.alertsTimestamp) < CACHE_TTL_MS) {
    return cache.alerts;
  }

  const rawAlerts = await fetchFirestoreCollection("alerts");
  const alertsList = rawAlerts.map((a, idx) => ({
    id: a._firestoreId || `ALERT-${idx + 1}`,
    type: a.type || a.hazardType || "Advisory",
    severity: a.severity || "Medium",
    lat: Number(a.lat ?? a.latitude ?? 0),
    lon: Number(a.lon ?? a.longitude ?? 0),
    radiusKm: Number(a.radiusKm ?? a.dangerRadiusKm ?? 150),
    description: a.description || a.details || "Official maritime alert",
    source: a.source || "Firebase Firestore Alerts",
    issuedAt: a.issuedAt || a.createdAt || null
  }));

  cache.alerts = alertsList;
  cache.alertsTimestamp = now;
  return alertsList;
}

/**
 * Clear in-memory caches.
 */
function clearCache() {
  cache.ports = null;
  cache.portsTimestamp = 0;
  cache.vessels = null;
  cache.vesselsTimestamp = 0;
  cache.tradeLinks = null;
  cache.tradeLinksTimestamp = 0;
  cache.alerts = null;
  cache.alertsTimestamp = 0;
}

module.exports = {
  getPorts,
  findPort,
  getShips,
  getTradeLinks,
  getAlerts,
  clearCache
};

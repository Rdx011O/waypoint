// parseCsvToData.js
// Parses all maritime CSV files and generates structured data module & Firebase seeder

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvDir = path.join(__dirname, '..', 'csv');

// Simple CSV parser supporting quotes
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
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
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

console.log('Reading CSV files from:', csvDir);

// 1. Ports East Coast India
const indianPortsRaw = parseCSV(fs.readFileSync(path.join(csvDir, 'ports_east_coast_india.csv'), 'utf8'));
const indianPorts = indianPortsRaw.map(p => ({
  portId: p.port_id,
  name: p.port_name,
  unlocode: p.unlocode,
  state: p.state,
  type: p.port_type,
  lat: parseFloat(p.latitude) || 0,
  lng: parseFloat(p.longitude) || 0,
  maxDraftM: parseFloat(p.max_draft_m_approx) || 0,
  cargoCapacityMTPA: parseFloat(p.cargo_capacity_MTPA_approx) || 0,
  containerCapacityTEU: parseInt(p.container_capacity_TEU_approx, 10) || 0,
  trafficFY24MT: parseFloat(p.traffic_FY2023_24_MT_approx) || 0,
  mainCargo: p.main_cargo_types,
  coastRegion: p.coast_region,
  country: 'India'
}));
console.log(`Parsed ${indianPorts.length} Indian East Coast Ports`);

// 2. Foreign Partner Ports
const foreignPortsRaw = parseCSV(fs.readFileSync(path.join(csvDir, 'foreign_partner_ports.csv'), 'utf8'));
const foreignPorts = foreignPortsRaw.map(p => ({
  portId: p.fport_id,
  name: p.foreign_port,
  unlocode: p.unlocode,
  country: p.country,
  lat: parseFloat(p.latitude) || 0,
  lng: parseFloat(p.longitude) || 0
}));
console.log(`Parsed ${foreignPorts.length} Foreign Partner Ports`);

// 3. Trade Links
const tradeLinksRaw = parseCSV(fs.readFileSync(path.join(csvDir, 'trade_links_east_coast.csv'), 'utf8'));
const tradeLinks = tradeLinksRaw.map((t, idx) => ({
  linkId: `TL-${idx + 1}`,
  originPort: t.indian_port,
  originPortId: t.indian_port_id,
  originLat: parseFloat(t.indian_lat) || 0,
  originLng: parseFloat(t.indian_lon) || 0,
  destinationPort: t.foreign_port,
  destinationUnlocode: t.foreign_unlocode,
  country: t.country,
  destinationLat: parseFloat(t.foreign_lat) || 0,
  destinationLng: parseFloat(t.foreign_lon) || 0,
  greatCircleNm: parseInt(t.great_circle_nm, 10) || 0,
  greatCircleKm: parseInt(t.great_circle_km, 10) || 0,
  tradeDirection: t.trade_direction,
  commodities: t.commodities
}));
console.log(`Parsed ${tradeLinks.length} Trade Links`);

// 4. Shipping Lines By Port
const shippingLinesRaw = parseCSV(fs.readFileSync(path.join(csvDir, 'shipping_lines_by_port.csv'), 'utf8'));
const shippingLines = shippingLinesRaw.map((s, idx) => ({
  id: `SL-${idx + 1}`,
  portId: s.port_id,
  portName: s.port_name,
  company: s.shipping_company,
  category: s.service_category,
  callType: s.call_type
}));
console.log(`Parsed ${shippingLines.length} Shipping Line records`);

// 5. Vessel Types & Capacity
const vesselTypesRaw = parseCSV(fs.readFileSync(path.join(csvDir, 'vessel_types_capacity.csv'), 'utf8'));
const vesselTypes = vesselTypesRaw.map((v, idx) => ({
  id: `VT-${idx + 1}`,
  category: v.vessel_category,
  type: v.vessel_type,
  capacityRange: v.capacity_range,
  typicalCargo: v.typical_cargo,
  portsServed: v.east_coast_ports_served
}));
console.log(`Parsed ${vesselTypes.length} Vessel Types`);

// Output JS module for React frontend
const outputContent = `// WAYPOINT — Structured Maritime Data parsed from CSV Dataset
// Auto-generated from ports_east_coast_india.csv, foreign_partner_ports.csv, trade_links_east_coast.csv, shipping_lines_by_port.csv, vessel_types_capacity.csv

export const CSV_INDIAN_PORTS = ${JSON.stringify(indianPorts, null, 2)};

export const CSV_FOREIGN_PORTS = ${JSON.stringify(foreignPorts, null, 2)};

export const CSV_TRADE_LINKS = ${JSON.stringify(tradeLinks, null, 2)};

export const CSV_SHIPPING_LINES = ${JSON.stringify(shippingLines, null, 2)};

export const CSV_VESSEL_TYPES = ${JSON.stringify(vesselTypes, null, 2)};

// Map of carriers by portId for instant O(1) carrier matching
export const SHIPPING_LINES_BY_PORT = CSV_SHIPPING_LINES.reduce((acc, item) => {
  if (!acc[item.portId]) acc[item.portId] = [];
  acc[item.portId].push(item);
  return acc;
}, {});

// Map of trade links by origin port name
export const TRADE_LINKS_BY_ORIGIN = CSV_TRADE_LINKS.reduce((acc, link) => {
  const key = link.originPort.toLowerCase();
  if (!acc[key]) acc[key] = [];
  acc[key].push(link);
  return acc;
}, {});
`;

const outputPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'maritimeCsvData.js');
fs.writeFileSync(outputPath, outputContent, 'utf8');
console.log('Successfully wrote maritimeCsvData.js to:', outputPath);

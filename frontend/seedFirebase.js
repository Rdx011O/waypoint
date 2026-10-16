// frontend/seedFirebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyDZgnduQi-MzbTmGLis-eN71K1zmouRedg",
  authDomain: "waypoint-maritime.firebaseapp.com",
  projectId: "waypoint-maritime",
  storageBucket: "waypoint-maritime.firebasestorage.app",
  messagingSenderId: "479998933683",
  appId: "1:479998933683:web:094636ed74516e307d0ec6",
  measurementId: "G-E4RN8276MX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple CSV parser
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV row splitter with quote support
    const row = {};
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < lines[i].length; c++) {
      const ch = lines[i][c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    headers.forEach((h, idx) => {
      row[h] = values[idx] ? values[idx].replace(/^"|"$/g, '') : '';
    });
    rows.push(row);
  }
  return rows;
}

async function seedData() {
  console.log('--- Starting Firebase Firestore Seeding from CSV Dataset ---');
  const csvDir = path.join(__dirname, '..', 'csv');

  try {
    // 1. Seed Indian Ports
    const indianPortsText = fs.readFileSync(path.join(csvDir, 'ports_east_coast_india.csv'), 'utf8');
    const indianPorts = parseCSV(indianPortsText);
    console.log(`Uploading ${indianPorts.length} Indian Ports to Firestore 'ports_india'...`);
    for (const p of indianPorts) {
      if (!p.port_id) continue;
      await setDoc(doc(db, "ports_india", p.port_id), {
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
      });
    }
    console.log('✓ ports_india uploaded successfully.');

    // 2. Seed Foreign Ports
    const foreignPortsText = fs.readFileSync(path.join(csvDir, 'foreign_partner_ports.csv'), 'utf8');
    const foreignPorts = parseCSV(foreignPortsText);
    console.log(`Uploading ${foreignPorts.length} Foreign Ports to Firestore 'ports_foreign'...`);
    for (const p of foreignPorts) {
      if (!p.fport_id) continue;
      await setDoc(doc(db, "ports_foreign", p.fport_id), {
        portId: p.fport_id,
        name: p.foreign_port,
        unlocode: p.unlocode,
        country: p.country,
        lat: parseFloat(p.latitude) || 0,
        lng: parseFloat(p.longitude) || 0
      });
    }
    console.log('✓ ports_foreign uploaded successfully.');

    // 3. Seed Trade Links (primary corridors)
    const tradeLinksText = fs.readFileSync(path.join(csvDir, 'trade_links_east_coast.csv'), 'utf8');
    const tradeLinks = parseCSV(tradeLinksText);
    console.log(`Uploading ${tradeLinks.length} Trade Links to Firestore 'trade_links'...`);
    for (let i = 0; i < Math.min(tradeLinks.length, 50); i++) {
      const t = tradeLinks[i];
      if (!t.indian_port_id) continue;
      const id = `TL_${t.indian_port_id}_${t.foreign_unlocode || i}`;
      await setDoc(doc(db, "trade_links", id), {
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
      });
    }
    console.log('✓ trade_links uploaded successfully.');

    // 4. Seed Vessel Types
    const vesselTypesText = fs.readFileSync(path.join(csvDir, 'vessel_types_capacity.csv'), 'utf8');
    const vesselTypes = parseCSV(vesselTypesText);
    console.log(`Uploading ${vesselTypes.length} Vessel Types to Firestore 'vessel_types'...`);
    for (let i = 0; i < vesselTypes.length; i++) {
      const v = vesselTypes[i];
      if (!v.vessel_category) continue;
      await setDoc(doc(db, "vessel_types", `VT_${i + 1}`), {
        category: v.vessel_category,
        type: v.vessel_type,
        capacityRange: v.capacity_range,
        typicalCargo: v.typical_cargo,
        portsServed: v.east_coast_ports_served
      });
    }
    console.log('✓ vessel_types uploaded successfully.');

    // 5. Seed Catalog Manifest
    await setDoc(doc(db, "catalog_manifest", "overview"), {
      totalIndianPorts: indianPorts.length,
      totalForeignPorts: foreignPorts.length,
      totalTradeLinks: tradeLinks.length,
      datasetVersion: '1.2.0-EastCoast-Global',
      lastSynced: new Date().toISOString()
    });
    console.log('✓ catalog_manifest metadata stored.');

    console.log('--- Firebase Seeding Complete! ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedData();

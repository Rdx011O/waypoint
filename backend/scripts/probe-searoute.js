const { seaRoute, seaRouteAlternatives } = require('searoute-ts');
// Try importing ports subpath
try {
  require('searoute-ts/ports');
  console.log('[PROBE] Successfully loaded searoute-ts/ports');
} catch (e) {
  console.log('[PROBE] Could not load searoute-ts/ports:', e.message);
}

const pkg = require('searoute-ts/package.json');
console.log('=== SEAROUTE-TS PACKAGE INFO ===');
console.log('Version:', pkg.version);
console.log('License:', pkg.license);
console.log('Exports:', Object.keys(require('searoute-ts')));

// Coordinates: [longitude, latitude]
const MUMBAI_COORD = [72.85, 18.95];
const SINGAPORE_COORD = [103.85, 1.28];
const SHANGHAI_COORD = [121.5, 31.2];
const ROTTERDAM_COORD = [4.4, 51.9];

console.log('\n=== TEST 1: Mumbai -> Singapore ===');
try {
  const alts = seaRouteAlternatives(MUMBAI_COORD, SINGAPORE_COORD, {
    k: 5,
    units: 'nauticalmiles',
    speedKnots: 14,
    returnPassages: true,
  });
  console.log(`Found ${alts.length} alternative(s):`);
  alts.forEach((r, idx) => {
    console.log(`\nRoute #${idx + 1}:`);
    console.log('  Variant:', r.properties.variant);
    console.log('  Length:', r.properties.length, r.properties.units);
    console.log('  Great Circle:', r.properties.greatCircleLength);
    console.log('  Detour Ratio:', r.properties.detourRatio);
    console.log('  Duration (hrs):', r.properties.durationHours);
    console.log('  Passages:', r.properties.passages);
    console.log('  Geometry Type:', r.geometry.type);
    console.log('  Waypoints count:', r.geometry.coordinates.length);
    console.log('  First 2 waypoints:', r.geometry.coordinates.slice(0, 2));
    console.log('  Last 2 waypoints:', r.geometry.coordinates.slice(-2));
  });
} catch (err) {
  console.error('Test 1 failed:', err);
}

console.log('\n=== TEST 2: Shanghai -> Rotterdam ===');
try {
  const alts = seaRouteAlternatives(SHANGHAI_COORD, ROTTERDAM_COORD, {
    k: 5,
    units: 'nauticalmiles',
    speedKnots: 15,
    returnPassages: true,
  });
  console.log(`Found ${alts.length} alternative(s):`);
  alts.forEach((r, idx) => {
    console.log(`\nRoute #${idx + 1}:`);
    console.log('  Variant:', r.properties.variant);
    console.log('  Length:', r.properties.length, r.properties.units);
    console.log('  Great Circle:', r.properties.greatCircleLength);
    console.log('  Detour Ratio:', r.properties.detourRatio);
    console.log('  Duration (hrs):', r.properties.durationHours);
    console.log('  Passages:', r.properties.passages);
    console.log('  Geometry Type:', r.geometry.type);
    console.log('  Waypoints count:', r.geometry.coordinates.length);
  });
} catch (err) {
  console.error('Test 2 failed:', err);
}

console.log('\n=== TEST 3: UN/LOCODE port codes ("CNSHA" -> "NLRTM") ===');
try {
  const r = seaRoute('CNSHA', 'NLRTM', {
    units: 'nauticalmiles',
    returnPassages: true,
  });
  console.log('UN/LOCODE port codes work directly!');
  console.log('  Length:', r.properties.length, r.properties.units);
  console.log('  Passages:', r.properties.passages);
} catch (err) {
  console.error('UN/LOCODE test failed:', err.message);
}

console.log('\n=== TEST 4: Draft restriction test (Rotterdam -> Suez with huge draft) ===');
try {
  const rNormal = seaRoute(ROTTERDAM_COORD, MUMBAI_COORD, { returnPassages: true });
  const rDraft = seaRoute(ROTTERDAM_COORD, MUMBAI_COORD, { returnPassages: true, vesselDraftMeters: 25 });
  console.log('Normal draft passages:', rNormal.properties.passages, 'length:', rNormal.properties.length);
  console.log('25m draft passages:', rDraft.properties.passages, 'length:', rDraft.properties.length);
} catch (err) {
  console.error('Draft test error:', err.message);
}

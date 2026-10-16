/* data.js — Seed data for Voyage Fit */
const CARGO_TYPES = [
  { id: "mango",       emoji: "🥭", label: "Fresh Produce",   shelfDays: 21, hint: "Mangoes stay fresh about 21 days. A route with tight margins may spoil your shipment.", reefer: true,  hazard: false },
  { id: "medicine",   emoji: "💊", label: "Medicines",        shelfDays: 730, hint: "Medicines last 2+ years, but some need temperature control. Check your product sheet.", reefer: false, hazard: false },
  { id: "electronics",emoji: "💻", label: "Electronics",      shelfDays: 999, hint: "Electronics are hardy travellers. Watch for humidity in monsoon season.", reefer: false, hazard: false },
  { id: "textile",    emoji: "👕", label: "Textiles",         shelfDays: 999, hint: "Textiles are fine in dry containers. Just avoid ports with known rain delays.", reefer: false, hazard: false },
  { id: "other",      emoji: "📦", label: "Other Goods",      shelfDays: 999, hint: "Tell us more and we will help you find the right route.", reefer: false, hazard: false }
];

const COMMON_PORTS = [
  { code: "INNSA", name: "Nhava Sheva", country: "🇮🇳" },
  { code: "INMUN", name: "Mumbai",      country: "🇮🇳" },
  { code: "INCCU", name: "Kolkata",     country: "🇮🇳" },
  { code: "INCHE", name: "Chennai",     country: "🇮🇳" },
  { code: "GBFXT", name: "Felixstowe",  country: "🇬🇧" },
  { code: "NLRTM", name: "Rotterdam",   country: "🇳🇱" },
  { code: "DEHAM", name: "Hamburg",     country: "🇩🇪" },
  { code: "USLAX", name: "Los Angeles", country: "🇺🇸" },
  { code: "SGSIN", name: "Singapore",   country: "🇸🇬" },
  { code: "AEDXB", name: "Dubai",       country: "🇦🇪" },
];

const SAMPLE_ROUTES = [
  {
    id: "r1",
    carrier: "Maersk Line",
    carrierIcon: "⚓",
    badgeType: "live",
    priceUSD: 1240,
    days: 22,
    changes: 0,
    co2: 3.2,
    via: [],
    fitScore: 88,
    fitLevel: "good",
    seaDays: 20,
    portDays: 2,
    sample: true
  },
  {
    id: "r2",
    carrier: "CMA CGM",
    carrierIcon: "🚢",
    badgeType: "published",
    priceUSD: 1090,
    days: 26,
    changes: 1,
    co2: 3.8,
    via: ["Colombo"],
    fitScore: 72,
    fitLevel: "ok",
    seaDays: 22,
    portDays: 4,
    sample: true
  },
  {
    id: "r3",
    carrier: "MSC",
    carrierIcon: "🌊",
    badgeType: "estimated",
    priceUSD: 980,
    days: 30,
    changes: 2,
    co2: 4.5,
    via: ["Colombo", "Port Said"],
    fitScore: 54,
    fitLevel: "risky",
    seaDays: 25,
    portDays: 5,
    sample: true
  },
  {
    id: "r4",
    carrier: "Hapag-Lloyd",
    carrierIcon: "⛵",
    badgeType: "quoted",
    priceUSD: 1380,
    days: 21,
    changes: 0,
    co2: 2.9,
    via: [],
    fitScore: 91,
    fitLevel: "good",
    seaDays: 19,
    portDays: 2,
    sample: true
  }
];

const PORT_RADAR_DATA = [
  { name: "Nhava Sheva", ships: 9,  status: "busy",    label: "9 ships waiting — slight delays" },
  { name: "Chennai",     ships: 3,  status: "calm",    label: "3 ships — clear berths" },
  { name: "Kolkata",     ships: 14, status: "crowded", label: "14 ships — significant wait" },
];

const SAMPLE_CARRIERS = [
  { id: "c1", name: "Maersk Line", route: "Nhava Sheva → Felixstowe", container: "40ft Reefer", priceUSD: 1240, days: 22, changes: 0, validity: "2026-11-01", active: true,  badge: "live",      sample: true },
  { id: "c2", name: "CMA CGM",    route: "Chennai → Rotterdam",       container: "20ft Dry",   priceUSD: 890,  days: 28, changes: 1, validity: "2026-10-28", active: true,  badge: "quoted",    sample: true },
  { id: "c3", name: "MSC",        route: "Nhava Sheva → Hamburg",     container: "40ft Dry",   priceUSD: 1050, days: 25, changes: 1, validity: "2026-10-25", active: false, badge: "published", sample: true },
];

function calcFitScore(route, cargoId) {
  const cargo = CARGO_TYPES.find(c => c.id === cargoId);
  if (!cargo) return route.fitScore;
  const margin = cargo.shelfDays - route.days;
  if (margin <= 0) return 20;
  if (margin <= 3) return 45;
  if (route.changes > 1) return Math.max(route.fitScore - 15, 30);
  return route.fitScore;
}

function calcMarginDays(route, cargoId, delayOffset = 0) {
  const cargo = CARGO_TYPES.find(c => c.id === cargoId);
  if (!cargo || cargo.shelfDays >= 999) return 99;
  return cargo.shelfDays - (route.days + delayOffset);
}

function getFitLevel(score) {
  if (score >= 75) return "good";
  if (score >= 50) return "ok";
  return "risky";
}

function getFitReasons(route, cargoId) {
  const cargo = CARGO_TYPES.find(c => c.id === cargoId) || CARGO_TYPES[4];
  const margin = calcMarginDays(route, cargoId);
  const reasons = [];
  if (route.changes === 0) reasons.push({ icon: "✅", text: "Direct sailing — no ship changes needed" });
  else if (route.changes === 1) reasons.push({ icon: "⚠️", text: `Changes ship once at ${route.via[0]} — adds 2–4 days` });
  else reasons.push({ icon: "❌", text: `${route.changes} ship changes increase risk of delays` });

  if (cargo.reefer && route.id === "r1") reasons.push({ icon: "❄️", text: "Cooling plug available at origin and destination ports" });
  else if (cargo.reefer) reasons.push({ icon: "⚠️", text: "Confirm cooling plug availability with carrier" });

  if (margin >= 5) reasons.push({ icon: "📅", text: `Arrives with ${margin} days to spare — comfortable margin` });
  else if (margin >= 2) reasons.push({ icon: "⏱️", text: `Only ${margin} days margin — any delay is risky` });
  else if (margin < 2 && cargo.shelfDays < 999) reasons.push({ icon: "🚨", text: "Very tight margin — consider a faster route" });
  else reasons.push({ icon: "📦", text: "No shelf-life limit — focus on cost and reliability" });

  return reasons.slice(0, 3);
}

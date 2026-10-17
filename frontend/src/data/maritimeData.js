// WAYPOINT — Maritime Route Intelligence | maritimeData.js
// Structured datasets based on ASD-STE100 Operator Manual

export const WAYPOINT_DATA = {
  // Navigation definitions by role
  navItems: {
    shipper: [
      { id: 'dashboard', label: 'Overview & Shipments', iconName: 'LayoutDashboard', sub: 'Active Bookings' },
      { id: 'mybookings', label: 'My Bookings', iconName: 'Bookmark', sub: 'Manifests & Receipts' },
      { id: 'queue', label: 'Booked Slots Queue (Que)', iconName: 'Layers', sub: 'Logistics Dispatch' },
      { id: 'tracking', label: 'Cargo Tracking', iconName: 'Radio', sub: 'IoT Container GPS' },
      { id: 'plan', label: 'Plan a Shipment', iconName: 'Package', sub: 'Cargo & Lane Input' },
      { id: 'compare', label: 'Compare Routes', iconName: 'Scale', sub: 'Cost & Risk Intelligence' },
      { id: 'catalog', label: 'Ports & Trade Network', iconName: 'Anchor', sub: 'CSV Maritime Database' },
      { id: 'saved', label: 'Saved Routes', iconName: 'Bookmark', sub: 'Bookings & Portfolio' },
      { id: 'assistant', label: 'Route Assistant', iconName: 'Sparkles', sub: 'AI Maritime Copilot' },
      { id: 'settings', label: 'Account & Preferences', iconName: 'Settings', sub: 'Shipper Config' }
    ],
    manager: [
      { id: 'dashboard', label: 'Operations Command', iconName: 'LayoutDashboard', sub: 'Fleet Status' },
      { id: 'queue', label: 'Booked Slots Queue (Que)', iconName: 'Layers', sub: 'Port & Carrier Dispatch' },
      { id: 'mybookings', label: 'My Bookings & Manifests', iconName: 'Bookmark', sub: 'Shipper Manifests' },
      { id: 'tracking', label: 'Cargo Tracking', iconName: 'Radio', sub: 'IoT Container Telemetry' },
      { id: 'riskmap', label: 'Live Risk Map', iconName: 'Map', sub: 'Hazard & Route Monitor' },
      { id: 'catalog', label: 'Ports & Trade Network', iconName: 'Anchor', sub: 'CSV Maritime Database' },
      { id: 'rerouting', label: 'Rerouting Center', iconName: 'RefreshCw', sub: 'Disruption & Alternate' },
      { id: 'alerts', label: 'Alerts Center', iconName: 'ShieldAlert', sub: 'Active Sea Warnings' },
      { id: 'analytics', label: 'Maritime Analytics', iconName: 'BarChart3', sub: 'Fleet & Risk Metrics' },
      { id: 'assistant', label: 'Route Assistant', iconName: 'Sparkles', sub: 'AI Maritime Copilot' },
      { id: 'settings', label: 'Fleet Configuration', iconName: 'Settings', sub: 'Telemetry Sources' }
    ]
  },

  // Table 3: Dashboard key figures
  dashboardKpis: [
    { id: 'activeShipments', label: 'Active Shipments', value: '128', iconName: 'Ship', trend: '+12% vs last mo', status: 'live' },
    { id: 'routesMonitored', label: 'Routes Monitored', value: '42', iconName: 'Compass', trend: 'East Coast & Bay of Bengal', status: 'live' },
    { id: 'shipmentsAtRisk', label: 'Shipments at Risk', value: '07', iconName: 'AlertTriangle', trend: '3 critical hazards', status: 'crit' },
    { id: 'shippingCost', label: 'Estimated Shipping Cost', value: '$284,500', iconName: 'DollarSign', trend: 'Current cycle', status: 'demo' },
    { id: 'transitTime', label: 'Average Transit Time', value: '5.8 d', iconName: 'Clock', trend: '-0.8 days optimal', status: 'live' },
    { id: 'weatherAlerts', label: 'Active Weather Alerts', value: '05', iconName: 'Wind', trend: 'Bay of Bengal / Andaman', status: 'warn' }
  ],

  // Key East Coast of India Ports & Bay of Bengal Hubs
  ports: [
    { id: 'INMAA', name: 'Chennai Port (Madras)', country: 'India', lat: 13.0827, lng: 80.2928, status: 'Normal', waitHours: 12, congestion: 'Low' },
    { id: 'INVTZ', name: 'Visakhapatnam Port', country: 'India', lat: 17.6868, lng: 83.2185, status: 'Normal', waitHours: 14, congestion: 'Low' },
    { id: 'INCCU', name: 'Kolkata (SMP Port)', country: 'India', lat: 22.5400, lng: 88.3200, status: 'Normal', waitHours: 18, congestion: 'Moderate' },
    { id: 'INHAL', name: 'Haldia Dock Complex', country: 'India', lat: 22.0330, lng: 88.0670, status: 'Normal', waitHours: 16, congestion: 'Low' },
    { id: 'INPBD', name: 'Paradip Port', country: 'India', lat: 20.2670, lng: 86.6830, status: 'Normal', waitHours: 14, congestion: 'Low' },
    { id: 'INTUT', name: 'V.O. Chidambaranar (Tuticorin)', country: 'India', lat: 8.7642, lng: 78.1348, status: 'Normal', waitHours: 10, congestion: 'Low' },
    { id: 'INKRI', name: 'Krishnapatnam Port', country: 'India', lat: 14.2500, lng: 80.1167, status: 'Normal', waitHours: 11, congestion: 'Low' },
    { id: 'SGSIN', name: 'Singapore (Jurong Hub)', country: 'Singapore', lat: 1.29027, lng: 103.851959, status: 'Congestion', waitHours: 42, congestion: 'High' },
    { id: 'LKCMB', name: 'Colombo (Transshipment Hub)', country: 'Sri Lanka', lat: 6.9497, lng: 79.8430, status: 'Normal', waitHours: 18, congestion: 'Moderate' }
  ],

  // Compare Route Options (East Coast of India Corridor)
  routeOptions: [
    {
      id: 'A',
      name: 'Route A — Best Balanced',
      type: 'Best Balanced',
      cost: 16800,
      transitDays: 5.5,
      distanceNm: 1580,
      riskScore: 18,
      hazards: 0,
      budgetStatus: 'Within',
      isRecommended: true,
      badgeColor: 'teal',
      waypoints: ['Chennai Port (IN)', 'Coromandel Sea Lane', 'Great Nicobar Channel', 'Malacca Strait Entrance', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$9,200',
        canalAndPortFees: '$3,800',
        securityAndInsurance: '$2,100',
        handling: '$1,700',
        weatherWindow: 'Favorable (88% calm sea state)',
        co2Emissions: '92 MT'
      },
      coords: [
        [13.0827, 80.2928],
        [12.2, 83.5],
        [9.5, 87.8],
        [6.0, 94.2],
        [3.5, 98.8],
        [1.29027, 103.851959]
      ]
    },
    {
      id: 'B',
      name: 'Route B — Lowest Cost',
      type: 'Lowest Cost',
      cost: 14900,
      transitDays: 6.2,
      distanceNm: 1720,
      riskScore: 28,
      hazards: 1,
      budgetStatus: 'Within',
      isRecommended: false,
      badgeColor: 'amber',
      waypoints: ['Visakhapatnam (IN)', 'Central Bay Corridor', 'Andaman Approach', 'Malacca Strait', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$7,800',
        canalAndPortFees: '$3,600',
        securityAndInsurance: '$1,950',
        handling: '$1,550',
        weatherWindow: 'Moderate swell off Central Bay of Bengal',
        co2Emissions: '108 MT'
      },
      coords: [
        [17.6868, 83.2185],
        [15.5, 85.8],
        [11.2, 89.5],
        [6.5, 95.0],
        [2.5, 101.5],
        [1.29027, 103.851959]
      ]
    },
    {
      id: 'C',
      name: 'Route C — Fastest Express',
      type: 'Fastest',
      cost: 19200,
      transitDays: 4.8,
      distanceNm: 1650,
      riskScore: 22,
      hazards: 1,
      budgetStatus: 'Above',
      isRecommended: false,
      badgeColor: 'amber',
      waypoints: ['Haldia / Kolkata (IN)', 'Sandheads Deepwater Channel', 'Eastern Bay Direct', 'Northern Malacca', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$11,400',
        canalAndPortFees: '$4,100',
        securityAndInsurance: '$2,100',
        handling: '$1,600',
        weatherWindow: 'High cruise speed (18+ kts), light headwinds',
        co2Emissions: '124 MT'
      },
      coords: [
        [22.0330, 88.0670],
        [20.5, 88.8],
        [15.0, 91.5],
        [8.5, 96.0],
        [3.0, 100.0],
        [1.29027, 103.851959]
      ]
    },
    {
      id: 'D',
      name: 'Route D — Lowest Risk',
      type: 'Lowest Risk',
      cost: 18400,
      transitDays: 5.9,
      distanceNm: 1680,
      riskScore: 10,
      hazards: 0,
      budgetStatus: 'Within',
      isRecommended: false,
      badgeColor: 'teal',
      waypoints: ['Tuticorin (IN)', 'Gulf of Mannar', 'South Sri Lanka Safe Bypass', 'Equatorial Calm Track', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$10,500',
        canalAndPortFees: '$4,100',
        securityAndInsurance: '$2,100',
        handling: '$1,700',
        weatherWindow: 'Optimal wave height < 1.1m throughout',
        co2Emissions: '98 MT'
      },
      coords: [
        [8.7642, 78.1348],
        [6.5, 81.0],
        [4.8, 86.5],
        [3.5, 93.5],
        [1.8, 99.5],
        [1.29027, 103.851959]
      ]
    }
  ],

  // Section 8: Rerouting scenario
  reroutingScenario: {
    title: 'Severe Tropical Storm "ASANI" Warning',
    region: 'Central Bay of Bengal',
    severity: 'Critical',
    affectedVessel: 'MV Orient Mariner (Voyage #OM-408)',
    cargo: '1,200 MT Steel Rail Profiles & Agro-Fertilizers',
    departure: 'Visakhapatnam Port (East Coast of India)',
    destination: 'Singapore (Jurong)',
    originalRoute: {
      cost: 14900,
      etaDays: 6.2,
      riskScore: 68,
      status: 'Severe Risk (Intersects Storm Eye)',
      coords: [
        [17.6868, 83.2185],
        [15.0, 86.0],
        [13.5, 88.5],
        [9.0, 93.5],
        [4.5, 98.5],
        [1.29027, 103.851959]
      ]
    },
    alternativeRoute: {
      cost: 15650,
      etaDays: 6.6,
      riskScore: 19,
      status: 'Safe Avoidance Track (120nm South)',
      coords: [
        [17.6868, 83.2185],
        [14.0, 84.0],
        [10.5, 84.8],
        [6.0, 89.5],
        [3.5, 95.5],
        [1.29027, 103.851959]
      ]
    },
    hazardZone: {
      center: [13.5, 88.5],
      radiusKm: 320000,
      label: 'Cyclone ASANI Core (Gale Force > 55 kts)'
    },
    impactDelta: {
      costChange: '+$750 (+5.0%)',
      etaChange: '+0.4 days',
      riskChange: '-49 points (-72%)'
    },
    decisionHistory: [
      { id: 'DEC-091', timestamp: '2026-10-15 14:20 UTC', vessel: 'MV Coromandel Pioneer', route: 'Rerouted via Southern Nicobar Channel', reason: 'Avoided Cyclone ASANI squall line', savings: 'Prevented ~2.5 day delay' },
      { id: 'DEC-088', timestamp: '2026-10-14 09:10 UTC', vessel: 'MV Paradip Star', route: 'Deep sea corridor', reason: 'Paradip coastal congestion avoidance', savings: '$9,400 fuel optimization' },
      { id: 'DEC-082', timestamp: '2026-10-11 18:45 UTC', vessel: 'MV Bengal Voyager', route: 'Sandheads direct track', reason: 'Post-monsoon wave state < 1.5m', savings: 'Zero cargo damage report' }
    ]
  },

  // Table 6: Active Alerts
  alerts: [
    {
      id: 'ALT-101',
      title: 'Tropical storm warning (ASANI)',
      region: 'Central Bay of Bengal',
      severity: 'High',
      severityClass: 'crit',
      type: 'Severe Weather',
      date: '2026-10-16 08:30',
      status: 'Active',
      routesAffected: 'Route B, Visakhapatnam-Singapore Lane',
      area: '240 nm radius',
      duration: '48 hours remaining',
      description: 'Tropical storm advisory issued by IMD. Sustained wind speeds 45-55 knots with wave heights reaching 4.8 meters.',
      action: 'Alter course 4 degrees south to avoid heavy cyclonic swells. Maintain safety margin of 80 nm from system center.',
      lat: 13.5,
      lng: 88.5
    },
    {
      id: 'ALT-102',
      title: 'Sandheads squall advisory',
      region: 'Northern Bay of Bengal (Gangetic Outflow)',
      severity: 'Critical',
      severityClass: 'crit',
      type: 'Cyclone / Gale',
      date: '2026-10-16 06:15',
      status: 'Active',
      routesAffected: 'Kolkata/Haldia Outbound Channel',
      area: '180 nm radius',
      duration: '36 hours estimated',
      description: 'Severe oceanic disturbance causing heavy squalls and localized river discharge siltation in Sandheads anchorage.',
      action: 'Check pilotage boarding window and hold high-speed container departures until low tide surge subsides.',
      lat: 20.5,
      lng: 88.8
    },
    {
      id: 'ALT-103',
      title: 'Rough sea conditions & swell',
      region: 'Coromandel Coast / Palk Strait',
      severity: 'Medium',
      severityClass: 'warn',
      type: 'Sea State',
      date: '2026-10-16 04:00',
      status: 'Active',
      routesAffected: 'Route A, Chennai-Singapore feeder',
      area: '160 nm corridor',
      duration: '24 hours remaining',
      description: 'North-East monsoon surge generating wave heights of 3.2 to 3.8 meters off Tamil Nadu coast. Lashings check required.',
      action: 'Reduce speed to 13.5 knots. Inspect deck cargo container twistlocks before clearing coastal waters.',
      lat: 12.2,
      lng: 83.5
    },
    {
      id: 'ALT-104',
      title: 'Port congestion advisory',
      region: 'Singapore Port (Pasir Panjang / Jurong)',
      severity: 'Medium',
      severityClass: 'warn',
      type: 'Port Bottleneck',
      date: '2026-10-15 22:00',
      status: 'Active',
      routesAffected: 'All eastbound Asia arrivals from Bay of Bengal',
      area: 'Singapore outer anchorage',
      duration: '3 to 4 days ongoing',
      description: 'Berth waiting times elevated to 42 hours due to container yard capacity optimization and feeder bunching.',
      action: 'Coordinate with local terminal operator for virtual arrival slotting to reduce idle anchorage fuel burn.',
      lat: 1.25,
      lng: 103.8
    },
    {
      id: 'ALT-105',
      title: 'Monsoon swell warning',
      region: 'Malacca Strait northern entrance',
      severity: 'Low',
      severityClass: 'demo',
      type: 'Navigation Hazard',
      date: '2026-10-15 16:30',
      status: 'Active',
      routesAffected: 'Malacca inbound traffic from Great Nicobar',
      area: 'Local tidal strait',
      duration: '18 hours',
      description: 'Tidal cross-currents and localized heavy rain showers causing intermittent radar clutter.',
      action: 'Post extra bridge watchkeepers and monitor VHF Channel 16 for local VTS broadcasts.',
      lat: 5.5,
      lng: 97.2
    }
  ],

  // Tracked fleet on East Coast of India & Bay of Bengal
  vessels: [
    { id: 'V-01', name: 'MV Coromandel Pioneer', type: 'Container Ship', lat: 12.65, lng: 83.25, speed: '16.4 kts', heading: '115°', dest: 'Singapore', status: 'On Track' },
    { id: 'V-02', name: 'MV Orient Mariner', type: 'Bulk Carrier', lat: 14.80, lng: 85.40, speed: '13.8 kts', heading: '120°', dest: 'Singapore', status: 'Rerouting' },
    { id: 'V-03', name: 'MV Paradip Star', type: 'Reefer Vessel', lat: 17.40, lng: 85.20, speed: '14.8 kts', heading: '198°', dest: 'Colombo', status: 'On Track' },
    { id: 'V-04', name: 'MV Bengal Voyager', type: 'Container Ship', lat: 19.80, lng: 88.60, speed: '15.6 kts', heading: '145°', dest: 'Singapore', status: 'On Track' },
    { id: 'V-05', name: 'MV Tuticorin Pearl', type: 'Tanker (Chemical)', lat: 8.20, lng: 80.80, speed: '14.2 kts', heading: '095°', dest: 'Singapore', status: 'Caution' }
  ],

  // Saved Routes Table Data
  savedRoutes: [
    { id: 'SR-01', name: 'Chennai to Singapore — Coromandel Express Lane', origin: 'Chennai Port', dest: 'Singapore', cargo: 'High-Value Electronics', cost: '$16,800', transit: '5.5 d', risk: 18, lastSaved: '2026-10-14', badge: 'Active' },
    { id: 'SR-02', name: 'Visakhapatnam to Colombo Feeder', origin: 'Visakhapatnam', dest: 'Colombo', cargo: 'Steel Rail Profiles', cost: '$12,400', transit: '4.2 d', risk: 16, lastSaved: '2026-10-10', badge: 'Validated' },
    { id: 'SR-03', name: 'Kolkata / Haldia to Port Klang — Jute & Finished Goods', origin: 'Haldia', dest: 'Port Klang', cargo: 'General Cargo & Jute', cost: '$15,900', transit: '5.2 d', risk: 22, lastSaved: '2026-10-08', badge: 'Review' },
    { id: 'SR-04', name: 'Paradip to Singapore — Mining Pellets & Alumina', origin: 'Paradip', dest: 'Singapore', cargo: 'Pelletized Minerals', cost: '$17,200', transit: '5.8 d', risk: 24, lastSaved: '2026-10-02', badge: 'Active' },
    { id: 'SR-05', name: 'Tuticorin to Singapore — Chemical & Cold-Chain', origin: 'Tuticorin', dest: 'Singapore', cargo: 'Reefer & Fertilizers', cost: '$18,400', transit: '5.9 d', risk: 10, lastSaved: '2026-09-28', badge: 'Active' }
  ],

  // Table 7: Data Source Status
  dataSources: [
    { source: 'Cloud Firestore & Auth', status: 'Connected (Live)', tagClass: 'tag-live', note: 'Project: waypoint-maritime. Realtime synchronization enabled.' },
    { source: 'AIS vessel data', status: 'Connected (Live)', tagClass: 'tag-live', note: 'East Coast of India SAT-AIS fleet telemetry feed active.' },
    { source: 'Weather and hazard feeds', status: 'Live Telemetry', tagClass: 'tag-live', note: 'Open-Meteo Marine & NOAA NDBC Bay of Bengal ocean buoys.' },
    { source: 'Port information', status: 'Live Database', tagClass: 'tag-live', note: 'East Coast of India 18-port bathymetry and draft directory.' },
    { source: 'Maritime route data', status: 'Live Engine', tagClass: 'tag-live', note: 'Calculated geodesic waypoints & historical Bay of Bengal sea lanes.' }
  ],

  // AI Route Assistant Presets
  assistantPresets: [
    {
      q: 'Which route is safest for electronics cargo from Chennai to Singapore?',
      a: 'For electronics and high-value cargo from the East Coast, **Route A (Best Balanced)** from Chennai to Singapore is strongly recommended.\n\n• **Risk Score:** 18/100 (Clean route, zero active storm intersection)\n• **Estimated Cost:** $16,800 (Within benchmark budget)\n• **Transit Time:** 5.5 days (1,580 nm)\n• **Active Hazards:** 0 detected\n\nRoute A takes a direct corridor through the Great Nicobar Channel, maintaining wave heights under 1.4m and completely avoiding the cyclonic swell in the central Bay of Bengal.',
      suggestedAction: 'compare'
    },
    {
      q: 'What is the impact of Cyclone ASANI in the Bay of Bengal?',
      a: 'Tropical Cyclone ASANI is centered at **13.5°N, 88.5°E** in the Central Bay of Bengal with sustained winds of 55 knots.\n\n• **Affected Shipments:** 2 vessels in transit\n• **Direct Impact:** Route B from Visakhapatnam crosses the storm outer radius.\n• **Recommendation:** MV Orient Mariner is executing a 120nm southern diversion track (adding only 0.4 days) to maintain maximum safe clearance from gale-force winds.',
      suggestedAction: 'riskmap'
    },
    {
      q: 'Compare Route A (Chennai) vs Route B (Visakhapatnam) for cost and speed.',
      a: '**Route A (Chennai)** vs **Route B (Visakhapatnam)**:\n\n• **Transit Time:** Route A is 0.7 days faster (5.5 days vs 6.2 days).\n• **Cost:** Route B is $1,900 cheaper ($14,900 vs $16,800).\n• **Safety:** Route A has a substantially lower risk score (18 vs 28) and avoids the cyclonic swell zone in the central bay.\n\nFor guaranteed schedules and sensitive cargo, Route A via Chennai is the optimal choice.',
      suggestedAction: 'compare'
    }
  ]
};

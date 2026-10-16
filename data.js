// WAYPOINT — Maritime Route Intelligence | data.js
// All data points are based on the WAYPOINT ASD-STE100 Operator Manual (Demo Data)

window.WAYPOINT_DATA = {
  // Navigation links based on Table 1 & user roles
  navItems: {
    shared: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', sub: 'Maritime Overview' },
      { id: 'riskmap', label: 'Live Risk Map', icon: '🗺️', sub: 'Hazard & Route Monitor' },
      { id: 'alerts', label: 'Alerts Center', icon: '🚨', sub: 'Active Sea Warnings' },
      { id: 'saved', label: 'Saved Routes', icon: '📑', sub: 'Saved Lanes & Library' },
      { id: 'analytics', label: 'Analytics', icon: '📈', sub: 'Cost & Risk Metrics' },
      { id: 'assistant', label: 'Route Assistant', icon: '🤖', sub: 'AI Maritime Copilot' },
      { id: 'settings', label: 'Settings', icon: '⚙️', sub: 'Config & Data Sources' }
    ],
    shipper: [
      { id: 'plan', label: 'Plan a Shipment', icon: '📦', sub: 'Cargo & Lane Input' },
      { id: 'compare', label: 'Compare Routes', icon: '⚖️', sub: 'Cost & Risk Intelligence' }
    ],
    manager: [
      { id: 'rerouting', label: 'Rerouting Center', icon: '🔄', sub: 'Disruption & Alternate' },
      { id: 'plan', label: 'Plan a Shipment', icon: '📦', sub: 'Cargo & Lane Input' },
      { id: 'compare', label: 'Compare Routes', icon: '⚖️', sub: 'Cost & Risk Intelligence' }
    ]
  },

  // Table 3: Dashboard key figures
  dashboardKpis: [
    { id: 'activeShipments', label: 'Active Shipments', value: '128', icon: '🚢', trend: '+12% vs last mo', status: 'live' },
    { id: 'routesMonitored', label: 'Routes Monitored', value: '42', icon: '🧭', trend: 'Global sea lanes', status: 'live' },
    { id: 'shipmentsAtRisk', label: 'Shipments at Risk', value: '07', icon: '⚠️', trend: '3 critical hazards', status: 'crit' },
    { id: 'shippingCost', label: 'Estimated Shipping Cost', value: '$284,500', icon: '💰', trend: 'Current cycle', status: 'demo' },
    { id: 'transitTime', label: 'Average Transit Time', value: '14.6 days', icon: '⏱️', trend: '-1.2 days optimal', status: 'live' },
    { id: 'weatherAlerts', label: 'Active Weather Alerts', value: '05', icon: '🌊', trend: 'Arabian Sea / Malacca', status: 'warn' }
  ],

  // Key Ports referenced in Section 4 & 5
  ports: [
    { id: 'INNSA', name: 'Mumbai (Nhava Sheva)', country: 'India', lat: 18.9499, lng: 72.9515, status: 'Normal', waitHours: 14, congestion: 'Low' },
    { id: 'SGSIN', name: 'Singapore', country: 'Singapore', lat: 1.29027, lng: 103.851959, status: 'Congestion', waitHours: 42, congestion: 'High' },
    { id: 'LKCMB', name: 'Colombo', country: 'Sri Lanka', lat: 6.9497, lng: 79.8430, status: 'Normal', waitHours: 18, congestion: 'Moderate' },
    { id: 'NLRTM', name: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777, status: 'Normal', waitHours: 24, congestion: 'Moderate' },
    { id: 'CNSHA', name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737, status: 'Normal', waitHours: 28, congestion: 'Moderate' },
    { id: 'GBFXT', name: 'Felixstowe', country: 'United Kingdom', lat: 51.9617, lng: 1.3513, status: 'Normal', waitHours: 20, congestion: 'Low' },
    { id: 'AEDXB', name: 'Jebel Ali (Dubai)', country: 'UAE', lat: 25.0062, lng: 55.0617, status: 'Normal', waitHours: 16, congestion: 'Low' }
  ],

  // Table 4: Compare Route Options (Sample: Mumbai to Singapore)
  routeOptions: [
    {
      id: 'A',
      name: 'Route A — Best Balanced',
      type: 'Best Balanced',
      cost: 18400,
      transitDays: 12.5,
      distanceNm: 3250,
      riskScore: 24,
      hazards: 1,
      budgetStatus: 'Within',
      isRecommended: true,
      badgeColor: 'teal',
      waypoints: ['Nhava Sheva (IN)', 'Goa offshore', 'Colombo (LK)', 'Nicobar Strait', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$10,200',
        canalAndPortFees: '$4,100',
        securityAndInsurance: '$2,300',
        handling: '$1,800',
        weatherWindow: 'Favorable (85% calm)',
        co2Emissions: '142 MT'
      },
      coords: [
        [18.95, 72.95],
        [15.0, 73.5],
        [6.95, 79.84],
        [5.8, 85.0],
        [6.0, 94.0],
        [4.5, 98.5],
        [1.29, 103.85]
      ]
    },
    {
      id: 'B',
      name: 'Route B — Lowest Cost',
      type: 'Lowest Cost',
      cost: 15900,
      transitDays: 15.2,
      distanceNm: 3480,
      riskScore: 38,
      hazards: 2,
      budgetStatus: 'Within',
      isRecommended: false,
      badgeColor: 'amber',
      waypoints: ['Nhava Sheva (IN)', 'Cochin coastal', 'Galle deep south', 'Malacca entrance', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$8,400',
        canalAndPortFees: '$3,800',
        securityAndInsurance: '$2,100',
        handling: '$1,600',
        weatherWindow: 'Moderate swell in Bay of Bengal',
        co2Emissions: '168 MT'
      },
      coords: [
        [18.95, 72.95],
        [10.0, 75.2],
        [5.0, 80.5],
        [4.8, 88.0],
        [5.2, 95.0],
        [2.5, 101.5],
        [1.29, 103.85]
      ]
    },
    {
      id: 'C',
      name: 'Route C — Fastest',
      type: 'Fastest',
      cost: 22100,
      transitDays: 10.8,
      distanceNm: 3100,
      riskScore: 31,
      hazards: 2,
      budgetStatus: 'Above',
      isRecommended: false,
      badgeColor: 'amber',
      waypoints: ['Nhava Sheva (IN)', 'Direct Indian Ocean Corridor', 'Great Channel', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$13,800',
        canalAndPortFees: '$4,200',
        securityAndInsurance: '$2,400',
        handling: '$1,700',
        weatherWindow: 'High cruise speed, light headwinds',
        co2Emissions: '195 MT'
      },
      coords: [
        [18.95, 72.95],
        [12.0, 74.0],
        [7.0, 78.0],
        [6.0, 88.0],
        [5.5, 96.0],
        [3.0, 100.0],
        [1.29, 103.85]
      ]
    },
    {
      id: 'D',
      name: 'Route D — Lowest Risk',
      type: 'Lowest Risk',
      cost: 20300,
      transitDays: 13.1,
      distanceNm: 3360,
      riskScore: 12,
      hazards: 0,
      budgetStatus: 'Within',
      isRecommended: false,
      badgeColor: 'teal',
      waypoints: ['Nhava Sheva (IN)', 'South Western bypass', 'Equatorial calm corridor', 'Singapore Strait', 'Singapore (SG)'],
      breakdown: {
        bunkerCost: '$11,600',
        canalAndPortFees: '$4,300',
        securityAndInsurance: '$2,500',
        handling: '$1,900',
        weatherWindow: 'Optimal wave height < 1.2m throughout',
        co2Emissions: '155 MT'
      },
      coords: [
        [18.95, 72.95],
        [14.0, 71.5],
        [4.0, 76.0],
        [2.0, 84.0],
        [1.5, 93.0],
        [2.0, 99.5],
        [1.29, 103.85]
      ]
    }
  ],

  // Section 8: Rerouting Center simulation scenario (Table 5)
  reroutingScenario: {
    title: 'Severe Tropical Storm "ASANI" Warning',
    region: 'Central Bay of Bengal / Malacca Approach',
    severity: 'Critical',
    affectedVessel: 'MV Orient Mariner (Voyage #OM-408)',
    cargo: '1,200 MT Electronics & Industrial Machinery',
    departure: 'Mumbai (Nhava Sheva)',
    destination: 'Singapore (Jurong)',
    originalRoute: {
      cost: 18400,
      etaDays: 12.5,
      riskScore: 68,
      status: 'High Danger',
      color: '#F87171',
      coords: [
        [18.95, 72.95],
        [12.0, 75.0],
        [7.5, 82.0],
        [9.5, 88.5], // directly inside cyclone core
        [7.0, 95.0],
        [1.29, 103.85]
      ]
    },
    alternativeRoute: {
      cost: 19250,
      etaDays: 13.1,
      riskScore: 19,
      status: 'Safe Recommended',
      color: '#2DD4BF',
      coords: [
        [18.95, 72.95],
        [12.0, 73.0],
        [4.5, 78.5],
        [2.0, 84.0], // bypasses south around cyclone
        [1.5, 92.5],
        [1.8, 99.0],
        [1.29, 103.85]
      ]
    },
    hazardZone: {
      center: [9.5, 88.5],
      radiusKm: 420000,
      label: 'Cyclone Core (Gale Force > 55 kts)'
    },
    impactDelta: {
      costChange: '+$850 (+4.6%)',
      etaChange: '+0.6 days',
      riskChange: '-49 points (-72%)'
    },
    decisionHistory: [
      { id: 'DEC-091', timestamp: '2026-10-15 14:20 UTC', vessel: 'MV Pacific Crown', route: 'Rerouted via Sunda Strait', reason: 'Avoided Typhoon Mawar', savings: 'Prevented ~3.5 day delay' },
      { id: 'DEC-088', timestamp: '2026-10-14 09:10 UTC', vessel: 'Star Voyager', route: 'Deep sea corridor', reason: 'Port congestion avoidance', savings: '$12,400 fuel optimization' },
      { id: 'DEC-082', timestamp: '2026-10-11 18:45 UTC', vessel: 'Nordic Explorer', route: 'Equatorial route', reason: 'Monsoon sea state > 4.5m', savings: 'Zero cargo damage report' }
    ]
  },

  // Table 6: Active Alerts
  alerts: [
    {
      id: 'ALT-101',
      title: 'Tropical storm warning',
      region: 'Central Arabian Sea',
      severity: 'High',
      severityClass: 'crit',
      type: 'Severe Weather',
      date: '2026-10-16 08:30',
      status: 'Active',
      routesAffected: 'Route A, Mumbai-Dubai Express',
      area: '240 nm radius',
      duration: '48 hours remaining',
      description: 'Tropical storm advisory issued by IMD. Sustained wind speeds 45-55 knots with wave heights reaching 5.2 meters.',
      action: 'Alter course 3 degrees south to avoid heavy swells. Maintain safety margin of 60 nm from system center.',
      lat: 16.5,
      lng: 66.0
    },
    {
      id: 'ALT-102',
      title: 'Severe weather advisory',
      region: 'Western Indian Ocean',
      severity: 'Critical',
      severityClass: 'crit',
      type: 'Cyclone / Gale',
      date: '2026-10-16 06:15',
      status: 'Active',
      routesAffected: 'Suez-Colombo Main Lane',
      area: '380 nm radius',
      duration: '72 hours estimated',
      description: 'Severe oceanic disturbance causing heavy squalls and reduced visibility below 0.5 nautical miles.',
      action: 'Hold transit or divert vessels south of 4°N latitude until system transitions eastward.',
      lat: 5.2,
      lng: 62.8
    },
    {
      id: 'ALT-103',
      title: 'Rough sea conditions',
      region: 'Bay of Bengal',
      severity: 'Medium',
      severityClass: 'warn',
      type: 'Sea State',
      date: '2026-10-16 04:00',
      status: 'Active',
      routesAffected: 'Route B, Chennai-Singapore feeder',
      area: '180 nm corridor',
      duration: '24 hours remaining',
      description: 'Strong southwest monsoon surge generating wave heights of 3.8 to 4.2 meters. Container lashings check required.',
      action: 'Reduce speed to 12 knots. Inspect deck cargo lashings before entering affected quadrant.',
      lat: 11.8,
      lng: 86.4
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
      routesAffected: 'All eastbound Asia arrivals',
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
      region: 'Malacca Strait southern entrance',
      severity: 'Low',
      severityClass: 'info',
      type: 'Navigation Hazard',
      date: '2026-10-15 16:30',
      status: 'Active',
      routesAffected: 'Malacca outbound traffic',
      area: 'Local tidal strait',
      duration: '18 hours',
      description: 'Tidal cross-currents and localized heavy rain showers causing intermittent radar clutter.',
      action: 'Post extra bridge watchkeepers and monitor VHF Channel 16 for local VTS broadcasts.',
      lat: 2.1,
      lng: 102.2
    }
  ],

  // Vessels for Live Map Layer (AIS simulation)
  vessels: [
    { id: 'V-01', name: 'MV Pacific Pioneer', type: 'Container Ship', lat: 14.5, lng: 74.2, speed: '16.4 kts', heading: '145°', dest: 'Singapore', status: 'On Track' },
    { id: 'V-02', name: 'MV Orient Mariner', type: 'Bulk Carrier', lat: 9.8, lng: 84.1, speed: '13.8 kts', heading: '098°', dest: 'Singapore', status: 'Rerouting' },
    { id: 'V-03', name: 'Coral Sea Trader', type: 'Reefer Vessel', lat: 6.2, lng: 78.5, speed: '15.1 kts', heading: '085°', dest: 'Colombo', status: 'On Track' },
    { id: 'V-04', name: 'Atlantic Express', type: 'Container Ship', lat: 4.8, lng: 94.2, speed: '18.2 kts', heading: '102°', dest: 'Singapore', status: 'On Track' },
    { id: 'V-05', name: 'Nordic Horizon', type: 'Tanker (VLCC)', lat: 17.2, lng: 71.0, speed: '12.0 kts', heading: '190°', dest: 'Rotterdam', status: 'Caution' }
  ],

  // Saved Routes Table Data
  savedRoutes: [
    { id: 'SR-01', name: 'Mumbai to Singapore — Q4 Reefer Standard', origin: 'Mumbai (Nhava Sheva)', dest: 'Singapore', cargo: 'Refrigerated', cost: '$18,400', transit: '12.5 d', risk: 24, lastSaved: '2026-10-14', badge: 'Active' },
    { id: 'SR-02', name: 'Nhava Sheva to Felixstowe via Cape bypass', origin: 'Nhava Sheva', dest: 'Felixstowe', cargo: 'Containers', cost: '$44,200', transit: '28.4 d', risk: 18, lastSaved: '2026-10-10', badge: 'Validated' },
    { id: 'SR-03', name: 'Shanghai to Rotterdam — Direct Suez', origin: 'Shanghai', dest: 'Rotterdam', cargo: 'General Cargo', cost: '$38,900', transit: '24.1 d', risk: 42, lastSaved: '2026-10-08', badge: 'Review' },
    { id: 'SR-04', name: 'Colombo to Singapore Feeder Shuttle', origin: 'Colombo', dest: 'Singapore', cargo: 'Containers', cost: '$9,200', transit: '5.2 d', risk: 14, lastSaved: '2026-10-02', badge: 'Active' },
    { id: 'SR-05', name: 'Jebel Ali to Nhava Sheva Chemical Line', origin: 'Jebel Ali', dest: 'Mumbai', cargo: 'Liquid', cost: '$7,800', transit: '3.8 d', risk: 11, lastSaved: '2026-09-28', badge: 'Active' }
  ],

  // Table 7: Data Source Status
  dataSources: [
    { source: 'AIS vessel data', status: 'Not Connected', tagClass: 'tag-unavail', note: 'Requires verified SAT-AIS provider feed credentials.' },
    { source: 'Weather and hazard feeds', status: 'Demo Mode', tagClass: 'tag-demo', note: 'Simulated ECMWF & GFS tropical cyclone matrix.' },
    { source: 'Port information', status: 'Demo Mode', tagClass: 'tag-demo', note: 'UN/LOCODE port database with simulated queue times.' },
    { source: 'Maritime route data', status: 'Demo Mode', tagClass: 'tag-demo', note: 'Calculated geodesic waypoints & historical sea lanes.' }
  ],

  // Section 10: AI Route Assistant Presets
  assistantPresets: [
    {
      q: 'Which route is the safest for perishable cargo from Mumbai to Singapore?',
      a: 'For perishable or high-value cargo, **Route D (Lowest Risk)** is strongly recommended.\n\n• **Risk Score:** 12/100 (safest across all options)\n• **Estimated Cost:** $20,300 (Within budget)\n• **Transit Time:** 13.1 days\n• **Active Hazards:** 0 detected\n\nRoute D takes an equatorial corridor south of Sri Lanka, maintaining wave heights under 1.4m and completely avoiding the monsoon squall in the central Bay of Bengal.',
      suggestedAction: 'compare',
      recommendedRouteId: 'D'
    },
    {
      q: 'What is the impact of the tropical storm warning in the Bay of Bengal?',
      a: 'Tropical storm activity currently affects the northern entrance to the Malacca corridor.\n\n• **Affected Shipments:** 3 vessels in transit\n• **Direct Impact:** Route B crosses directly through high-swell quadrants (risk score 38/100).\n• **Recommendation:** Divert via the southern corridor (Route A or D) or delay departure by 36 hours for the system to weaken.',
      suggestedAction: 'riskmap'
    },
    {
      q: 'Compare Route A vs Route C for speed and cost.',
      a: '**Route A (Best Balanced)** vs **Route C (Fastest)**:\n\n• **Time Difference:** Route C is 1.7 days faster (10.8 days vs 12.5 days).\n• **Cost Difference:** Route C costs $3,700 more ($22,100 vs $18,400) and exceeds the benchmark budget.\n• **Safety:** Route A has a lower risk score (24 vs 31).\n\nUnless immediate shelf-life limits dictate express arrival, Route A yields 20% lower fuel burn and higher schedule reliability.',
      suggestedAction: 'compare',
      recommendedRouteId: 'A'
    }
  ]
};

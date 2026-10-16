// WAYPOINT — Maritime Route Intelligence | data.js
// All data points are based on the WAYPOINT ASD-STE100 Operator Manual (Demo Data)

window.WAYPOINT_DATA = {
  // Navigation links based on Table 1 & user roles
  navItems: {
    shared: [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', sub: 'Maritime Overview' },
      { id: 'tracker', label: 'Live Cargo Tracker', icon: '🛰️', sub: 'Ship GPS & Telematics', isLive: true },
      { id: 'riskmap', label: 'Live Risk Map', icon: '🗺️', sub: 'Hazard & Route Monitor' },
      { id: 'alerts', label: 'Alerts Center', icon: '🚨', sub: 'Active Sea Warnings' },
      { id: 'saved', label: 'Saved Routes', icon: '📑', sub: 'Saved Lanes & Library' },
      { id: 'analytics', label: 'Analytics', icon: '📈', sub: 'Cost & Risk Metrics' },
      { id: 'assistant', label: 'Route Assistant', icon: '🤖', sub: 'AI Maritime Copilot' },
      { id: 'settings', label: 'Settings', icon: '⚙️', sub: 'Config & Data Sources' }
    ],
    shipper: [
      { id: 'tracker', label: 'Live Cargo Tracker', icon: '🛰️', sub: 'Track Active Shipments', isLive: true },
      { id: 'plan', label: 'Plan a Shipment', icon: '📦', sub: 'Cargo & Lane Input' },
      { id: 'compare', label: 'Compare Routes', icon: '⚖️', sub: 'Cost & Risk Intelligence' }
    ],
    manager: [
      { id: 'tracker', label: 'Fleet & Cargo GPS', icon: '🛰️', sub: 'AIS Live Transponder', isLive: true },
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
    { id: 'V-01', name: 'MV Pacific Pioneer', type: 'Container Ship', lat: 14.542, lng: 74.265, speed: '16.4 kts', heading: '142°', dest: 'Singapore', status: 'On Track', imo: '9812402', flag: 'Singapore 🇸🇬', cargoId: 'CRG-8921-X' },
    { id: 'V-02', name: 'MV Orient Mariner', type: 'Bulk Carrier', lat: 9.800, lng: 84.100, speed: '13.8 kts', heading: '098°', dest: 'Singapore', status: 'Rerouting', imo: '9840114', flag: 'Liberia 🇱🇷', cargoId: 'CRG-5520-C' },
    { id: 'V-03', name: 'Coral Sea Trader', type: 'Reefer Vessel', lat: 6.210, lng: 78.520, speed: '15.1 kts', heading: '085°', dest: 'Singapore', status: 'On Track', imo: '9745120', flag: 'Panama 🇵🇦', cargoId: 'CRG-7740-R' },
    { id: 'V-04', name: 'Atlantic Express', type: 'Container Ship', lat: 4.800, lng: 94.200, speed: '18.2 kts', heading: '102°', dest: 'Rotterdam', status: 'On Track', imo: '9789341', flag: 'Malta 🇲🇹', cargoId: 'CRG-3312-L' },
    { id: 'V-05', name: 'Nordic Horizon', type: 'Heavy Lift / Tanker', lat: 21.735, lng: 64.308, speed: '12.0 kts', heading: '295°', dest: 'Jebel Ali (Dubai)', status: 'Caution', imo: '9698231', flag: 'Marshall Islands 🇲🇭', cargoId: 'CRG-4109-M' }
  ],

  // Tracked Cargos with Live GPS Telemetry, Shippers & Vessel Pairings
  trackedCargos: [
    {
      id: 'CRG-8921-X',
      blNumber: 'MAEU-9021481',
      bookingRef: 'BKG-2026-8812',
      title: 'High-Density Server Racks & Silicon Components',
      category: 'High-Value Electronics',
      shipper: 'TechFlow Global Logistics Ltd (Mumbai)',
      consignee: 'SingaData Cloud Centers Pte Ltd (Singapore)',
      weightTons: 450,
      containerType: '40ft HC ISO Dry (x18 TEU)',
      containerId: 'MSKU-982145-2',
      sealNumber: 'SEAL-88319-EU',
      originPort: { id: 'INNSA', name: 'Mumbai (Nhava Sheva)', country: 'India', lat: 18.9499, lng: 72.9515, departureTime: '2026-10-14 06:30 UTC' },
      destinationPort: { id: 'SGSIN', name: 'Singapore (Jurong)', country: 'Singapore', lat: 1.29027, lng: 103.851959, eta: '2026-10-21 16:45 UTC' },
      status: 'On Schedule — Optimal Corridor',
      statusClass: 'safe',
      totalDistanceNm: 3250,
      completedDistanceNm: 1280,
      remainingDistanceNm: 1970,
      progressPercent: 39.4,
      etaCountdown: '4d 06h 12m',
      etaFormatted: '21 Oct 2026, 16:45 UTC',
      ship: {
        id: 'V-01',
        name: 'MV Pacific Pioneer',
        type: 'Container Vessel (Post-Panamax)',
        imo: '9812402',
        mmsi: '563049200',
        callSign: '9V8921',
        flag: 'Singapore 🇸🇬',
        lengthM: 336,
        beamM: 45.6,
        draftM: 12.4,
        dwt: '94,500 DWT',
        heading: 142,
        speedKnots: 16.4,
        lat: 14.542,
        lng: 74.265,
        status: 'Underway using engine',
        navStatus: 'Underway — Open Water Transit',
        satellitesLocked: 14,
        hdop: 0.8,
        gpsSource: 'Inmarsat-C DGPS / Dual Galileo Lock',
        lastPingSeconds: 2
      },
      sensorData: {
        tempC: 22.4,
        tempTarget: 'Ambient (20°C - 25°C)',
        tempStatus: 'Normal',
        humidityPercent: 44,
        shockG: 0.04,
        doorStatus: 'Locked & Sealed',
        batteryReserve: 96,
        reeferPower: 'N/A (Standard Dry HC)'
      },
      seaConditions: {
        windKnots: 14,
        windDirection: 'NW (315°)',
        waveHeightM: 1.3,
        seaTempC: 28.4,
        barometerHpa: 1012.2,
        visibilityNm: 10,
        weatherStatus: 'Favorable Sea State'
      },
      milestones: [
        { name: 'Customs Clearance & Gate-In (Nhava Sheva)', time: '2026-10-13 18:20 UTC', done: true },
        { name: 'Vessel Departure & Pilot Disembarkation', time: '2026-10-14 07:15 UTC', done: true },
        { name: 'Goa Coastal Corridor Waypoint', time: '2026-10-17 04:30 UTC', done: true, current: true },
        { name: 'Colombo Deep South Waypoint', time: '2026-10-18 22:00 UTC', done: false },
        { name: 'Nicobar / Great Channel Inbound', time: '2026-10-20 11:30 UTC', done: false },
        { name: 'Singapore Strait Pilot Station & Berth', time: '2026-10-21 16:45 UTC', done: false }
      ],
      breadcrumbs: [
        { lat: 18.95, lng: 72.95, time: '14 Oct 07:00 UTC', speed: 10.2, heading: 210, label: 'Nhava Sheva Departure' },
        { lat: 17.80, lng: 73.10, time: '14 Oct 18:00 UTC', speed: 15.8, heading: 170, label: 'Konkan Coast South' },
        { lat: 16.50, lng: 73.50, time: '15 Oct 09:00 UTC', speed: 16.2, heading: 160, label: 'Ratnagiri Offshore' },
        { lat: 15.40, lng: 73.90, time: '16 Oct 01:00 UTC', speed: 16.5, heading: 150, label: 'Goa West Corridor' },
        { lat: 14.542, lng: 74.265, time: '17 Oct 03:00 UTC', speed: 16.4, heading: 142, label: 'Current GPS Lock' }
      ],
      routePlannedCoords: [
        [18.95, 72.95],
        [17.80, 73.10],
        [16.50, 73.50],
        [15.40, 73.90],
        [14.542, 74.265],
        [11.5, 75.3],
        [8.2, 77.2],
        [6.95, 79.84],
        [5.8, 85.0],
        [6.0, 94.0],
        [4.5, 98.5],
        [1.29, 103.85]
      ]
    },
    {
      id: 'CRG-7740-R',
      blNumber: 'CMAU-4819033',
      bookingRef: 'BKG-2026-9042',
      title: 'Temperature-Sensitive Vaccines & Biologics (-20°C)',
      category: 'Cold-Chain Pharmaceuticals',
      shipper: 'BioCure Pharma International Ltd (Colombo)',
      consignee: 'ASEAN Health Distribution Hub (Singapore)',
      weightTons: 120,
      containerType: '40ft High Cube ISO Active Reefer',
      containerId: 'CMAU-772910-1',
      sealNumber: 'PHARMA-SEAL-9011',
      originPort: { id: 'LKCMB', name: 'Colombo', country: 'Sri Lanka', lat: 6.9497, lng: 79.8430, departureTime: '2026-10-15 04:00 UTC' },
      destinationPort: { id: 'SGSIN', name: 'Singapore (Pasir Panjang)', country: 'Singapore', lat: 1.29027, lng: 103.851959, eta: '2026-10-19 22:30 UTC' },
      status: 'Cold Chain Verified — -19.8°C Steady',
      statusClass: 'safe',
      totalDistanceNm: 1580,
      completedDistanceNm: 680,
      remainingDistanceNm: 900,
      progressPercent: 43.0,
      etaCountdown: '2d 17h 45m',
      etaFormatted: '19 Oct 2026, 22:30 UTC',
      ship: {
        id: 'V-03',
        name: 'Coral Sea Trader',
        type: 'Reefer Vessel (Active Cold-Chain)',
        imo: '9745120',
        mmsi: '354918000',
        callSign: '3E4918',
        flag: 'Panama 🇵🇦',
        lengthM: 210,
        beamM: 32.2,
        draftM: 9.8,
        dwt: '28,400 DWT',
        heading: 85,
        speedKnots: 15.1,
        lat: 6.210,
        lng: 78.520,
        status: 'Underway using engine',
        navStatus: 'Underway — Equatorial Calm Corridor',
        satellitesLocked: 16,
        hdop: 0.7,
        gpsSource: 'Iridium SBD / Dual GNSS Multi-Band',
        lastPingSeconds: 3
      },
      sensorData: {
        tempC: -19.8,
        tempTarget: '-20.0°C (±0.5°C)',
        tempStatus: 'Optimal Cold-Chain',
        humidityPercent: 58,
        shockG: 0.02,
        doorStatus: 'Locked & Tamper-Verified',
        batteryReserve: 98,
        reeferPower: 'Auxiliary Genset 440V 60Hz Active'
      },
      seaConditions: {
        windKnots: 11,
        windDirection: 'W (270°)',
        waveHeightM: 1.1,
        seaTempC: 29.1,
        barometerHpa: 1011.8,
        visibilityNm: 12,
        weatherStatus: 'Equatorial Calm Waters'
      },
      milestones: [
        { name: 'Pharma Cold-Room Pre-Cooling & Loading', time: '2026-10-14 20:00 UTC', done: true },
        { name: 'Colombo Port Departure & Reefer Lock', time: '2026-10-15 04:30 UTC', done: true },
        { name: 'Southern Sri Lanka Deep Channel', time: '2026-10-16 14:00 UTC', done: true, current: true },
        { name: 'Mid Indian Ocean Equatorial Passage', time: '2026-10-18 06:00 UTC', done: false },
        { name: 'Malacca Southern Entrance & Berth', time: '2026-10-19 22:30 UTC', done: false }
      ],
      breadcrumbs: [
        { lat: 6.95, lng: 79.84, time: '15 Oct 04:30 UTC', speed: 9.5, heading: 220, label: 'Colombo Pilot Station' },
        { lat: 6.40, lng: 79.40, time: '15 Oct 14:00 UTC', speed: 14.8, heading: 150, label: 'Galle Offshore' },
        { lat: 5.90, lng: 80.50, time: '16 Oct 02:00 UTC', speed: 15.2, heading: 095, label: 'Dondra Head Bypass' },
        { lat: 6.210, lng: 78.520, time: '17 Oct 03:00 UTC', speed: 15.1, heading: 85, label: 'Current GPS Lock' }
      ],
      routePlannedCoords: [
        [6.95, 79.84],
        [6.40, 79.40],
        [5.90, 80.50],
        [6.210, 78.520],
        [5.8, 85.0],
        [5.5, 92.0],
        [4.8, 97.0],
        [2.5, 101.5],
        [1.29, 103.85]
      ]
    },
    {
      id: 'CRG-4109-M',
      blNumber: 'MSKU-6029118',
      bookingRef: 'BKG-2026-7104',
      title: 'Precision Heavy Powertrain Components & Turbochargers',
      category: 'Automotive & Heavy Machinery',
      shipper: 'Bharat Heavy Engineering Exports (Pune)',
      consignee: 'Emirates Industrial Machining LLC (Jebel Ali)',
      weightTons: 850,
      containerType: '40ft Open Top / Flat Rack (x32 TEU)',
      containerId: 'MSKU-440192-8',
      sealNumber: 'SEAL-54019-DXB',
      originPort: { id: 'INNSA', name: 'Mumbai (Nhava Sheva)', country: 'India', lat: 18.9499, lng: 72.9515, departureTime: '2026-10-15 10:00 UTC' },
      destinationPort: { id: 'AEDXB', name: 'Jebel Ali (Dubai)', country: 'UAE', lat: 25.0062, lng: 55.0617, eta: '2026-10-18 08:15 UTC' },
      status: 'On Approach — Gulf of Oman Inbound',
      statusClass: 'safe',
      totalDistanceNm: 1220,
      completedDistanceNm: 880,
      remainingDistanceNm: 340,
      progressPercent: 72.1,
      etaCountdown: '18h 30m',
      etaFormatted: '18 Oct 2026, 08:15 UTC',
      ship: {
        id: 'V-05',
        name: 'Nordic Horizon',
        type: 'Heavy Cargo / Container Carrier',
        imo: '9698231',
        mmsi: '538006190',
        callSign: 'V7AB8',
        flag: 'Marshall Islands 🇲🇭',
        lengthM: 260,
        beamM: 38.0,
        draftM: 11.2,
        dwt: '56,000 DWT',
        heading: 295,
        speedKnots: 14.1,
        lat: 21.735,
        lng: 64.308,
        status: 'Underway using engine',
        navStatus: 'Underway — Arabian Sea Northwest Crossing',
        satellitesLocked: 15,
        hdop: 0.8,
        gpsSource: 'FleetBroadband / SAT-AIS Class A',
        lastPingSeconds: 4
      },
      sensorData: {
        tempC: 29.2,
        tempTarget: 'Standard Dry Ambient (<40°C)',
        tempStatus: 'Normal',
        humidityPercent: 38,
        shockG: 0.08,
        doorStatus: 'Secured & Tarpaulin Checked',
        batteryReserve: 94,
        reeferPower: 'N/A'
      },
      seaConditions: {
        windKnots: 16,
        windDirection: 'NE (045°)',
        waveHeightM: 1.6,
        seaTempC: 27.8,
        barometerHpa: 1014.5,
        visibilityNm: 9,
        weatherStatus: 'Moderate Breeze, Good Visibility'
      },
      milestones: [
        { name: 'Heavy Lift Lashings & Surveyor Sign-Off', time: '2026-10-15 08:00 UTC', done: true },
        { name: 'Nhava Sheva Channel Departure', time: '2026-10-15 10:30 UTC', done: true },
        { name: 'Arabian Sea Central Deep Water Crossing', time: '2026-10-16 20:00 UTC', done: true, current: true },
        { name: 'Gulf of Oman Traffic Separation Scheme', time: '2026-10-17 18:00 UTC', done: false },
        { name: 'Strait of Hormuz Inbound & Jebel Ali Berth', time: '2026-10-18 08:15 UTC', done: false }
      ],
      breadcrumbs: [
        { lat: 18.95, lng: 72.95, time: '15 Oct 10:30 UTC', speed: 11.0, heading: 260, label: 'Mumbai Port Pilot Off' },
        { lat: 19.80, lng: 70.20, time: '16 Oct 04:00 UTC', speed: 14.5, heading: 285, label: 'Offshore Gujarat' },
        { lat: 20.90, lng: 67.40, time: '16 Oct 18:00 UTC', speed: 14.2, heading: 290, label: 'Northern Arabian Sea' },
        { lat: 21.735, lng: 64.308, time: '17 Oct 03:00 UTC', speed: 14.1, heading: 295, label: 'Current GPS Lock' }
      ],
      routePlannedCoords: [
        [18.95, 72.95],
        [19.80, 70.20],
        [20.90, 67.40],
        [21.735, 64.308],
        [23.5, 60.5],
        [25.0, 57.5],
        [25.0062, 55.0617]
      ]
    },
    {
      id: 'CRG-5520-C',
      blNumber: 'COSCO-3184902',
      bookingRef: 'BKG-2026-6310',
      title: 'Bifacial Solar Photovoltaic Modules & Inverters',
      category: 'CleanTech Solar PV',
      shipper: 'Apex Clean Energy Tech Ltd (Gujarat)',
      consignee: 'SolarVenture Asia Pacific Ltd (Singapore)',
      weightTons: 2400,
      containerType: '40ft HC ISO Dry (x96 TEU)',
      containerId: 'COSCO-190442-3',
      sealNumber: 'SEAL-90218-SOLAR',
      originPort: { id: 'INNSA', name: 'Mumbai (Nhava Sheva)', country: 'India', lat: 18.9499, lng: 72.9515, departureTime: '2026-10-13 14:00 UTC' },
      destinationPort: { id: 'SGSIN', name: 'Singapore (Jurong)', country: 'Singapore', lat: 1.29027, lng: 103.851959, eta: '2026-10-22 11:00 UTC' },
      status: 'Active Rerouting — Cyclone ASANI Southern Bypass',
      statusClass: 'warn',
      totalDistanceNm: 3450,
      completedDistanceNm: 1610,
      remainingDistanceNm: 1840,
      progressPercent: 46.7,
      etaCountdown: '5d 04h 20m',
      etaFormatted: '22 Oct 2026, 11:00 UTC',
      ship: {
        id: 'V-02',
        name: 'MV Orient Mariner',
        type: 'Multi-Purpose Bulk Carrier',
        imo: '9840114',
        mmsi: '636019400',
        callSign: 'A8TM4',
        flag: 'Liberia 🇱🇷',
        lengthM: 228,
        beamM: 36.5,
        draftM: 13.1,
        dwt: '63,500 DWT',
        heading: 98,
        speedKnots: 13.8,
        lat: 9.800,
        lng: 84.100,
        status: 'Rerouting',
        navStatus: 'Underway — Diversion 120nm South of Cyclone Core',
        satellitesLocked: 13,
        hdop: 0.9,
        gpsSource: 'Inmarsat-C / GPS High Precision',
        lastPingSeconds: 5
      },
      sensorData: {
        tempC: 26.8,
        tempTarget: 'Standard Dry Ambient',
        tempStatus: 'Normal',
        humidityPercent: 62,
        shockG: 0.12,
        doorStatus: 'Secured & Lashings Tightened',
        batteryReserve: 91,
        reeferPower: 'N/A'
      },
      seaConditions: {
        windKnots: 28,
        windDirection: 'SW (225°)',
        waveHeightM: 3.2,
        seaTempC: 28.1,
        barometerHpa: 1007.4,
        visibilityNm: 6,
        weatherStatus: 'Outer Swell Fringe (Safe Bypass Margin: 120 nm)'
      },
      milestones: [
        { name: 'Nhava Sheva Port Departure', time: '2026-10-13 14:30 UTC', done: true },
        { name: 'West India Coastal Corridor', time: '2026-10-14 22:00 UTC', done: true },
        { name: 'Cyclone ASANI Weather Advisory Reroute Triggered', time: '2026-10-15 14:20 UTC', done: true },
        { name: 'Bay of Bengal Deep South Corridor Passing', time: '2026-10-17 03:00 UTC', done: true, current: true },
        { name: 'Malacca Strait Entrance & Singapore Berthing', time: '2026-10-22 11:00 UTC', done: false }
      ],
      breadcrumbs: [
        { lat: 18.95, lng: 72.95, time: '13 Oct 14:30 UTC', speed: 10.5, heading: 200, label: 'Origin Departure' },
        { lat: 15.00, lng: 73.50, time: '14 Oct 16:00 UTC', speed: 14.2, heading: 165, label: 'Goa Coastal Corridor' },
        { lat: 7.50, lng: 82.00, time: '15 Oct 20:00 UTC', speed: 14.0, heading: 110, label: 'Reroute Alteration Point' },
        { lat: 9.800, lng: 84.100, time: '17 Oct 03:00 UTC', speed: 13.8, heading: 98, label: 'Current GPS Lock (Diversion)' }
      ],
      routePlannedCoords: [
        [18.95, 72.95],
        [15.00, 73.50],
        [7.50, 82.00],
        [9.800, 84.100],
        [4.5, 88.0],
        [2.0, 92.5],
        [1.8, 99.0],
        [1.29, 103.85]
      ]
    },
    {
      id: 'CRG-3312-L',
      blNumber: 'HLCU-7719204',
      bookingRef: 'BKG-2026-5402',
      title: 'GOTS-Certified Organic Raw Cotton Bales',
      category: 'Organic Textiles & Fibers',
      shipper: 'Orient Cotton Exporters Consortium (Shanghai)',
      consignee: 'EuroTex Global Spinning Mills (Rotterdam)',
      weightTons: 1800,
      containerType: '40ft HC ISO Dry (x72 TEU)',
      containerId: 'HLCU-882019-9',
      sealNumber: 'HAPAG-SEAL-44820',
      originPort: { id: 'CNSHA', name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737, departureTime: '2026-10-10 12:00 UTC' },
      destinationPort: { id: 'NLRTM', name: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777, eta: '2026-11-02 06:00 UTC' },
      status: 'On Track — Malacca Transit Inbound',
      statusClass: 'safe',
      totalDistanceNm: 10500,
      completedDistanceNm: 5610,
      remainingDistanceNm: 4890,
      progressPercent: 53.4,
      etaCountdown: '16d 02h 15m',
      etaFormatted: '02 Nov 2026, 06:00 UTC',
      ship: {
        id: 'V-04',
        name: 'Atlantic Express',
        type: 'Ultra Large Container Ship (ULCS)',
        imo: '9789341',
        mmsi: '229983000',
        callSign: '9HA4821',
        flag: 'Malta 🇲🇹',
        lengthM: 399,
        beamM: 58.8,
        draftM: 14.8,
        dwt: '198,000 DWT',
        heading: 102,
        speedKnots: 18.2,
        lat: 4.800,
        lng: 94.200,
        status: 'On Track',
        navStatus: 'Underway — Strait Transit Preparation',
        satellitesLocked: 17,
        hdop: 0.6,
        gpsSource: 'Dual SAT-AIS Class A / Galileo E1/E5',
        lastPingSeconds: 1
      },
      sensorData: {
        tempC: 25.1,
        tempTarget: 'Standard Dry Ambient (<30°C)',
        tempStatus: 'Normal',
        humidityPercent: 49,
        shockG: 0.03,
        doorStatus: 'Secured & Sealed',
        batteryReserve: 97,
        reeferPower: 'N/A'
      },
      seaConditions: {
        windKnots: 9,
        windDirection: 'SW (210°)',
        waveHeightM: 0.9,
        seaTempC: 29.5,
        barometerHpa: 1010.8,
        visibilityNm: 12,
        weatherStatus: 'Calm Sea State, Excellent Visibility'
      },
      milestones: [
        { name: 'Shanghai Yangshan Port Departure', time: '2026-10-10 12:30 UTC', done: true },
        { name: 'Taiwan Strait Southbound Transit', time: '2026-10-12 08:00 UTC', done: true },
        { name: 'South China Sea Main Corridor', time: '2026-10-14 16:00 UTC', done: true },
        { name: 'Northern Sumatra / Malacca Inbound', time: '2026-10-17 03:00 UTC', done: true, current: true },
        { name: 'Suez Canal Convoy Entry', time: '2026-10-25 18:00 UTC', done: false },
        { name: 'Rotterdam Maasvlakte Berthing', time: '2026-11-02 06:00 UTC', done: false }
      ],
      breadcrumbs: [
        { lat: 31.23, lng: 121.47, time: '10 Oct 12:30 UTC', speed: 12.0, heading: 140, label: 'Yangshan Pilot' },
        { lat: 22.00, lng: 118.50, time: '12 Oct 10:00 UTC', speed: 18.5, heading: 210, label: 'Taiwan Strait' },
        { lat: 12.00, lng: 112.00, time: '14 Oct 16:00 UTC', speed: 18.0, heading: 205, label: 'South China Sea' },
        { lat: 4.800, lng: 94.200, time: '17 Oct 03:00 UTC', speed: 18.2, heading: 102, label: 'Current GPS Lock' }
      ],
      routePlannedCoords: [
        [31.23, 121.47],
        [22.00, 118.50],
        [12.00, 112.00],
        [4.800, 94.200],
        [2.5, 101.5],
        [1.29, 103.85],
        [5.8, 85.0],
        [12.5, 44.0],
        [27.8, 34.0],
        [36.0, -5.3],
        [51.92, 4.48]
      ]
    }
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

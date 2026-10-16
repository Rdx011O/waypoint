# WAYPOINT: Route Calculation & Comparison Module

**Owner:** Member 3 (Route Calculation & Comparison)  
**Target Consumers:** Member 5 (Express Server / API), Member 1 (React Frontend), Member 4 (Weather / Hazard Rerouting)

---

## 1. Module Overview & Responsibilities

Given an origin port, a destination port, and a vessel specification, this module computes feasible maritime route candidates using the Eurostat maritime network, calculates voyage duration (ETA) and estimated operating/fuel costs, queries Member 4's risk scores, filters prohibited legs, normalizes metrics across candidates, and deterministically ranks and explains the optimal route.

### Architectural Boundaries
* **Member 1 (Frontend):** Consumes the returned JSON contract directly. Renders GeoJSON waypoints, comparison tables, and dynamic recommendation text.
* **Member 2 (Ship & Port Data):** Owns official master datasets for ports and vessels. Can feed data via CSV files or pass in-memory JavaScript objects directly to `compareRoutes()`.
* **Member 3 (This Module):** Pure, reusable calculation and ranking library. Exports pure functions. Zero HTTP routes, zero UI code, zero external network weather fetching.
* **Member 4 (Weather & Hazards):** Evaluates candidate route waypoints/passages and supplies risk scores (`riskScore`) and prohibition flags (`prohibited`, `reasons`).
* **Member 5 (Backend Server):** Imports `getRouteComparison()` or `compareRoutes()` inside Express route handlers and maps `RouteError.code` to HTTP status codes.

---

## 2. Public API Interface

The module exports two main functions:

```javascript
const { getRouteComparison, compareRoutes } = require('../services/routeService');
const { RouteError } = require('../utils/distance');
```

### High-Level API (CSV / File-Backed)
```javascript
const result = await getRouteComparison({
  originPortId: 'BOM',
  destinationPortId: 'SIN',
  vesselId: 'VESSEL_01',
  options: {
    maxRoutes: 3,
    weights: { cost: 0.40, time: 0.35, risk: 0.25 },
    bufferHours: 24,
    idleFuelTonnesPerDay: 3.0,
    fuelPriceUsdPerTonne: 650,
    portChargesUsd: 15000,
    distanceToleranceRatio: 0.05,
    riskProvider: async (route) => { ... },
  },
  dataDir: './backend/data', // optional, defaults to backend/data
});
```

### Low-Level API (In-Memory / Direct Object Injection)
Allows Member 5 to pass Member 2's cleaned database/cache records directly without reading CSV files from disk:
```javascript
const result = await compareRoutes({
  originPort: {
    portId: 'BOM',
    name: 'Mumbai',
    coordinates: [72.85, 18.95], // GeoJSON order: [lon, lat]
  },
  destinationPort: {
    portId: 'SIN',
    name: 'Singapore',
    coordinates: [103.85, 1.28], // GeoJSON order: [lon, lat]
  },
  vessel: {
    vesselId: 'VESSEL_01',
    name: 'Pacific Trader',
    speedKnots: 14.0,
    fuelConsumptionTonnesPerDay: 35.0,
    draftMeters: 12.5,
    dailyOperatingCostUsd: 15000,
  },
  costAssumptions: {
    fuel_price_usd_per_tonne: 650,
    idle_fuel_tonnes_per_day: 3.0,
    default_buffer_hours: 24,
    default_port_charges_usd: 15000,
    distance_tolerance_ratio: 0.05,
    weight_cost: 0.40,
    weight_time: 0.35,
    weight_risk: 0.25,
  },
  options: {
    maxRoutes: 3,
    riskProvider: myRiskService,
  },
});
```

---

## 3. Options & Parameters Specification

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `maxRoutes` | `number` | `5` | Maximum number of distinct maritime alternatives to evaluate. |
| `weights` | `object` | `{ cost: 0.40, time: 0.35, risk: 0.25 }` | Weights for multi-criteria ranking. Must be non-negative and sum to `1.0`. |
| `bufferHours` | `number` | `24` | Port turnaround, canal transit wait, and customs buffer time in hours. |
| `idleFuelTonnesPerDay` | `number` | `3.0` | Auxiliary engine / hotel generator fuel burn rate while idle or at berth (tonnes/day). |
| `fuelPriceUsdPerTonne` | `number` | `650` | Prevailing bunker fuel price (VLSFO) in USD per metric tonne. |
| `portChargesUsd` | `number` | `15000` | Port dues, pilotage, tugs, and line handling charges in USD. |
| `distanceToleranceRatio`| `number` | `0.05` | Maximum acceptable relative discrepancy between engine-reported distance and Haversine waypoint sum (5%). |
| `riskProvider` | `Function \| Object \| Map` | `null` | Risk integration provided by Member 4 (see Section 6). |

---

## 4. Standard Output Contract (JSON)

```json
{
  "origin": {
    "portId": "BOM",
    "name": "Mumbai",
    "coordinates": [72.85, 18.95]
  },
  "destination": {
    "portId": "SIN",
    "name": "Singapore",
    "coordinates": [103.85, 1.28]
  },
  "vesselId": "VESSEL_01",
  "generatedAt": "2026-10-16T15:55:31.210Z",
  "routes": [
    {
      "routeId": "route-1",
      "rank": 1,
      "recommended": true,
      "distanceNm": 2534.4,
      "engineDistanceNm": 2534.4,
      "sailingHours": 181.0,
      "sailingDays": 7.54,
      "totalDays": 8.54,
      "fuelTonnes": 267.0,
      "fuelCostUsd": 173553.16,
      "operatingCostUsd": 128144.94,
      "portChargesUsd": 15000.0,
      "totalCostUsd": 316698.1,
      "riskScore": 28.0,
      "riskKnown": true,
      "scores": {
        "cost": 0.0,
        "time": 0.0,
        "risk": 100.0,
        "total": 25.0
      },
      "passages": ["malacca"],
      "waypoints": [
        [72.845, 18.96],
        [72.8, 18.855],
        [103.725, 1.22375]
      ],
      "warnings": []
    }
  ],
  "excludedRoutes": [
    {
      "routeId": "route-3",
      "reasons": ["Severe typhoon advisory in Luzon Strait; path flagged prohibited by hazard module."]
    }
  ],
  "recommendation": {
    "routeId": "route-1",
    "explanation": "Route route-1 is recommended with the best composite score (25.0/100). Compared to runner-up route-2, it saves $83,846 (20.9% cheaper) and saves 53.3 h sailing time. The lowest-risk option is route-2 (risk score 18.5 vs 28.0), but route-1 delivers better overall economics."
  },
  "meta": {
    "candidateCount": 2,
    "weightsUsed": { "cost": 0.4, "time": 0.35, "risk": 0.25 },
    "assumptions": {
      "fuelPriceUsdPerTonne": 650,
      "idleFuelTonnesPerDay": 3,
      "bufferHours": 24,
      "portChargesUsd": 15000,
      "distanceToleranceRatio": 0.05,
      "vesselSpeedKnots": 14,
      "vesselFuelTonnesPerDay": 35,
      "vesselDraftMeters": 12.5
    },
    "notes": [],
    "disclaimer": "Estimates only. Figures are generated for strategic route comparison and decision support; they do not constitute certified freight quotes, bunker purchase commitments, or official navigational passage plans."
  }
}
```

---

## 5. Units, Coordinates, & Geodetic Rules

* **Coordinates Order:** Strict GeoJSON standard: `[longitude, latitude]`. Longitude $\in [-180, 180]$, Latitude $\in [-90, 90]$. Validated strictly at all boundary interfaces.
* **Speed & Distance Units:** Distance is reported in nautical miles (`nm`). Speed is reported in knots (`kn`). Time is reported in hours (`h`) and days (`d`, where $1\text{ d} = 24\text{ h}$).
* **Curvature & Antimeridian Crossing:**
  * Haversine formula uses international spherical standard Earth radius $R = 6,371,008.8\text{ m} / 1,852\text{ m/nm} \approx 3,440.0695\text{ nm}$.
  * Antimeridian longitude jumps ($|\Delta\lambda| > 180^\circ$) are normalized using $\Delta\lambda_{\text{rad}} = \operatorname{atan2}(\sin(\Delta\lambda), \cos(\Delta\lambda))$, ensuring that a 2-degree step across the 180th meridian (e.g. from $179^\circ\text{E}$ to $-179^\circ\text{W}$) is correctly measured as $\approx 120.08\text{ nm}$ rather than $21,494\text{ nm}$ across the rest of the planet.
* **Waypoints Cross-Check:** Every route returned by the routing engine has its waypoints summed via Haversine and compared against the engine's reported length. Discrepancies $> 5\%$ attach an explicit warning to `route.warnings`.

---

## 6. Risk Provider Contract (Member 4 Interface)

The module accepts an async or synchronous `riskProvider` callback or keyed Map:

```typescript
type RiskProvider = (route: {
  routeId: string;
  variant: string;
  waypoints: [number, number][];
  passages: string[];
  distanceNm: number;
  sailingHours: number;
}) => Promise<{
  riskScore: number | null; // scale 0-100, where 0 is safest
  prohibited: boolean;      // true if severe hazard blocks route
  reasons: string[];        // explanatory reasons for log/UI
}>;
```

### Risk Rules:
1. **`prohibited: true`**: Route is immediately excluded prior to min-max normalization, placed into `excludedRoutes`, and never recommended.
2. **Missing / null risk score**: Missing risk is **never** treated as 0 or safe. Route has `riskKnown: false`. Risk is excluded from scoring, ranking weights are redistributed across cost and time in proportion to their relative ratio, and an alert is recorded in `warnings` and `meta.notes`.

---

## 7. Cost & ETA Calculation Formulas

1. **Sailing Time:**
   $$\text{sailingHours} = \frac{\text{distanceNm}}{\text{speedKnots}}$$
   $$\text{sailingDays} = \frac{\text{sailingHours}}{24}$$
2. **Total Elapsed Time:**
   $$\text{totalDays} = \frac{\text{sailingHours} + \text{bufferHours}}{24}$$
3. **Fuel Burn:**
   $$\text{fuelTonnes} = (\text{sailingDays} \times \text{fuelConsumptionTonnesPerDay}) + \left(\frac{\text{bufferHours}}{24} \times \text{idleFuelTonnesPerDay}\right)$$
   *Buffer time burns fuel at the auxiliary `idleFuelTonnesPerDay` rate only, NOT at the sailing rate.*
4. **Financial Breakdown:**
   $$\text{fuelCostUsd} = \text{fuelTonnes} \times \text{fuelPriceUsdPerTonne}$$
   $$\text{operatingCostUsd} = \text{totalDays} \times \text{dailyOperatingCostUsd}$$
   $$\text{totalCostUsd} = \text{fuelCostUsd} + \text{operatingCostUsd} + \text{portChargesUsd}$$

---

## 8. Multi-Criteria Ranking & Normalization

1. **Normalization (Min-Max, lower is better):**
   $$\text{norm}(X_i) = \frac{X_i - X_{\min}}{X_{\max} - X_{\min}} \times 100$$
   *If all candidates share the same metric value ($X_{\max} == X_{\min}$) or only one candidate exists, $\text{norm}(X) = 0$ (avoiding divide-by-zero).*
2. **Composite Score:**
   $$\text{score} = (w_{\text{cost}} \times \text{norm}(C)) + (w_{\text{time}} \times \text{norm}(T)) + (w_{\text{risk}} \times \text{norm}(R))$$
3. **Deterministic Tie-Breaking:**
   Ties are broken in order:
   1. Lower composite score
   2. Lower total cost (`totalCostUsd`)
   3. Lower voyage time (`sailingHours`)
   4. Alphabetical `routeId`
4. **Dynamic Rationale Generation:**
   The recommendation text compares the winner against the runner-up and against the absolute shortest, cheapest, and safest candidates using real numbers, percentages, and trade-offs.

---

## 9. Typed Error Codes for Member 5 (HTTP Mapping)

All errors thrown by the module inherit from `RouteError` and expose a `.code` property:

| Error Code | Recommended HTTP Status | Trigger Condition |
| :--- | :--- | :--- |
| `INVALID_COORDINATES` | `400 Bad Request` | Coordinates are not numeric, non-array, or out of range. |
| `IDENTICAL_COORDINATES` | `400 Bad Request` | Origin and destination are identical or closer than 0.01 nm. |
| `UNKNOWN_PORT` | `404 Not Found` | Port ID not found in ports dataset. |
| `UNKNOWN_VESSEL` | `404 Not Found` | Vessel ID not found in vessels dataset. |
| `INVALID_SPEED` | `422 Unprocessable` | Vessel cruising speed is $\le 0$ or non-numeric. |
| `INVALID_FUEL_BURN` | `422 Unprocessable` | Fuel consumption is $< 0$ or non-numeric. |
| `INVALID_FUEL_PRICE` | `422 Unprocessable` | Fuel price is $< 0$ or non-numeric. |
| `INVALID_WEIGHTS` | `400 Bad Request` | Ranking weights are negative or do not sum to 1.0. |
| `NO_ROUTE_FOUND` | `422 Unprocessable` | No navigable maritime channel found (e.g. vessel draft exceeds canal limits). |
| `SNAP_FAILED` | `422 Unprocessable` | Coordinate is landlocked or too far from the Eurostat marnet network. |
| `MISSING_CSV_COLUMN` | `500 Server Error` | Input CSV is missing a mandatory column header. |

---

## 10. Known Assumptions & Limitations

1. **Topological Network Constraints:** The routing engine snaps points to the Eurostat maritime network (100 km grid). Snap distance from actual berths is reported in `originSnapKm` and `destinationSnapKm`.
2. **Canal Draft Gating:** Canals with published depth thresholds (e.g. Suez at 20.1 m, Panama at 15.2 m) will reject vessels whose draft exceeds these limits, automatically routing around alternative capes.
3. **Commercial Disclaimers:** All cost estimates assume constant sea state, standard fuel sulfur grades, and static auxiliary loads. Real voyage outlays vary with bunkering location, charter party clauses, and canal transit auction premiums.

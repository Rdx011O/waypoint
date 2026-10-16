# WAYPOINT Backend

Node.js + Express API for the WAYPOINT Smart Maritime Route Optimizer.

## Setup (Windows PowerShell)

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

API runs at `http://localhost:5000`.

## Endpoints

- `GET /` — API overview
- `GET /api/health` — health check
- `GET /api/ports` — available sample ports
- `GET /api/ships` — sample ship records
- `GET /api/routes?source=Mumbai&destination=Singapore` — compare candidate routes
- `POST /api/optimize` — compare routes using request options
- `GET /api/hazards?source=Mumbai&destination=Singapore` — show hazard flags

### Example POST body

```json
{
  "source": "Mumbai",
  "destination": "Singapore",
  "cargoTons": 20,
  "budgetUsd": 5000,
  "shipSpeedKnots": 14
}
```

## Team integration contract

- Member 1 (frontend): call these endpoints; do not duplicate route-ranking logic in React.
- Member 2 (data): update `src/data/demoData.js`, or tell Member 5 the final dataset schema before changing it.
- Member 3 (routing): replace `src/services/routeService.js`; keep `getCandidateRoutes(sourcePort, destinationPort)` returning route objects with `id`, `name`, `via`, `distanceNm`, `baseEtaDays`, `baseOperatingCostUsd`, `riskLevel`, and `demoHazardIds` until the team agrees to change the contract.
- Member 4 (hazards): replace `src/services/hazardService.js`; keep `detectHazards(route)` returning an array of hazard objects with at least `id`, `type`, and `severity`.
- Member 5 (integration): own `server.js`, validate API responses, review PRs, and keep the API contract documented.

## Important limitations

All route catalogues, ship records, costs, times and hazard flags currently in this repository are illustrative demo data. They are not live tracking, verified navigable routes, official alerts, or carrier freight quotes. Do not use them for real navigation or operational decisions. Replace the demo catalogue with validated maritime routing and weather sources before presenting outputs as real.

## Git collaboration

Use one shared GitHub repository. Each member works on their own branch, commits, and opens a pull request. Do not all edit `server.js` at the same time.

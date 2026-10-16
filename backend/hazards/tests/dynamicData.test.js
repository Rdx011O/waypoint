const { getPorts, findPort, getShips, getTradeLinks, getAlerts } = require("../../src/services/dataService");
const { getCandidateRoutes, getCandidateRoutesAsync } = require("../../src/services/routeService");
const { detectHazards, detectHazardsAsync, evaluateRouteHazards } = require("../../src/services/hazardService");
const { optimizeRoutes } = require("../../src/services/optimizer");

describe("Dynamic Data & Route Services (Zero Hardcoded Data)", () => {
  describe("dataService dynamic fetching from Firebase Firestore", () => {
    test("fetches all ports dynamically with valid schema", async () => {
      const ports = await getPorts();
      expect(Array.isArray(ports)).toBe(true);
      expect(ports.length).toBeGreaterThan(0);

      const firstPort = ports[0];
      expect(firstPort).toHaveProperty("id");
      expect(firstPort).toHaveProperty("name");
      expect(firstPort).toHaveProperty("country");
      expect(firstPort).toHaveProperty("latitude");
      expect(firstPort).toHaveProperty("longitude");
      expect(typeof firstPort.latitude).toBe("number");
      expect(typeof firstPort.longitude).toBe("number");
    }, 15000);

    test("findPort finds ports dynamically by case-insensitive name or UN/LOCODE", async () => {
      const kolkata = await findPort("kolkata");
      expect(kolkata).not.toBeNull();
      expect(kolkata.name.toLowerCase()).toContain("kolkata");

      const singapore = await findPort("singapore");
      expect(singapore).not.toBeNull();
      expect(singapore.name.toLowerCase()).toContain("singapore");
    }, 15000);

    test("fetches vessel types dynamically", async () => {
      const ships = await getShips();
      expect(Array.isArray(ships)).toBe(true);
      expect(ships.length).toBeGreaterThan(0);
      expect(ships[0]).toHaveProperty("id");
      expect(ships[0]).toHaveProperty("name");
    }, 15000);

    test("fetches trade links and alerts dynamically", async () => {
      const tradeLinks = await getTradeLinks();
      expect(Array.isArray(tradeLinks)).toBe(true);
      expect(tradeLinks.length).toBeGreaterThan(0);

      const alerts = await getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    }, 15000);
  });

  describe("routeService dynamic candidate generation", () => {
    test("dynamically calculates candidate routes for any arbitrary port pair", async () => {
      const source = { id: "INCCU", name: "Kolkata", latitude: 22.54, longitude: 88.32 };
      const destination = { id: "SGSIN", name: "Singapore", latitude: 1.264, longitude: 103.84 };

      const candidates = await getCandidateRoutesAsync(source, destination);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBe(2);

      const [direct, detour] = candidates;
      expect(direct.id).toContain("DIR");
      expect(direct.distanceNm).toBeGreaterThan(1000);
      expect(direct.baseEtaDays).toBeGreaterThan(0);
      expect(direct.baseOperatingCostUsd).toBeGreaterThan(0);
      expect(direct.waypoints.length).toBeGreaterThan(2);

      expect(detour.id).toContain("ALT");
      expect(detour.distanceNm).toBeGreaterThan(direct.distanceNm);
    });

    test("returns empty array when source or destination is missing", () => {
      expect(getCandidateRoutes(null, null)).toEqual([]);
    });
  });

  describe("hazardService dynamic detection", () => {
    test("detects hazards when route intersects active danger radius", () => {
      const alert = {
        id: "ALERT-TEST-01",
        type: "Tropical Cyclone",
        severity: "High",
        lat: 10.0,
        lon: 85.0,
        radiusKm: 200,
        description: "Test cyclone alert"
      };

      const intersectingRoute = {
        waypoints: [
          { lat: 9.8, lon: 84.8 },
          { lat: 10.2, lon: 85.2 }
        ]
      };

      const detected = evaluateRouteHazards(intersectingRoute, [alert]);
      expect(detected.length).toBe(1);
      expect(detected[0].id).toBe("ALERT-TEST-01");
      expect(detected[0].severity).toBe("High");
    });

    test("does not flag hazards when route is far outside danger radius", () => {
      const alert = {
        id: "ALERT-TEST-02",
        type: "Gale Warning",
        severity: "Medium",
        lat: 10.0,
        lon: 85.0,
        radiusKm: 100
      };

      const distantRoute = {
        waypoints: [
          { lat: 25.0, lon: 60.0 },
          { lat: 26.0, lon: 61.0 }
        ]
      };

      const detected = evaluateRouteHazards(distantRoute, [alert]);
      expect(detected.length).toBe(0);
    });
  });

  describe("optimizer with dynamic routes", () => {
    test("ranks routes properly prioritizing safety and efficiency", () => {
      const routes = [
        {
          id: "R1",
          name: "Direct",
          distanceNm: 2000,
          baseEtaDays: 6,
          baseOperatingCostUsd: 3000,
          riskLevel: "High",
          hazards: [{ severity: "High" }]
        },
        {
          id: "R2",
          name: "Safe Detour",
          distanceNm: 2200,
          baseEtaDays: 6.5,
          baseOperatingCostUsd: 3300,
          riskLevel: "Low",
          hazards: []
        }
      ];

      const result = optimizeRoutes(routes);
      expect(result.recommendedRouteId).toBe("R2");
      expect(result.routes[0].recommended).toBe(true);
      expect(result.routes[0].id).toBe("R2");
    });
  });
});

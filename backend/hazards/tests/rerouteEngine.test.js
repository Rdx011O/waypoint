const { calculateWeatherReroute } = require("../rerouteEngine");

describe("Weather Rerouting Engine (hazards/rerouteEngine.js)", () => {
  const mumbai = { name: "Mumbai (Nhava Sheva)", lat: 18.95, lon: 72.95 };
  const singapore = { name: "Singapore (Jurong)", lat: 1.26, lon: 103.84 };

  test("calculates weather rerouting scenario for Mumbai -> Singapore corridor", async () => {
    const result = await calculateWeatherReroute(mumbai, singapore, { shipSpeedKnots: 14 });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("hazardZone");
    expect(result.hazardZone).toHaveProperty("center");
    expect(result.hazardZone.radiusKm).toBeGreaterThan(200);

    // Original track
    expect(result.originalRoute).toBeDefined();
    expect(result.originalRoute.coords.length).toBeGreaterThan(5);
    expect(result.originalRoute.distanceNm).toBeGreaterThan(2000);
    expect(result.originalRoute.riskScore).toBeGreaterThan(50); // Severe hazard

    // Alternative safe bypass track
    expect(result.alternativeRoute).toBeDefined();
    expect(result.alternativeRoute.coords.length).toBeGreaterThan(5);
    expect(result.alternativeRoute.distanceNm).toBeGreaterThan(result.originalRoute.distanceNm);
    expect(result.alternativeRoute.riskScore).toBeLessThan(30); // Safe track

    // Operational impact deltas
    expect(result.impactDelta).toBeDefined();
    expect(result.impactDelta.costChange).toMatch(/^\+\$/);
    expect(result.impactDelta.etaChange).toMatch(/^\+\d/);
    expect(result.impactDelta.riskChange).toMatch(/-\d+/);
  }, 15000);

  test("properly shifts apex waypoint outside danger clearance buffer", async () => {
    const chennai = { name: "Chennai", lat: 13.09, lon: 80.29 };
    const result = await calculateWeatherReroute(chennai, singapore, { shipSpeedKnots: 16 });

    expect(result.success).toBe(true);
    expect(result.alternativeRoute.isRecommended).toBe(true);
    expect(result.originalRoute.isRecommended).toBe(false);
    expect(result.weatherVerification.thresholdExceeded).toBe(true);
  }, 15000);
});

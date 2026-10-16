const geo = require("../geo");
const CONFIG = require("../config");

describe("Maritime Geo Utilities (geo.js)", () => {
  const mumbai = { lat: 18.94, lon: 72.84 };
  const singapore = { lat: 1.26, lon: 103.84 };
  const colombo = { lat: 6.93, lon: 79.84 };

  describe("Unit conversions", () => {
    test("converts km to nautical miles accurately", () => {
      expect(geo.kmToNm(1.852)).toBeCloseTo(1.0, 4);
      expect(geo.kmToNm(0)).toBe(0);
    });

    test("converts nautical miles to km accurately", () => {
      expect(geo.nmToKm(1.0)).toBeCloseTo(1.852, 4);
      expect(geo.nmToKm(100)).toBeCloseTo(185.2, 4);
    });

    test("normalizes longitudes properly", () => {
      expect(geo.normalizeLongitude(180)).toBe(180);
      expect(geo.normalizeLongitude(-180)).toBe(-180);
      expect(geo.normalizeLongitude(190)).toBe(-170);
      expect(geo.normalizeLongitude(-190)).toBe(170);
      expect(geo.normalizeLongitude(360)).toBe(0);
    });
  });

  describe("haversineDistance", () => {
    test("returns 0 for identical points", () => {
      expect(geo.haversineDistance(mumbai, mumbai)).toBe(0);
    });

    test("calculates realistic Mumbai to Singapore distance (~3,900 km / ~2,100 NM)", () => {
      const distKm = geo.haversineDistance(mumbai, singapore);
      const distNm = geo.kmToNm(distKm);

      // Known great-circle distance between Mumbai and Singapore is ~3,910 km (~2,111 NM)
      expect(distKm).toBeGreaterThan(3850);
      expect(distKm).toBeLessThan(3950);
      expect(distNm).toBeGreaterThan(2080);
      expect(distNm).toBeLessThan(2140);
    });

    test("handles antimeridian crossing correctly without wrapping around the globe", () => {
      const westOfDateLine = { lat: 0, lon: 179.0 };
      const eastOfDateLine = { lat: 0, lon: -179.0 };

      // 2 degrees longitude difference at the equator is ~222.4 km, NOT ~39,800 km
      const distKm = geo.haversineDistance(westOfDateLine, eastOfDateLine);
      expect(distKm).toBeCloseTo(222.39, 0);
    });

    test("throws an error for missing or invalid coordinates", () => {
      expect(() => geo.haversineDistance(null, mumbai)).toThrow();
      expect(() => geo.haversineDistance(mumbai, { lat: "invalid", lon: 72 })).toThrow();
    });
  });

  describe("calculateRouteDistanceKm and calculateRouteDistanceNm", () => {
    test("returns 0 for empty or single waypoint routes", () => {
      expect(geo.calculateRouteDistanceKm([])).toBe(0);
      expect(geo.calculateRouteDistanceKm([mumbai])).toBe(0);
    });

    test("sums multiple legs accurately", () => {
      const leg1 = geo.haversineDistance(mumbai, colombo);
      const leg2 = geo.haversineDistance(colombo, singapore);
      const total = geo.calculateRouteDistanceKm([mumbai, colombo, singapore]);

      expect(total).toBeCloseTo(leg1 + leg2, 4);
      expect(geo.calculateRouteDistanceNm([mumbai, colombo, singapore])).toBeCloseTo(geo.kmToNm(total), 4);
    });
  });

  describe("interpolateGreatCircle", () => {
    test("fraction 0 returns start and fraction 1 returns end", () => {
      const start = geo.interpolateGreatCircle(mumbai, singapore, 0);
      const end = geo.interpolateGreatCircle(mumbai, singapore, 1);

      expect(start.lat).toBeCloseTo(mumbai.lat, 4);
      expect(start.lon).toBeCloseTo(mumbai.lon, 4);
      expect(end.lat).toBeCloseTo(singapore.lat, 4);
      expect(end.lon).toBeCloseTo(singapore.lon, 4);
    });

    test("fraction 0.5 produces a point equidistant from start and end", () => {
      const mid = geo.interpolateGreatCircle(mumbai, singapore, 0.5);
      const d1 = geo.haversineDistance(mumbai, mid);
      const d2 = geo.haversineDistance(mid, singapore);
      const total = geo.haversineDistance(mumbai, singapore);

      expect(d1).toBeCloseTo(d2, 1);
      expect(d1 + d2).toBeCloseTo(total, 1);
    });

    test("interpolates across the antimeridian seamlessly", () => {
      const p1 = { lat: 10, lon: 179 };
      const p2 = { lat: 10, lon: -179 };
      const mid = geo.interpolateGreatCircle(p1, p2, 0.5);

      expect(mid.lat).toBeCloseTo(10, 2);
      expect(Math.abs(mid.lon)).toBeCloseTo(180, 2);
    });
  });

  describe("densifyRoute", () => {
    test("handles edge cases: empty array and single point", () => {
      expect(geo.densifyRoute([])).toEqual([]);
      expect(geo.densifyRoute([mumbai])).toEqual([{ lat: mumbai.lat, lon: mumbai.lon }]);
    });

    test("does not over-interpolate legs already smaller than stepKm", () => {
      const close1 = { lat: 18.90, lon: 72.80 };
      const close2 = { lat: 18.95, lon: 72.85 };
      const densified = geo.densifyRoute([close1, close2], 50);

      expect(densified.length).toBe(2);
      expect(densified[0].lat).toBeCloseTo(close1.lat, 4);
      expect(densified[1].lat).toBeCloseTo(close2.lat, 4);
    });

    test("interpolates long legs so every adjacent pair is <= stepKm", () => {
      const stepKm = 50;
      const densified = geo.densifyRoute([mumbai, colombo], stepKm);

      expect(densified.length).toBeGreaterThan(20);

      // Verify that no consecutive points are farther apart than stepKm (+ slight numerical margin)
      for (let i = 0; i < densified.length - 1; i++) {
        const segDist = geo.haversineDistance(densified[i], densified[i + 1]);
        expect(segDist).toBeLessThanOrEqual(stepKm + 1.0);
      }

      // Check endpoints
      expect(densified[0].lat).toBeCloseTo(mumbai.lat, 4);
      expect(densified[densified.length - 1].lat).toBeCloseTo(colombo.lat, 4);
    });
  });

  describe("pointInCircle", () => {
    const center = { lat: 15.0, lon: 68.0 };
    const radiusKm = 200;

    test("returns true for points inside the circle", () => {
      expect(geo.pointInCircle(center, center, radiusKm)).toBe(true);
      const insidePoint = { lat: 15.5, lon: 68.2 }; // ~60 km away
      expect(geo.pointInCircle(insidePoint, center, radiusKm)).toBe(true);
    });

    test("returns false for points outside the circle", () => {
      const outsidePoint = { lat: 18.0, lon: 72.0 }; // ~500 km away
      expect(geo.pointInCircle(outsidePoint, center, radiusKm)).toBe(false);
    });

    test("handles edge cases gracefully", () => {
      expect(geo.pointInCircle(null, center, radiusKm)).toBe(false);
      expect(geo.pointInCircle(center, null, radiusKm)).toBe(false);
    });
  });

  describe("initialBearing, destinationPoint, and offsetPoint", () => {
    test("computes cardinal bearings accurately", () => {
      const origin = { lat: 0, lon: 0 };
      expect(geo.initialBearing(origin, { lat: 10, lon: 0 })).toBeCloseTo(0, 1);   // North
      expect(geo.initialBearing(origin, { lat: 0, lon: 10 })).toBeCloseTo(90, 1);  // East
      expect(geo.initialBearing(origin, { lat: -10, lon: 0 })).toBeCloseTo(180, 1); // South
      expect(geo.initialBearing(origin, { lat: 0, lon: -10 })).toBeCloseTo(270, 1); // West
    });

    test("computes destinationPoint at specified distance and bearing", () => {
      const start = { lat: 10.0, lon: 60.0 };
      const distKm = 100;
      const northPoint = geo.destinationPoint(start, distKm, 0);

      expect(geo.haversineDistance(start, northPoint)).toBeCloseTo(distKm, 1);
      expect(northPoint.lat).toBeGreaterThan(start.lat);
      expect(northPoint.lon).toBeCloseTo(start.lon, 2);
    });

    test("computes starboard (+90 deg) and port (-90 deg) perpendicular offsets", () => {
      const waypoint = { lat: 15.0, lon: 65.0 };
      const headingEast = 90; // heading east
      const offsetDistance = 150; // km

      // Heading east (90°): Starboard (+90°) is South (180°), Port (-90°) is North (0°)
      const starboardPt = geo.offsetPoint(waypoint, headingEast, offsetDistance, "starboard");
      const portPt = geo.offsetPoint(waypoint, headingEast, offsetDistance, "port");

      expect(geo.haversineDistance(waypoint, starboardPt)).toBeCloseTo(offsetDistance, 1);
      expect(geo.haversineDistance(waypoint, portPt)).toBeCloseTo(offsetDistance, 1);

      expect(starboardPt.lat).toBeLessThan(waypoint.lat); // south
      expect(portPt.lat).toBeGreaterThan(waypoint.lat);  // north
    });
  });
});

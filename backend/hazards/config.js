/**
 * Maritime Hazard & Weather Configuration
 * Centralized settings, thresholds, and conversion factors.
 */

const CONFIG = {
  // Planetary & Distance Constants
  EARTH_RADIUS_KM: 6371.0,
  KM_PER_NM: 1.852,
  NM_PER_KM: 1 / 1.852,

  // Route Densification & Sampling
  DEFAULT_DENSIFY_STEP_KM: 50, // Densify every ~50 km so no hazards between waypoints are missed
  LIVE_SAMPLING_STEP_KM: 150,  // Sample live wave/wind every ~150 km to avoid API rate limits

  // Vessel Defaults
  DEFAULT_SPEED_KNOTS: 14,     // Typical commercial container / cargo cruise speed in knots

  // Detour & Avoidance Geometry
  DEFAULT_DETOUR_MARGIN_KM: 50, // Added buffer outside danger radius when generating detours
  DEFAULT_CYCLONE_RADIUS_KM: 300,

  // Hazard Scoring Thresholds (Assumptions based on maritime guidelines)
  THRESHOLDS: {
    // Wave significant height (meters)
    WAVE: {
      LOW_MAX: 2.5,     // < 2.5 m
      MEDIUM_MAX: 4.0,  // 2.5 - 4.0 m
      HIGH_MAX: 6.0,    // 4.0 - 6.0 m
      // > 6.0 m is SEVERE
    },

    // Wind speed (knots)
    WIND: {
      LOW_MAX: 25,      // < 25 kn
      MEDIUM_MAX: 34,   // 25 - 34 kn (near gale)
      HIGH_MAX: 48,     // 34 - 48 kn (gale to storm force)
      // > 48 kn is SEVERE (violent storm to hurricane force)
    },

    // Cyclone proximity rules relative to danger radius R (km)
    CYCLONE: {
      CORE_RATIO: 0.5,           // <= 0.5 * R is SEVERE (eye / core hurricane-force)
      DANGER_BUFFER_KM: 200,     // within 200 km outside radius R is MEDIUM
    }
  },

  // Numerical Severity Weights (for composite riskScore 0 - 100)
  SEVERITY_WEIGHTS: {
    LOW: 10,
    MEDIUM: 35,
    HIGH: 70,
    SEVERE: 100
  },

  // Live Data Settings
  LIVE: {
    REQUEST_TIMEOUT_MS: 8000,           // 8s timeout
    CACHE_TTL_MS: 10 * 60 * 1000,       // 10-minute in-memory cache
    OPEN_METEO_MARINE_URL: "https://marine-api.open-meteo.com/v1/marine",
    OPEN_METEO_WEATHER_URL: "https://api.open-meteo.com/v1/forecast",
    GDACS_FEED_URL: "https://www.gdacs.org/xml/rss.xml"
  }
};

module.exports = CONFIG;

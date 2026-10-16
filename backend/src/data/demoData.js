/**
 * WAYPOINT Maritime Data Provider
 * 
 * Replaced static hardcoded arrays with dynamic data fetching from Firebase Firestore & CSV dataset.
 * All ports and vessels are loaded dynamically via dataService.
 */

const dataService = require("../services/dataService");

module.exports = {
  getPorts: dataService.getPorts,
  getShips: dataService.getShips,
  findPort: dataService.findPort,
  getTradeLinks: dataService.getTradeLinks,
  getAlerts: dataService.getAlerts,
  clearCache: dataService.clearCache
};

// Member 2: replace/extend these examples using the team's verified dataset.
// Coordinates are approximate port locations, not route waypoints.

const ports = [
  { id: "BOM", name: "Mumbai", country: "India", latitude: 18.94, longitude: 72.84 },
  { id: "SIN", name: "Singapore", country: "Singapore", latitude: 1.26, longitude: 103.84 },
  { id: "DXB", name: "Dubai", country: "United Arab Emirates", latitude: 25.27, longitude: 55.30 },
  { id: "CMB", name: "Colombo", country: "Sri Lanka", latitude: 6.93, longitude: 79.84 }
];

// Example ships are only for testing the UI/API; not real tracked vessels.
const ships = [
  { id: "DEMO-001", name: "Demo Cargo Vessel", status: "sample", currentPort: "Mumbai", lastUpdated: null },
  { id: "DEMO-002", name: "Demo Container Vessel", status: "sample", currentPort: "Singapore", lastUpdated: null }
];

module.exports = { ports, ships };

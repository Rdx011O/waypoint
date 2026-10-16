// Member 4: replace this simulated logic with official/current marine hazard data.
// A live implementation should match route geometry against time-valid hazard
// polygons/corridors and preserve source URL, issued time, and expiry time.

const demoHazards = {
  "DEMO-CYCLONE-01": {
    id: "DEMO-CYCLONE-01",
    type: "Cyclone warning",
    severity: "High",
    source: "SIMULATED DEMO — NOT AN OFFICIAL WARNING",
    validAt: null,
    description: "Example hazard used only to demonstrate route flagging."
  }
};

function detectHazards(route) {
  return (route.demoHazardIds || [])
    .map(id => demoHazards[id])
    .filter(Boolean)
    .map(hazard => ({ ...hazard }));
}

module.exports = { detectHazards };

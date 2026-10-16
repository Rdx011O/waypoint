// Member 3: replace the sample route catalogue with your sea-routing algorithm.
// Route distances are illustrative nautical-mile estimates, not navigation instructions.
// Do not draw straight lines through land or treat these as approved shipping routes.

const routeCatalog = {
  "Mumbai|Singapore": [
    {
      id: "BOM-SIN-A",
      name: "Candidate A — Direct Corridor (demo)",
      via: ["Arabian Sea", "Indian Ocean", "Strait of Malacca"],
      distanceNm: 3000,
      baseEtaDays: 9.0,
      baseOperatingCostUsd: 4200,
      riskLevel: "High",
      demoHazardIds: ["DEMO-CYCLONE-01"]
    },
    {
      id: "BOM-SIN-B",
      name: "Candidate B — Southern Alternative (demo)",
      via: ["Arabian Sea", "Southern Indian Ocean", "Strait of Malacca"],
      distanceNm: 3300,
      baseEtaDays: 9.8,
      baseOperatingCostUsd: 4550,
      riskLevel: "Low",
      demoHazardIds: []
    }
  ],
  "Mumbai|Dubai": [
    {
      id: "BOM-DXB-A",
      name: "Candidate A — Direct Corridor (demo)",
      via: ["Arabian Sea", "Gulf of Oman"],
      distanceNm: 1200,
      baseEtaDays: 3.5,
      baseOperatingCostUsd: 1800,
      riskLevel: "Low",
      demoHazardIds: []
    },
    {
      id: "BOM-DXB-B",
      name: "Candidate B — Alternative Corridor (demo)",
      via: ["Arabian Sea", "Gulf of Oman"],
      distanceNm: 1450,
      baseEtaDays: 4.2,
      baseOperatingCostUsd: 2100,
      riskLevel: "Medium",
      demoHazardIds: []
    }
  ]
};

function getCandidateRoutes(sourcePort, destinationPort) {
  const key = `${sourcePort.name}|${destinationPort.name}`;
  const reverseKey = `${destinationPort.name}|${sourcePort.name}`;

  // Reverse-direction routes are not automatically safe or equivalent.
  // Add a separately verified reverse route catalogue entry if needed.
  const routes = routeCatalog[key] || routeCatalog[reverseKey] || [];
  return routes.map(route => ({ ...route, via: [...route.via], demoHazardIds: [...route.demoHazardIds] }));
}

module.exports = { getCandidateRoutes };

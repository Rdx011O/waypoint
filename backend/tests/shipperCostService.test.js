const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateShipperCost,
  compareCostsAcrossRoutes,
  generateSummaryString
} = require("../src/services/shipperCostService");

const { CurrencyError } = require("../src/services/currencyService");
const { ChargesError } = require("../src/services/chargesService");

describe("shipperCostService", () => {
  const sampleRoute = {
    id: "BOM-SIN-A",
    name: "Candidate A — Direct Corridor (demo)",
    via: ["Arabian Sea", "Indian Ocean", "Strait of Malacca"],
    distanceNm: 3000,
    baseEtaDays: 9.0,
    baseOperatingCostUsd: 4200,
    estimatedCostUsd: 4200,
    riskLevel: "Low"
  };

  const originPort = { id: "BOM", name: "Mumbai" };
  const destinationPort = { id: "SIN", name: "Singapore" };

  describe("Hand-calculated Example", () => {
    it("matches exact cent calculation for known quantity x rate + ports + delay days x daily rate", async () => {
      // Inputs:
      // Cargo: 2 FEU
      // Tariff rate for BOM -> SIN: 1,850 USD/FEU => 3,700.00 USD
      // BOM Port charges: 280 (THC) + 75 (Doc) + 45 (Sec) = 400.00 USD
      // SIN Port charges: 340 (THC) + 90 (Doc) + 50 (Sec) = 480.00 USD
      // Delay: 2.0 days at 220 USD/day per FEU => 2.0 * 220 * 2 = 880.00 USD
      // Passage fees, fuel surcharge, insurance disabled for pure baseline check
      // Total USD = 3,700 + 400 + 480 + 880 = 5,460.00 USD
      // Fixed mock rate: 1 USD = 0.85 EUR
      // Expected EUR:
      // Freight: 3,700 * 0.85 = 3,145.00 EUR
      // Origin Port: 400 * 0.85 = 340.00 EUR
      // Destination Port: 480 * 0.85 = 408.00 EUR
      // Delay: 880 * 0.85 = 748.00 EUR
      // Total EUR = 3,145.00 + 340.00 + 408.00 + 748.00 = 4,641.00 EUR

      const mockProvider = async () => ({
        base: "USD",
        date: "2026-10-17",
        rates: { EUR: 0.85 },
        source: "live"
      });

      const estimate = await calculateShipperCost({
        route: sampleRoute,
        shipment: {
          cargoType: "Electronics",
          quantity: 2,
          unit: "FEU"
        },
        originPort,
        destinationPort,
        selectedCurrency: "EUR",
        options: {
          rateProvider: mockProvider,
          includePassageFees: false,
          includeFuelSurcharge: false,
          includeInsurance: false,
          delayInput: {
            expectedDelayDays: 2.0,
            confidence: "high",
            source: "live"
          }
        }
      });

      assert.equal(estimate.currency.rate, 0.85);
      assert.equal(estimate.currency.rateSource, "live");

      // Verify each line item
      const freight = estimate.lineItems.find(i => i.key === "freight");
      assert.equal(freight.amountUsd, 3700.00);
      assert.equal(freight.amountSelected, 3145.00);
      assert.equal(freight.basis, "2 FEU x 1,850 USD/FEU");

      const origPort = estimate.lineItems.find(i => i.key === "origin_port");
      assert.equal(origPort.amountUsd, 400.00);
      assert.equal(origPort.amountSelected, 340.00);

      const destPort = estimate.lineItems.find(i => i.key === "destination_port");
      assert.equal(destPort.amountUsd, 480.00);
      assert.equal(destPort.amountSelected, 408.00);

      const delay = estimate.lineItems.find(i => i.key === "delay");
      assert.equal(delay.amountUsd, 880.00);
      assert.equal(delay.amountSelected, 748.00);

      // Verify totals
      assert.equal(estimate.total.amountUsd, 5460.00);
      assert.equal(estimate.total.amountSelected, 4641.00);
      assert.equal(estimate.subtotals.freight, 3145.00);
      assert.equal(estimate.subtotals.port, 748.00);
      assert.equal(estimate.subtotals.delay, 748.00);

      // Verify line items sum exactly to total
      const lineSum = estimate.lineItems
        .filter(i => i.status === "estimated")
        .reduce((sum, i) => sum + i.amountSelected, 0);
      assert.equal(lineSum, estimate.total.amountSelected);
    });
  });

  describe("Rounding & Invariant Checks", () => {
    it("ensures JPY (0 decimals) lines sum exactly to total amountSelected", async () => {
      const mockProvider = async () => ({
        base: "USD",
        date: "2026-10-17",
        rates: { JPY: 158.337 },
        source: "live"
      });

      const estimate = await calculateShipperCost({
        route: sampleRoute,
        shipment: { quantity: 1, unit: "TEU" },
        originPort,
        destinationPort,
        selectedCurrency: "JPY",
        options: {
          rateProvider: mockProvider,
          includePassageFees: true,
          delayInput: { expectedDelayDays: 1.5 }
        }
      });

      assert.equal(estimate.currency.selected, "JPY");

      // Verify every line item amountSelected is an integer
      for (const item of estimate.lineItems) {
        if (item.status === "estimated") {
          assert.equal(Number.isInteger(item.amountSelected), true);
        }
      }

      assert.equal(Number.isInteger(estimate.total.amountSelected), true);

      // Total must equal exact sum of line items
      const sum = estimate.lineItems
        .filter(i => i.status === "estimated")
        .reduce((acc, i) => acc + i.amountSelected, 0);

      assert.equal(estimate.total.amountSelected, sum);
    });
  });

  describe("Missing Data Handling (Port & Delay)", () => {
    it("produces not_available and not_estimated with correct includesOnly/excludes", async () => {
      const unlistedPort = { id: "CMB", name: "Colombo" };

      const estimate = await calculateShipperCost({
        route: sampleRoute,
        shipment: { quantity: 1, unit: "TEU" },
        originPort,
        destinationPort: unlistedPort, // missing port charge
        selectedCurrency: "USD",
        options: {
          delayInput: null, // missing delay data
          includePassageFees: false
        }
      });

      const destPortItem = estimate.lineItems.find(i => i.key === "destination_port");
      assert.equal(destPortItem.status, "not_available");
      assert.equal(destPortItem.amountUsd, null);
      assert.equal(destPortItem.amountSelected, null);

      const delayItem = estimate.lineItems.find(i => i.key === "delay");
      assert.equal(delayItem.status, "not_estimated");
      assert.equal(delayItem.amountUsd, null);
      assert.equal(delayItem.amountSelected, null);

      // Verify includesOnly and excludes lists
      assert(estimate.total.includesOnly.includes("freight"));
      assert(estimate.total.includesOnly.includes("origin_port"));
      assert(!estimate.total.includesOnly.includes("destination_port"));
      assert(!estimate.total.includesOnly.includes("delay"));

      assert(estimate.total.excludes.includes("destination_port"));
      assert(estimate.total.excludes.includes("delay"));

      // Verify notAvailable explanation list
      assert(estimate.notAvailable.some(n => n.key === "destination_port"));
      assert(estimate.notAvailable.some(n => n.key === "delay"));

      // Summary string reflects exclusions
      assert(estimate.summary.includes("not included"));
    });
  });

  describe("Validation & Typed Errors", () => {
    it("throws UNSUPPORTED_CURRENCY on invalid currency code", async () => {
      await assert.rejects(
        async () => {
          await calculateShipperCost({
            route: sampleRoute,
            shipment: { quantity: 1, unit: "TEU" },
            originPort,
            destinationPort,
            selectedCurrency: "BITCOIN"
          });
        },
        (err) => err instanceof CurrencyError && err.code === "UNSUPPORTED_CURRENCY"
      );
    });

    it("throws INVALID_QUANTITY on zero or negative quantity", async () => {
      await assert.rejects(
        async () => {
          await calculateShipperCost({
            route: sampleRoute,
            shipment: { quantity: 0, unit: "TEU" },
            originPort,
            destinationPort
          });
        },
        (err) => err instanceof ChargesError && err.code === "INVALID_QUANTITY"
      );

      await assert.rejects(
        async () => {
          await calculateShipperCost({
            route: sampleRoute,
            shipment: { quantity: -3, unit: "TEU" },
            originPort,
            destinationPort
          });
        },
        (err) => err instanceof ChargesError && err.code === "INVALID_QUANTITY"
      );
    });

    it("throws UNKNOWN_UNIT on unsupported cargo unit", async () => {
      await assert.rejects(
        async () => {
          await calculateShipperCost({
            route: sampleRoute,
            shipment: { quantity: 10, unit: "pallets" },
            originPort,
            destinationPort
          });
        },
        (err) => err instanceof ChargesError && err.code === "UNKNOWN_UNIT"
      );
    });
  });

  describe("Spread Margin", () => {
    it("is zero and omitted by default", async () => {
      const estimate = await calculateShipperCost({
        route: sampleRoute,
        shipment: { quantity: 1, unit: "TEU" },
        originPort,
        destinationPort,
        selectedCurrency: "USD"
      });

      assert.equal(estimate.currency.spreadApplied, 0);
      assert.equal(estimate.lineItems.some(i => i.key === "conversion_spread"), false);
    });

    it("appears as its own line item when nonzero", async () => {
      const estimate = await calculateShipperCost({
        route: sampleRoute,
        shipment: { quantity: 1, unit: "TEU" },
        originPort,
        destinationPort,
        selectedCurrency: "USD",
        options: {
          conversionSpread: 0.02 // 2%
        }
      });

      assert.equal(estimate.currency.spreadApplied, 0.02);
      const spreadItem = estimate.lineItems.find(i => i.key === "conversion_spread");
      assert(spreadItem);
      assert.equal(spreadItem.status, "estimated");
      assert(spreadItem.amountUsd > 0);
      assert(spreadItem.basis.includes("2.00%"));
    });
  });

  describe("Route Cost Comparison & Carrier Divergence", () => {
    it("correctly identifies when cheapest-for-shipper route differs from cheapest voyage cost", async () => {
      // Route 1 (Direct via Canal): Voyage cost = 2,500 USD, but Suez Canal toll = 2,500 USD added to shipper
      // Route 2 (Alternative Open Sea): Voyage cost = 3,500 USD (carrier spends more fuel/time), but no canal toll
      const routeCanal = {
        id: "ROUTE-CANAL",
        name: "Route via Suez Canal",
        via: ["Arabian Sea", "Suez Canal", "Mediterranean"],
        passages: ["Suez Canal"],
        estimatedCostUsd: 2500, // lower carrier cost
        riskLevel: "Low"
      };

      const routeCape = {
        id: "ROUTE-CAPE",
        name: "Route via Cape of Good Hope",
        via: ["Arabian Sea", "Indian Ocean", "South Atlantic"],
        passages: [],
        estimatedCostUsd: 3500, // higher carrier cost
        riskLevel: "Low"
      };

      const comparison = await compareCostsAcrossRoutes(
        [routeCanal, routeCape],
        { quantity: 1, unit: "TEU" },
        "USD",
        {
          originPort,
          destinationPort,
          includePassageFees: true
        }
      );

      // Carrier voyage cost is lower on ROUTE-CANAL (2,500 vs 3,500)
      assert.equal(comparison.cheapestVoyageRouteId, "ROUTE-CANAL");

      // Shipper cost on ROUTE-CANAL: freight (950) + ports (880) + Suez toll (2500) = 4,330 USD
      // Shipper cost on ROUTE-CAPE: freight (950) + ports (880) + 0 toll = 1,830 USD
      assert.equal(comparison.cheapestShipperRouteId, "ROUTE-CAPE");

      // Confirm flag is true
      assert.equal(comparison.cheapestShipperDiffersFromVoyageCost, true);
      assert(comparison.comparisonSummary.includes("differing from the lowest voyage operating cost"));
    });
  });
});

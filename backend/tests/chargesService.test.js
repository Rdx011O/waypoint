const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");

const {
  parseCsvCharges,
  loadChargesData,
  validateCargoDetails,
  calculateFreightItem,
  calculatePortChargeItem,
  calculateDelayItem,
  calculatePassageItems,
  calculateFuelSurchargeItem,
  calculateInsuranceItem,
  ChargesError
} = require("../src/services/chargesService");

describe("chargesService", () => {
  describe("CSV Parsing and Validation", () => {
    it("loads and parses valid charges CSV properly", () => {
      const ports = parseCsvCharges();
      assert(ports.BOM);
      assert.equal(ports.BOM.portName, "Mumbai");
      assert.equal(ports.BOM.terminalHandlingUsd, 280);
      assert.equal(ports.BOM.totalPortChargeUsd, 400);
    });

    it("throws FILE_PARSE_ERROR naming file and column when required column is missing", () => {
      const tempFile = path.join(os.tmpdir(), "bad_header.csv");
      fs.writeFileSync(tempFile, "port_id,port_name,documentation_fee_usd,security_fee_usd\nBOM,Mumbai,75,45\n");
      try {
        assert.throws(
          () => parseCsvCharges(tempFile),
          (err) => {
            assert(err instanceof ChargesError);
            assert.equal(err.code, "FILE_PARSE_ERROR");
            assert(err.message.includes("terminal_handling_usd"));
            return true;
          }
        );
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    it("throws FILE_PARSE_ERROR naming line and column when number is invalid", () => {
      const tempFile = path.join(os.tmpdir(), "bad_num.csv");
      fs.writeFileSync(tempFile, "port_id,port_name,terminal_handling_usd,documentation_fee_usd,security_fee_usd\nBOM,Mumbai,NOT_A_NUM,75,45\n");
      try {
        assert.throws(
          () => parseCsvCharges(tempFile),
          (err) => {
            assert(err instanceof ChargesError);
            assert.equal(err.code, "FILE_PARSE_ERROR");
            assert(err.message.includes("Line 2"));
            assert(err.message.includes("terminal_handling_usd"));
            return true;
          }
        );
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });

  describe("Cargo Validation", () => {
    it("accepts valid cargo details", () => {
      const validated = validateCargoDetails({ quantity: 2, unit: "FEU", cargoValueUsd: 50000 });
      assert.equal(validated.quantity, 2);
      assert.equal(validated.unit, "FEU");
      assert.equal(validated.cargoValueUsd, 50000);
    });

    it("throws INVALID_QUANTITY on zero or negative quantity", () => {
      assert.throws(
        () => validateCargoDetails({ quantity: 0, unit: "TEU" }),
        (err) => err instanceof ChargesError && err.code === "INVALID_QUANTITY"
      );
      assert.throws(
        () => validateCargoDetails({ quantity: -5, unit: "TEU" }),
        (err) => err instanceof ChargesError && err.code === "INVALID_QUANTITY"
      );
      assert.throws(
        () => validateCargoDetails({ quantity: null, unit: "TEU" }),
        (err) => err instanceof ChargesError && err.code === "INVALID_QUANTITY"
      );
    });

    it("throws UNKNOWN_UNIT on unsupported cargo unit", () => {
      assert.throws(
        () => validateCargoDetails({ quantity: 10, unit: "barrels" }),
        (err) => err instanceof ChargesError && err.code === "UNKNOWN_UNIT"
      );
    });
  });

  describe("Freight Calculation", () => {
    const chargesData = loadChargesData();

    it("computes table rate freight for known corridor", () => {
      const originPort = { id: "BOM", name: "Mumbai" };
      const destinationPort = { id: "SIN", name: "Singapore" };
      const cargo = { quantity: 2, unit: "FEU" };
      const route = { id: "BOM-SIN-A", estimatedCostUsd: 4200 };

      const item = calculateFreightItem({ originPort, destinationPort, cargo, route, chargesData });
      assert.equal(item.status, "estimated");
      assert.equal(item.method, "table_rate");
      assert.equal(item.amountUsd, 3700); // 2 * 1850
      assert.equal(item.basis, "2 FEU x 1,850 USD/FEU");
      assert.equal(item.confidence, "high");
    });

    it("falls back to cost-based allocation when corridor has no rate entry", () => {
      const originPort = { id: "XYZ", name: "UnknownPort" };
      const destinationPort = { id: "ABC", name: "AnotherPort" };
      const cargo = { quantity: 1, unit: "TEU" };
      const route = { id: "CUSTOM-01", estimatedCostUsd: 5000 };

      const item = calculateFreightItem({ originPort, destinationPort, cargo, route, chargesData });
      assert.equal(item.status, "estimated");
      assert.equal(item.method, "cost_based_allocation");
      assert(item.amountUsd > 0);
      assert(item.basis.includes("Cost-based allocation"));
      assert.equal(item.confidence, "low");
    });
  });

  describe("Port Charges Calculation", () => {
    const chargesData = loadChargesData();

    it("computes port charges for known port", () => {
      const port = { id: "BOM", name: "Mumbai" };
      const res = calculatePortChargeItem({ port, role: "origin", chargesData });
      assert.equal(res.item.status, "estimated");
      assert.equal(res.item.amountUsd, 400);
      assert.equal(res.notAvailable, null);
    });

    it("returns status 'not_available' and notAvailable reason for unlisted port (never 0)", () => {
      const port = { id: "CMB", name: "Colombo" };
      const res = calculatePortChargeItem({ port, role: "destination", chargesData });
      assert.equal(res.item.status, "not_available");
      assert.equal(res.item.amountUsd, null);
      assert.notEqual(res.item.amountUsd, 0);
      assert(res.notAvailable);
      assert(res.notAvailable.reason.includes("Colombo"));
    });
  });

  describe("Delay Cost Calculation", () => {
    const chargesData = loadChargesData();

    it("computes delay cost when delay estimate is present", () => {
      const cargo = { quantity: 2, unit: "FEU" };
      const delayInput = { expectedDelayDays: 2.5, confidence: "high", source: "live" };
      const res = calculateDelayItem({ delayInput, cargo, chargesData });

      assert.equal(res.item.status, "estimated");
      // 2.5 days * 220 USD/day * 2 FEU = 1100 USD
      assert.equal(res.item.amountUsd, 1100);
      assert.equal(res.item.confidence, "high");
      assert.equal(res.notAvailable, null);
      assert(res.item.basis.includes("2.5 expected delay day(s)"));
    });

    it("returns status 'not_estimated' when delay data is missing (never 0)", () => {
      const cargo = { quantity: 2, unit: "FEU" };
      const res = calculateDelayItem({ delayInput: null, cargo, chargesData });

      assert.equal(res.item.status, "not_estimated");
      assert.equal(res.item.amountUsd, null);
      assert.notEqual(res.item.amountUsd, 0);
      assert(res.notAvailable);
    });
  });

  describe("Optional Line Items", () => {
    const chargesData = loadChargesData();

    it("computes fuel surcharge when enabled", () => {
      const res = calculateFuelSurchargeItem({ baseFreightUsd: 2000, options: { includeFuelSurcharge: true } });
      assert(res);
      assert.equal(res.status, "estimated");
      assert.equal(res.amountUsd, 100); // 5% of 2000
    });

    it("computes insurance when cargoValueUsd is provided", () => {
      const cargo = { quantity: 1, unit: "TEU", cargoValueUsd: 100000 };
      const res = calculateInsuranceItem({ cargo, options: { includeInsurance: true } });
      assert.equal(res.item.status, "estimated");
      assert.equal(res.item.amountUsd, 350); // 0.35% of 100,000
    });

    it("returns not_available for insurance if enabled but value not provided", () => {
      const cargo = { quantity: 1, unit: "TEU", cargoValueUsd: null };
      const res = calculateInsuranceItem({ cargo, options: { includeInsurance: true } });
      assert.equal(res.item.status, "not_available");
      assert.equal(res.item.amountUsd, null);
      assert(res.notAvailable);
    });

    it("flags unknown passage waterways as not_available, not invented", () => {
      const route = { via: ["Arabian Sea", "Mysterious Canal", "Strait of Malacca"] };
      const res = calculatePassageItems({ route, chargesData, options: { includePassageFees: true } });

      const malacca = res.items.find(i => i.label.includes("Malacca"));
      assert(malacca);
      assert.equal(malacca.status, "estimated");
      assert.equal(malacca.amountUsd, 150);

      const mysterious = res.items.find(i => i.label.includes("Mysterious Canal"));
      assert(mysterious);
      assert.equal(mysterious.status, "not_available");
      assert.equal(mysterious.amountUsd, null);
      assert(res.notAvailableList.some(n => n.reason.includes("Mysterious Canal")));
    });
  });
});

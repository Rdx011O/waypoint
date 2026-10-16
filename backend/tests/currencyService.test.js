const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  getRates,
  getExchangeRate,
  roundToCurrency,
  formatCurrency,
  validateCurrencyCode,
  clearCache,
  CurrencyError
} = require("../src/services/currencyService");

describe("currencyService", () => {
  beforeEach(() => {
    clearCache();
  });

  describe("Validation", () => {
    it("validates supported currencies and rejects unsupported with typed error", () => {
      assert.equal(validateCurrencyCode("eur"), "EUR");
      assert.equal(validateCurrencyCode("USD"), "USD");

      assert.throws(
        () => validateCurrencyCode("XYZ"),
        (err) => {
          assert(err instanceof CurrencyError);
          assert.equal(err.code, "UNSUPPORTED_CURRENCY");
          return true;
        }
      );

      assert.throws(
        () => validateCurrencyCode(null),
        (err) => {
          assert(err instanceof CurrencyError);
          assert.equal(err.code, "UNSUPPORTED_CURRENCY");
          return true;
        }
      );
    });
  });

  describe("Formatting and Rounding", () => {
    it("rounds and formats JPY to 0 decimals", () => {
      const rounded = roundToCurrency(1234.567, "JPY");
      assert.equal(rounded, 1235);
      const formatted = formatCurrency(1235, "JPY");
      assert(formatted.includes("1,235") || formatted.includes("1235"));
    });

    it("rounds and formats EUR to 2 decimals", () => {
      const rounded = roundToCurrency(1234.567, "EUR");
      assert.equal(rounded, 1234.57);
      const formatted = formatCurrency(1234.57, "EUR");
      assert(formatted.includes("1,234.57"));
    });
  });

  describe("Rates Provider, Cache, and Fallback Hierarchy", () => {
    it("returns 'live' rates from custom mock provider", async () => {
      const mockProvider = async () => ({
        base: "USD",
        date: "2026-10-17",
        rates: { EUR: 0.9, JPY: 150.0 },
        source: "live"
      });

      const res = await getRates("USD", ["EUR", "JPY"], { provider: mockProvider });
      assert.equal(res.rateSource, "live");
      assert.equal(res.rates.EUR, 0.9);
      assert.equal(res.date, "2026-10-17");
    });

    it("falls back to 'cached' when live provider subsequently fails", async () => {
      let callCount = 0;
      const failingMockProvider = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            base: "USD",
            date: "2026-10-17",
            rates: { EUR: 0.92 },
            source: "live"
          };
        }
        throw new Error("Network timeout");
      };

      // 1st call: live succeeds and caches
      const first = await getRates("USD", ["EUR"], { provider: failingMockProvider });
      assert.equal(first.rateSource, "live");
      assert.equal(first.rates.EUR, 0.92);

      // 2nd call with forceRefresh: live fails, returns cached
      const second = await getRates("USD", ["EUR"], {
        provider: failingMockProvider,
        forceRefresh: true
      });
      assert.equal(second.rateSource, "cached");
      assert.equal(second.rates.EUR, 0.92);
    });

    it("falls back to bundled 'fallback' rates when no cache exists and provider fails", async () => {
      clearCache();
      const alwaysFailingProvider = async () => {
        throw new Error("DNS resolution failed");
      };

      const res = await getRates("USD", ["EUR", "INR"], { provider: alwaysFailingProvider });
      assert.equal(res.rateSource, "fallback");
      assert.equal(typeof res.rates.EUR, "number");
      assert.equal(typeof res.rates.INR, "number");
      assert.equal(res.rates.USD, 1.0);
    });

    it("getExchangeRate returns 1.0 immediately for base currency USD", async () => {
      const res = await getExchangeRate("USD");
      assert.equal(res.selected, "USD");
      assert.equal(res.base, "USD");
      assert.equal(res.rate, 1.0);
    });

    it("getExchangeRate retrieves valid rate for target currency", async () => {
      const mockProvider = async () => ({
        base: "USD",
        date: "2026-10-17",
        rates: { EUR: 0.885 },
        source: "live"
      });

      const res = await getExchangeRate("EUR", { provider: mockProvider });
      assert.equal(res.selected, "EUR");
      assert.equal(res.rate, 0.885);
      assert.equal(res.rateSource, "live");
    });
  });
});

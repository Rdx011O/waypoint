const path = require("path");
const fs = require("fs");

const BASE_CURRENCY = "USD";
const DEFAULT_SUPPORTED_CURRENCIES = Object.freeze([
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AED",
  "SGD",
  "JPY",
  "CNY"
]);
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_REQUEST_TIMEOUT_MS = 4000;
const FALLBACK_RATES_PATH = path.resolve(__dirname, "../data/fallback_rates.json");

class CurrencyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CurrencyError";
    this.code = code;
    this.details = details;
  }
}

// In-memory rate cache
let inMemoryCache = null;

function clearCache() {
  inMemoryCache = null;
}

function loadBundledFallbackRates(customPath) {
  const filePath = customPath || FALLBACK_RATES_PATH;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    throw new CurrencyError(
      "FALLBACK_LOAD_FAILED",
      `Failed to load fallback rates from ${filePath}: ${err.message}`,
      { path: filePath }
    );
  }
}

async function defaultFrankfurterProvider({ base = BASE_CURRENCY, symbols = [] } = {}) {
  const symbolList = symbols.length > 0 ? symbols.join(",") : "";
  const query = symbolList ? `&symbols=${encodeURIComponent(symbolList)}` : "";
  const primaryUrl = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}${query}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(primaryUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Waypoint/1.0" }
    });

    if (!response.ok) {
      throw new Error(`Frankfurter API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const rates = { [base]: 1.0, ...(data.rates || {}) };

    // Frankfurter (ECB) does not track AED. If AED was requested but missing, query open.er-api
    const needsAed = symbols.includes("AED") && rates.AED === undefined;
    if (needsAed && base === "USD") {
      try {
        const secondaryRes = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS)
        });
        if (secondaryRes.ok) {
          const secData = await secondaryRes.json();
          if (secData.rates && typeof secData.rates.AED === "number") {
            rates.AED = secData.rates.AED;
          }
        }
      } catch (_secErr) {
        // Will be resolved by fallback if absent
      }
    }

    return {
      base: data.base || base,
      date: data.date || new Date().toISOString().slice(0, 10),
      rates,
      source: "live"
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getFractionDigits(currencyCode) {
  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode
    });
    return formatter.resolvedOptions().maximumFractionDigits ?? 2;
  } catch (_err) {
    return 2;
  }
}

function roundToCurrency(amount, currencyCode) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new CurrencyError("INVALID_AMOUNT", "Amount must be a finite number", { amount });
  }
  const digits = getFractionDigits(currencyCode);
  const factor = Math.pow(10, digits);
  return Math.round(amount * factor) / factor;
}

function formatCurrency(amount, currencyCode, locale = "en-US") {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new CurrencyError("INVALID_AMOUNT", "Amount must be a finite number", { amount });
  }
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "symbol"
  });
  return formatter.format(amount);
}

function validateCurrencyCode(currencyCode, supportedCurrencies = DEFAULT_SUPPORTED_CURRENCIES) {
  if (!currencyCode || typeof currencyCode !== "string") {
    throw new CurrencyError(
      "UNSUPPORTED_CURRENCY",
      "Currency code must be a non-empty string.",
      { currencyCode }
    );
  }
  const normalized = currencyCode.trim().toUpperCase();
  if (!supportedCurrencies.includes(normalized)) {
    throw new CurrencyError(
      "UNSUPPORTED_CURRENCY",
      `Currency '${currencyCode}' is not supported. Supported currencies: ${supportedCurrencies.join(", ")}`,
      { currencyCode, supportedCurrencies }
    );
  }
  return normalized;
}

async function getRates(base = BASE_CURRENCY, symbols = DEFAULT_SUPPORTED_CURRENCIES, options = {}) {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const provider = options.provider ?? defaultFrankfurterProvider;
  const supportedCurrencies = options.supportedCurrencies ?? DEFAULT_SUPPORTED_CURRENCIES;
  const now = Date.now();

  const normalizedBase = validateCurrencyCode(base, supportedCurrencies);
  const normalizedSymbols = symbols.map(s => validateCurrencyCode(s, supportedCurrencies));

  // Check valid cache entry
  if (!options.forceRefresh && inMemoryCache && inMemoryCache.base === normalizedBase) {
    const isFresh = now - inMemoryCache.timestamp < ttlMs;
    const hasAllSymbols = normalizedSymbols.every(sym => sym in inMemoryCache.rates);
    if (isFresh && hasAllSymbols) {
      return {
        base: inMemoryCache.base,
        date: inMemoryCache.date,
        rates: { ...inMemoryCache.rates },
        rateSource: inMemoryCache.source || "cached"
      };
    }
  }

  // Attempt live provider call
  try {
    const liveResult = await provider({ base: normalizedBase, symbols: normalizedSymbols });
    if (!liveResult || !liveResult.rates || typeof liveResult.rates !== "object") {
      throw new Error("Invalid response structure from exchange rate provider.");
    }

    const rates = { ...liveResult.rates };
    if (rates[normalizedBase] === undefined) {
      rates[normalizedBase] = 1.0;
    }

    inMemoryCache = {
      base: normalizedBase,
      date: liveResult.date || new Date().toISOString().slice(0, 10),
      rates,
      source: "live",
      timestamp: now
    };

    return {
      base: inMemoryCache.base,
      date: inMemoryCache.date,
      rates: { ...inMemoryCache.rates },
      rateSource: "live"
    };
  } catch (providerError) {
    // Fallback 1: Return stale cache if available
    if (inMemoryCache && inMemoryCache.base === normalizedBase) {
      return {
        base: inMemoryCache.base,
        date: inMemoryCache.date,
        rates: { ...inMemoryCache.rates },
        rateSource: "cached"
      };
    }

    // Fallback 2: Bundled fallback_rates.json
    const fallback = loadBundledFallbackRates(options.fallbackPath);
    if (fallback.base === normalizedBase && fallback.rates) {
      return {
        base: fallback.base,
        date: fallback.date || "2026-10-16",
        rates: { ...fallback.rates },
        rateSource: "fallback"
      };
    }

    throw new CurrencyError(
      "RATE_UNAVAILABLE",
      `Unable to obtain exchange rates for base '${normalizedBase}': ${providerError.message}`,
      { originalError: providerError.message }
    );
  }
}

async function getExchangeRate(targetCurrency, options = {}) {
  const supported = options.supportedCurrencies ?? DEFAULT_SUPPORTED_CURRENCIES;
  const target = validateCurrencyCode(targetCurrency, supported);
  const base = validateCurrencyCode(options.base || BASE_CURRENCY, supported);

  if (target === base) {
    return {
      selected: target,
      base,
      rate: 1.0,
      rateDate: new Date().toISOString().slice(0, 10),
      rateSource: "live",
      spreadApplied: options.spreadMargin || 0
    };
  }

  const ratesData = await getRates(base, [target], options);
  const rawRate = ratesData.rates[target];

  if (typeof rawRate !== "number" || !Number.isFinite(rawRate) || rawRate <= 0) {
    throw new CurrencyError(
      "RATE_UNAVAILABLE",
      `Exchange rate for '${target}' relative to '${base}' was not found in rate table.`,
      { target, base, rateSource: ratesData.rateSource }
    );
  }

  return {
    selected: target,
    base,
    rate: rawRate,
    rateDate: ratesData.date,
    rateSource: ratesData.rateSource,
    spreadApplied: options.spreadMargin || 0
  };
}

module.exports = {
  BASE_CURRENCY,
  DEFAULT_SUPPORTED_CURRENCIES,
  DEFAULT_CACHE_TTL_MS,
  CurrencyError,
  clearCache,
  roundToCurrency,
  formatCurrency,
  validateCurrencyCode,
  getFractionDigits,
  getRates,
  getExchangeRate
};

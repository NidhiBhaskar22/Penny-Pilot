const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

function getApiKey() {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    const error = new Error("FMP_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }
  return apiKey;
}

function buildUrl(path, params = {}) {
  const apiKey = getApiKey();
  const url = new URL(`${FMP_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set("apikey", apiKey);
  return url.toString();
}

async function request(path, params = {}) {
  const response = await fetch(buildUrl(path, params), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`FMP request failed: ${response.status} ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

function isPaidPlanError(error) {
  return Number(error?.statusCode) === 402;
}

async function searchInstruments(query, limit = 10) {
  const [nameMatches, symbolMatches] = await Promise.all([
    request("/search-name", { query }),
    request("/search-symbol", { query }),
  ]);

  const merged = [...(Array.isArray(nameMatches) ? nameMatches : []), ...(Array.isArray(symbolMatches) ? symbolMatches : [])];
  const deduped = [];
  const seen = new Set();

  merged.forEach((item) => {
    const symbol = String(item?.symbol || "").trim().toUpperCase();
    if (!symbol || seen.has(symbol)) return;
    seen.add(symbol);
    deduped.push(item);
  });

  return deduped.slice(0, limit);
}

async function getProfile(symbol) {
  const [item] = await request("/profile", { symbol });
  return item || null;
}

async function getQuote(symbol) {
  const [item] = await request("/quote", { symbol });
  return item || null;
}

async function getEtfInfo(symbol) {
  const [item] = await request("/etf/info", { symbol });
  return item || null;
}

async function getHistoricalChart(symbol) {
  const rows = await request("/historical-price-eod/light", { symbol });
  return Array.isArray(rows) ? rows : [];
}

async function getKeyMetrics(symbol) {
  const [item] = await request("/key-metrics", { symbol });
  return item || null;
}

async function getRatios(symbol) {
  const [item] = await request("/ratios", { symbol });
  return item || null;
}

module.exports = {
  searchInstruments,
  getProfile,
  getQuote,
  getEtfInfo,
  getHistoricalChart,
  getKeyMetrics,
  getRatios,
  isPaidPlanError,
};

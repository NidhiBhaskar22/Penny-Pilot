const AMFI_NAV_URL = "https://portal.amfiindia.com/spages/NAVAll.txt";

let amfiCache = {
  fetchedAt: 0,
  items: [],
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(schemeName) {
  const name = schemeName.toLowerCase();
  if (name.includes("liquid")) return "Liquid";
  if (name.includes("overnight")) return "Overnight";
  if (name.includes("small cap")) return "Small Cap";
  if (name.includes("mid cap")) return "Mid Cap";
  if (name.includes("large cap")) return "Large Cap";
  if (name.includes("flexi cap")) return "Flexi Cap";
  if (name.includes("multi cap")) return "Multi Cap";
  if (name.includes("index")) return "Index";
  if (name.includes("elss")) return "ELSS";
  if (name.includes("hybrid")) return "Hybrid";
  if (name.includes("debt")) return "Debt";
  return "Mutual Fund";
}

function parseAmfiText(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  let currentAmc = "";

  for (const line of lines) {
    if (!line.includes(";")) {
      currentAmc = normalizeText(line);
      continue;
    }

    const parts = line.split(";");
    if (parts.length < 6) continue;

    const schemeCode = normalizeText(parts[0]);
    const isinGrowth = normalizeText(parts[1]);
    const isinReinvestment = normalizeText(parts[2]);
    const schemeName = normalizeText(parts[3]);
    const nav = Number(parts[4]);
    const navDate = normalizeText(parts[5]);

    if (!schemeCode || !schemeName || !Number.isFinite(nav)) continue;

    items.push({
      schemeCode,
      isinGrowth: isinGrowth === "-" ? null : isinGrowth,
      isinReinvestment: isinReinvestment === "-" ? null : isinReinvestment,
      schemeName,
      nav,
      navDate,
      amc: currentAmc || "Unknown AMC",
      category: inferCategory(schemeName),
    });
  }

  return items;
}

async function getAllSchemes(forceRefresh = false) {
  const shouldRefresh =
    forceRefresh ||
    !amfiCache.items.length ||
    Date.now() - amfiCache.fetchedAt > CACHE_TTL_MS;

  if (!shouldRefresh) {
    return amfiCache.items;
  }

  const response = await fetch(AMFI_NAV_URL, {
    headers: { Accept: "text/plain" },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`AMFI request failed: ${response.status} ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const text = await response.text();
  const items = parseAmfiText(text);
  amfiCache = {
    fetchedAt: Date.now(),
    items,
  };
  return items;
}

async function searchSchemes(query, limit = 20) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!normalizedQuery) return [];

  const items = await getAllSchemes();
  return items
    .filter((item) => item.schemeName.toLowerCase().includes(normalizedQuery))
    .slice(0, limit);
}

async function getSchemeByCode(schemeCode, forceRefresh = false) {
  const items = await getAllSchemes(forceRefresh);
  return (
    items.find((item) => String(item.schemeCode) === String(schemeCode).trim()) || null
  );
}

module.exports = {
  getAllSchemes,
  searchSchemes,
  getSchemeByCode,
};

const instrumentService = require("../services/instrumentService");

function parseForceRefresh(value) {
  return value === true || value === "true" || value === "1";
}

async function searchInstruments(req, res) {
  try {
    const query = String(req.query.q || "").trim();
    const market = String(req.query.market || "").trim().toLowerCase();
    if (!query) {
      return res.status(400).json({ message: "q query parameter is required" });
    }

    const items = await instrumentService.searchInstruments(query, { market });
    return res.json({ items });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to search instruments",
      details: error.message,
    });
  }
}

async function searchIndianMutualFunds(req, res) {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ message: "q query parameter is required" });
    }

    const items = await instrumentService.searchIndianMutualFunds(query);
    return res.json({ items });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to search Indian mutual funds",
      details: error.message,
    });
  }
}

async function getIndianMutualFundDetails(req, res) {
  try {
    const payload = await instrumentService.getIndianMutualFundDetails(
      req.params.schemeCode,
      { forceRefresh: parseForceRefresh(req.query.forceRefresh) }
    );
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to fetch Indian mutual fund details",
      details: error.message,
    });
  }
}

async function getInstrumentDetails(req, res) {
  try {
    const payload = await instrumentService.getInstrumentDetails(req.params.symbol, {
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to fetch instrument details",
      details: error.message,
    });
  }
}

async function getInstrumentChart(req, res) {
  try {
    const items = await instrumentService.getInstrumentChart(req.params.symbol);
    return res.json({ items });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to fetch instrument chart",
      details: error.message,
    });
  }
}

async function getInstrumentAnalysis(req, res) {
  try {
    const payload = await instrumentService.getInstrumentAnalysis(req.params.symbol);
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to fetch instrument analysis",
      details: error.message,
    });
  }
}

async function refreshInstrumentQuote(req, res) {
  try {
    const payload = await instrumentService.refreshInstrumentQuote(req.params.symbol);
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to refresh instrument quote",
      details: error.message,
    });
  }
}

async function refreshIndianMutualFundQuote(req, res) {
  try {
    const payload = await instrumentService.refreshIndianMutualFundQuote(req.params.schemeCode);
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: "Failed to refresh Indian mutual fund quote",
      details: error.message,
    });
  }
}

module.exports = {
  searchInstruments,
  getInstrumentDetails,
  getInstrumentChart,
  getInstrumentAnalysis,
  searchIndianMutualFunds,
  getIndianMutualFundDetails,
  refreshInstrumentQuote,
  refreshIndianMutualFundQuote,
};

const instrumentService = require("../services/instrumentService");
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");

function parseForceRefresh(value) {
  return value === true || value === "true" || value === "1";
}

const searchInstruments = asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();
  const market = String(req.query.market || "").trim().toLowerCase();
  if (!query) {
    throw new ApiError(400, "q query parameter is required");
  }

  try {
    const items = await instrumentService.searchInstruments(query, { market });
    return res.json({ items });
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to search instruments", error.message);
  }
});

const searchIndianMutualFunds = asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) {
    throw new ApiError(400, "q query parameter is required");
  }

  try {
    const items = await instrumentService.searchIndianMutualFunds(query);
    return res.json({ items });
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to search Indian mutual funds", error.message);
  }
});

const getIndianMutualFundDetails = asyncHandler(async (req, res) => {
  try {
    const payload = await instrumentService.getIndianMutualFundDetails(
      req.params.schemeCode,
      { forceRefresh: parseForceRefresh(req.query.forceRefresh) }
    );
    return res.json(payload);
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to fetch Indian mutual fund details", error.message);
  }
});

const getInstrumentDetails = asyncHandler(async (req, res) => {
  try {
    const payload = await instrumentService.getInstrumentDetails(req.params.symbol, {
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });
    return res.json(payload);
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to fetch instrument details", error.message);
  }
});

const getInstrumentChart = asyncHandler(async (req, res) => {
  try {
    const items = await instrumentService.getInstrumentChart(req.params.symbol);
    return res.json({ items });
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to fetch instrument chart", error.message);
  }
});

const getInstrumentAnalysis = asyncHandler(async (req, res) => {
  try {
    const payload = await instrumentService.getInstrumentAnalysis(req.params.symbol);
    return res.json(payload);
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to fetch instrument analysis", error.message);
  }
});

const refreshInstrumentQuote = asyncHandler(async (req, res) => {
  try {
    const payload = await instrumentService.refreshInstrumentQuote(req.params.symbol);
    return res.json(payload);
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to refresh instrument quote", error.message);
  }
});

const refreshIndianMutualFundQuote = asyncHandler(async (req, res) => {
  try {
    const payload = await instrumentService.refreshIndianMutualFundQuote(req.params.schemeCode);
    return res.json(payload);
  } catch (error) {
    throw new ApiError(error.statusCode || 500, "Failed to refresh Indian mutual fund quote", error.message);
  }
});

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

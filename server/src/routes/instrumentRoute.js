const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  searchInstruments,
  getInstrumentDetails,
  getInstrumentChart,
  getInstrumentAnalysis,
  searchIndianMutualFunds,
  getIndianMutualFundDetails,
  refreshInstrumentQuote,
  refreshIndianMutualFundQuote,
} = require("../controllers/instrumentController");

const router = express.Router();

router.use(authMiddleware);

router.get("/search", searchInstruments);
router.get("/mutual-funds/search", searchIndianMutualFunds);
router.post("/mutual-funds/:schemeCode/refresh-quote", refreshIndianMutualFundQuote);
router.get("/mutual-funds/:schemeCode/details", getIndianMutualFundDetails);
router.post("/:symbol/refresh-quote", refreshInstrumentQuote);
router.get("/:symbol/details", getInstrumentDetails);
router.get("/:symbol/chart", getInstrumentChart);
router.get("/:symbol/analysis", getInstrumentAnalysis);

module.exports = router;

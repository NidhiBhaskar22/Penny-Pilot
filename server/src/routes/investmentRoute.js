const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createInvestment,
  getAllInvestments,
  getInvestmentsByMonth,
  updateInvestment,
  deleteInvestment,
  getProfitSummary,
  createInvestmentTransaction,
  getInvestmentTransactions,
  updateInvestmentTransaction,
  deleteInvestmentTransaction,
  getInvestmentHoldings,
  getPortfolioSummary,
} = require("../controllers/investmentController");

const router = express.Router();

router.use(authMiddleware);

router.get("/profit-summary", getProfitSummary);
router.get("/portfolio-summary", getPortfolioSummary);
router.get("/holdings", getInvestmentHoldings);
router.get("/transactions", getInvestmentTransactions);
router.post("/transactions", createInvestmentTransaction);
router.put("/transactions/:id", updateInvestmentTransaction);
router.delete("/transactions/:id", deleteInvestmentTransaction);

router.post("/", createInvestment);
router.get("/", getAllInvestments);
router.get("/:month", getInvestmentsByMonth);
router.put("/:id", updateInvestment);
router.delete("/:id", deleteInvestment);

module.exports = router;

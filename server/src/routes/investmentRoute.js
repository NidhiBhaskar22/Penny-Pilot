const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createInvestment,
  getAllInvestments,
  getInvestmentsByMonth,
  updateInvestment,
  deleteInvestment,
  getProfitSummary,
} = require("../controllers/investmentController");

router.use(authMiddleware);

router.get("/profit-summary", getProfitSummary); // <— move above
router.post("/", createInvestment);
router.get("/", getAllInvestments);
router.get("/:month", getInvestmentsByMonth); // dynamic AFTER fixed
router.put("/:id", updateInvestment);
router.delete("/:id", deleteInvestment);

// Profit summary endpoint
router.get("/profit-summary", getProfitSummary);

module.exports = router;

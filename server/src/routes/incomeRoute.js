const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createIncome,
  getAllIncomes,
  getIncomesByMonth,
  updateIncome,
  deleteIncome,
} = require("../controllers/incomeController");

router.use(authMiddleware);
router.post("/", createIncome);
router.get("/", getAllIncomes);
router.get("/:month", getIncomesByMonth);
router.put("/:id", updateIncome);
router.delete("/:id", deleteIncome);

module.exports = router;

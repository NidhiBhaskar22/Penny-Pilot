const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkExpenseLimit = require("../middleware/checkExpenseLimit");
const {
  createExpense,
  getAllExpenses,
  getExpensesByMonth,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

router.use(authMiddleware);
router.use(checkExpenseLimit);

router.post("/", createExpense);
router.get("/", getAllExpenses);
router.get("/:month", getExpensesByMonth);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;

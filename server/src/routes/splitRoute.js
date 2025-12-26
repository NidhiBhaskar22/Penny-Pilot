const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const { createSplitExpense, createMoneyLent, createMoneyBorrowed, updateMoneyBorrowed, updateMoneyLent, updateSplitExpense } = require("../controllers/splitController");

router.use(authMiddleware);

router.post("/split-expense", createSplitExpense);
router.post("/money-lent", createMoneyLent);
router.post("/money-borrowed", createMoneyBorrowed);
router.put("/split-expense/:id", updateSplitExpense);
router.put("/money-lent/:id", updateMoneyLent);
router.put("/money-borrowed/:id", updateMoneyBorrowed);

module.exports = router;

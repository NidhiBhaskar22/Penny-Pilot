const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getCurrentBalance,
  getLastMonthBalance,
  getLastWeekBalance,
  updateBalance,
} = require("../controllers/balanceController");

router.use(authMiddleware);

router.get("/current", getCurrentBalance);
router.get("/last-month", getLastMonthBalance);
router.get("/last-week", getLastWeekBalance);
router.put("/:id", updateBalance);

module.exports = router;

// In backend src/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getNormalDashboard, getAdvancedDashboard } = require("../controllers/dashboardController");

router.use(authMiddleware);

router.get("/normal", authMiddleware, getNormalDashboard);
router.get("/advanced", authMiddleware, getAdvancedDashboard);

module.exports = router;

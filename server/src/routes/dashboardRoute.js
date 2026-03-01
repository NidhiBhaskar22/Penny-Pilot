// In backend src/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getNormalDashboard, getAdvancedDashboard } = require("../controllers/dashboardController");

router.use(authMiddleware);

router.get("/normal", getNormalDashboard);
router.get("/advanced", getAdvancedDashboard);

module.exports = router;

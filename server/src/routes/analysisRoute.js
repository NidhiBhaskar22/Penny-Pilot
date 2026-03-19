const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { generateAnalysisSummary } = require("../controllers/analysisController");

const router = express.Router();

router.use(authMiddleware);

router.post("/summary", generateAnalysisSummary);

module.exports = router;

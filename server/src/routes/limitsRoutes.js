const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createLimits,
  getLimits,
  updateLimits,
  deleteLimits,
} = require("../controllers/limitsController");

router.use(authMiddleware);

router.post("/", createLimits);
router.get("/", getLimits);
router.put("/:id", updateLimits);
router.delete("/:id", deleteLimits);

module.exports = router;

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createLimit,
  getLimits,
  updateLimit,
  deleteLimit,
} = require("../controllers/limitsController");

router.use(authMiddleware);

router.post("/", createLimit);
router.get("/", getLimits);
router.put("/:id", updateLimit);
router.delete("/:id", deleteLimit);

module.exports = router;

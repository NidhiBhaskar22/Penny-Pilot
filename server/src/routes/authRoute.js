const express = require("express");
const router = express.Router();

const {
  register,
  login,
  googleLogin,
  completeProfile,
  refresh,
  logout,
  logoutAll,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", register); // pass function, no parentheses
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/complete-profile", authMiddleware, completeProfile);
router.post("/refresh", refresh);
router.post("/logout", authMiddleware, logout);
router.post("/logout-all", authMiddleware, logoutAll);

module.exports = router;

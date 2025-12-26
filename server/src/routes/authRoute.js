const express = require("express");
const router = express.Router();

const { register, login, completeProfile} = require("../controllers/authController");

router.post("/register", register); // pass function, no parentheses
router.post("/login", login);
router.post("/complete-profile", completeProfile);

module.exports = router;

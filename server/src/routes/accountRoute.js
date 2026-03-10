const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  setAccountMethods,
} = require("../controllers/accountController");

router.use(authMiddleware);

router.get("/", getAccounts); // ?tree=true
router.post("/", createAccount);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);
router.put("/:id/methods", setAccountMethods);

module.exports = router;

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Import each function individually to check for undefined
const loanController = require("../controllers/loanController");

const {
  createLoan,
  updateLoan,
  deleteLoan,
  makeLoanPayment,
  updateLoanPayment,
  deleteLoanPayment,
} = loanController;


router.use(authMiddleware);

router.post("/", createLoan);
router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);
router.post("/payment", makeLoanPayment);
router.put("/payment/:id", updateLoanPayment);
router.delete("/payment/:id", deleteLoanPayment);

module.exports = router;

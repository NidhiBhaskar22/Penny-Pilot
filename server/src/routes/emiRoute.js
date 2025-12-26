const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
    createEMI,
    payEMIInstallment,
    getAllEMIs,
    deleteEMI
} = require("../controllers/emiController");

router.use(authMiddleware);

router.post("/", createEMI);
router.post("/pay", payEMIInstallment);
router.get("/", getAllEMIs);
router.delete("/:id", deleteEMI);

module.exports = router;
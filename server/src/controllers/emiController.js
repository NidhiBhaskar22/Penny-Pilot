const prisma = require("../config/prismaClient");
const { applyBalanceChange } = require("../utils/balanceUtils");

const getUserId = (req) => req.user?.userId ?? req.user?.id;

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

// Create EMI + schedules
const createEMI = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      title,
      type,
      totalAmount,
      numInstallments,
      startDate,
      linkedLoanId,
    } = req.body;

    if (!title || !totalAmount || !numInstallments || !startDate) {
      return res.status(400).json({
        message: "title, totalAmount, numInstallments, startDate are required",
      });
    }

    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ message: "Invalid startDate" });
    }

    const emiAmount = Number(totalAmount) / Number(numInstallments);

    const result = await prisma.$transaction(async (tx) => {
      const emi = await tx.eMI.create({
        data: {
          userId,
          title,
          type: type || "LOAN",
          totalAmount,
          numInstallments,
          emiAmount,
          startDate: start,
          linkedLoanId: linkedLoanId || null,
        },
      });

      const schedules = Array.from({ length: Number(numInstallments) }).map(
        (_, i) => ({
          emiId: emi.id,
          userId,
          dueDate: addMonths(start, i),
          amount: emiAmount,
        })
      );

      if (schedules.length) {
        await tx.eMISchedule.createMany({ data: schedules });
      }

      return emi;
    });

    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create EMI", details: err.message });
  }
};

// Pay next unpaid schedule for an EMI
const payEMIInstallment = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { emiId } = req.body;
    if (!emiId) return res.status(400).json({ message: "emiId is required" });

    const nextSchedule = await prisma.eMISchedule.findFirst({
      where: { emiId: Number(emiId), userId, paid: false },
      orderBy: { dueDate: "asc" },
    });

    if (!nextSchedule) {
      return res
        .status(400)
        .json({ error: "All installments already paid" });
    }

    const updated = await prisma.eMISchedule.update({
      where: { id: nextSchedule.id },
      data: { paid: true, paidAt: new Date() },
    });

    await applyBalanceChange(userId, -Number(nextSchedule.amount));

    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to pay EMI installment", details: err.message });
  }
};

const getAllEMIs = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const emis = await prisma.eMI.findMany({
      where: { userId },
      include: { schedules: true, loan: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(emis);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch EMIs", details: err.message });
  }
};

const deleteEMI = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const emi = await prisma.eMI.findFirst({
      where: { id: parseInt(id), userId },
    });
    if (!emi) return res.status(404).json({ error: "EMI not found" });

    await prisma.$transaction(async (tx) => {
      await tx.eMISchedule.deleteMany({ where: { emiId: emi.id } });
      await tx.eMI.delete({ where: { id: emi.id } });
    });

    res.json({ message: "EMI deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete EMI", details: err.message });
  }
};

module.exports = {
  createEMI,
  payEMIInstallment,
  getAllEMIs,
  deleteEMI,
};

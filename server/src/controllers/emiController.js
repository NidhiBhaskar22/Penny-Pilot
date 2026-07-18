const prisma = require("../config/prismaClient");
const { applyBalanceChange } = require("../utils/balanceUtils");
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const { getUserId } = require("../utils/requestUtils");

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

// Create EMI + schedules
const createEMI = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const {
    title,
    type,
    totalAmount,
    numInstallments,
    startDate,
    linkedLoanId,
  } = req.body;

  if (!title || !totalAmount || !numInstallments || !startDate) {
    throw new ApiError(400, "title, totalAmount, numInstallments, startDate are required");
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    throw new ApiError(400, "Invalid startDate");
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
});

// Pay next unpaid schedule for an EMI
const payEMIInstallment = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { emiId } = req.body;
  if (!emiId) throw new ApiError(400, "emiId is required");

  const nextSchedule = await prisma.eMISchedule.findFirst({
    where: { emiId: Number(emiId), userId, paid: false },
    orderBy: { dueDate: "asc" },
  });

  if (!nextSchedule) {
    throw new ApiError(400, "All installments already paid");
  }

  const updated = await prisma.eMISchedule.update({
    where: { id: nextSchedule.id },
    data: { paid: true, paidAt: new Date() },
  });

  await applyBalanceChange(userId, -Number(nextSchedule.amount));

  res.json(updated);
});

const getAllEMIs = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const emis = await prisma.eMI.findMany({
    where: { userId },
    include: { schedules: true, loan: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(emis);
});

const deleteEMI = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { id } = req.params;
  const emi = await prisma.eMI.findFirst({
    where: { id: parseInt(id), userId },
  });
  if (!emi) throw new ApiError(404, "EMI not found");

  await prisma.$transaction(async (tx) => {
    await tx.eMISchedule.deleteMany({ where: { emiId: emi.id } });
    await tx.eMI.delete({ where: { id: emi.id } });
  });

  res.json({ message: "EMI deleted successfully" });
});

module.exports = {
  createEMI,
  payEMIInstallment,
  getAllEMIs,
  deleteEMI,
};

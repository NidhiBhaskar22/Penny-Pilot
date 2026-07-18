const { applyBalanceChange } = require("../utils/balanceUtils");
const prisma = require("../config/prismaClient");
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");
const { getUserId } = require("../utils/requestUtils");

/**
 * Create a loan
 */
const createLoan = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { amount, tenureMonths, startDate, interestRate, description } =
    req.body;

  if (!amount || amount <= 0) throw new ApiError(400, "Invalid amount");
  if (!tenureMonths || tenureMonths <= 0) throw new ApiError(400, "Invalid tenureMonths");
  if (!startDate) throw new ApiError(400, "startDate required");

  const loan = await prisma.loan.create({
    data: {
      userId,
      amount,
      tenureMonths,
      startDate: new Date(startDate),
      interestRate,
      outstanding: amount,
      description,
    },
  });

  res.json(loan);
});

// Update loan details
const updateLoan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const existing = await prisma.loan.findFirst({
    where: { id: parseInt(id), userId },
  });
  if (!existing) throw new ApiError(404, "Loan not found");

  const loan = await prisma.loan.update({
    where: { id: parseInt(id) },
    data: req.body,
  });
  res.json(loan);
});

// Delete a loan
const deleteLoan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const existing = await prisma.loan.findFirst({
    where: { id: parseInt(id), userId },
  });
  if (!existing) throw new ApiError(404, "Loan not found");

  await prisma.loan.delete({ where: { id: parseInt(id) } });
  res.json({ message: "Loan deleted successfully" });
});

// Make a payment on a loan installment
const makeLoanPayment = asyncHandler(async (req, res) => {
  const { loanId, amount } = req.body;

  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");

  const loan = await prisma.loan.findFirst({
    where: { id: loanId, userId },
  });
  if (!loan) throw new ApiError(404, "Loan not found");

  if (amount > loan.outstanding) {
    throw new ApiError(400, "Payment exceeds outstanding amount");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedLoan = await tx.loan.update({
      where: { id: loanId },
      data: { outstanding: { decrement: amount } },
    });

    const payment = await tx.loanPayment.create({
      data: { loanId, amount },
    });

    await applyBalanceChange(loan.userId, -amount);

    return { updatedLoan, payment };
  });

  res.json(result);
});

// Update a loan payment
const updateLoanPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  const existing = await prisma.loanPayment.findUnique({
    where: { id: parseInt(id) },
    include: { loan: true },
  });

  if (!existing) throw new ApiError(404, "Payment not found");
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");
  if (existing.loan.userId !== userId) throw new ApiError(403, "Forbidden");

  const diff = amount - existing.amount;

  const updated = await prisma.$transaction(async (tx) => {
    const payment = await tx.loanPayment.update({
      where: { id: parseInt(id) },
      data: { amount },
    });

    await tx.loan.update({
      where: { id: existing.loanId },
      data: { outstanding: { decrement: diff } },
    });

    await applyBalanceChange(existing.loan.userId, -diff);

    return payment;
  });

  res.json(updated);
});

// Delete a loan payment
const deleteLoanPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.loanPayment.findUnique({
    where: { id: parseInt(id) },
    include: { loan: true },
  });

  if (!existing) throw new ApiError(404, "Payment not found");
  const userId = getUserId(req);
  if (!userId) throw new ApiError(401, "Unauthorized");
  if (existing.loan.userId !== userId) throw new ApiError(403, "Forbidden");

  await prisma.$transaction(async (tx) => {
    await tx.loanPayment.delete({ where: { id: parseInt(id) } });

    await tx.loan.update({
      where: { id: existing.loanId },
      data: { outstanding: { increment: existing.amount } },
    });

    await applyBalanceChange(existing.loan.userId, existing.amount);
  });

  res.json({ message: "Loan payment deleted successfully" });
});

module.exports = {
  createLoan,
  updateLoan,
  deleteLoan,
  makeLoanPayment,
  updateLoanPayment,
  deleteLoanPayment,
};

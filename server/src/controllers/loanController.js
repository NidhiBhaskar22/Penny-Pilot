const { PrismaClient } = require("@prisma/client");
const { applyBalanceChange } = require("../utils/balanceUtils");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys"); // ✅ Add this line

const prisma = new PrismaClient();

/**
 * Create a split expense
 * - Creates the base Expense
 * - Creates SplitExpense records for each participant
 * - Adjusts balances: payer gets credited, others debited
 */
const createSplitExpense = async (req, res) => {
  try {
    const { userId, amount, tag, spentAt, splits } = req.body;

    const month = monthKeyIST(new Date(spentAt));
    const week = getWeekOfMonth(new Date(spentAt));

    // Transaction: expense + splits + balances
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId,
          amount,
          tag,
          spentAt: new Date(spentAt),
          month,
          week,
        },
      });

      for (const split of splits) {
        const {
          userId: participantId,
          amountOwed,
          amountPaid,
          paidByUserId,
        } = split;

        await tx.splitExpense.create({
          data: {
            expenseId: expense.id,
            userId: participantId,
            amountOwed,
            amountPaid,
            paidByUserId,
          },
        });

        // Balance logic:
        // If this participant did NOT pay their share -> debit them
        if (paidByUserId !== participantId) {
          await applyBalanceChange(participantId, -amountOwed);
          await applyBalanceChange(paidByUserId, amountOwed);
        }
      }

      return expense;
    });

    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create split expense", details: err.message });
  }
};

/**
 * Update a split expense
 * - Roll back old balance changes
 * - Apply new split distribution
 */
const updateSplitExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { splits } = req.body;

    const existing = await prisma.splitExpense.findMany({
      where: { expenseId: parseInt(id) },
    });
    if (!existing.length)
      return res.status(404).json({ error: "Split expense not found" });

    // Transaction: rollback + reapply
    await prisma.$transaction(async (tx) => {
      // rollback old balance impacts
      for (const split of existing) {
        if (split.paidByUserId !== split.userId) {
          await applyBalanceChange(split.userId, split.amountOwed); // refund participant
          await applyBalanceChange(split.paidByUserId, -split.amountOwed); // remove from payer
        }
      }

      // delete old splits
      await tx.splitExpense.deleteMany({ where: { expenseId: parseInt(id) } });

      // add new splits
      for (const split of splits) {
        const {
          userId: participantId,
          amountOwed,
          amountPaid,
          paidByUserId,
        } = split;

        await tx.splitExpense.create({
          data: {
            expenseId: parseInt(id),
            userId: participantId,
            amountOwed,
            amountPaid,
            paidByUserId,
          },
        });

        if (paidByUserId !== participantId) {
          await applyBalanceChange(participantId, -amountOwed);
          await applyBalanceChange(paidByUserId, amountOwed);
        }
      }
    });

    res.json({ message: "Split expense updated successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update split expense", details: err.message });
  }
};

/**
 * Create Money Lent
 */
const createMoneyLent = async (req, res) => {
  try {
    const { lenderId, borrower, amount, purpose, dueDate } = req.body;

    const moneyLent = await prisma.moneyLent.create({
      data: {
        lenderId,
        borrower,
        amount,
        purpose,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await applyBalanceChange(lenderId, -amount);

    res.json(moneyLent);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create money lent", details: err.message });
  }
};

/**
 * Update Money Lent
 */
const updateMoneyLent = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, ...rest } = req.body;

    const existing = await prisma.moneyLent.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ error: "Money lent record not found" });

    const diff = amount !== undefined ? amount - existing.amount : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const ml = await tx.moneyLent.update({
        where: { id: parseInt(id) },
        data: { ...rest, amount },
      });

      if (diff !== 0) {
        await applyBalanceChange(existing.lenderId, -diff);
      }

      return ml;
    });

    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update money lent", details: err.message });
  }
};

/**
 * Create Money Borrowed
 */
const createMoneyBorrowed = async (req, res) => {
  try {
    const { borrowerId, lender, amount, purpose, dueDate } = req.body;

    const moneyBorrowed = await prisma.moneyBorrowed.create({
      data: {
        borrowerId,
        lender,
        amount,
        purpose,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await applyBalanceChange(borrowerId, amount);

    res.json(moneyBorrowed);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create money borrowed", details: err.message });
  }
};

/**
 * Update Money Borrowed
 */
const updateMoneyBorrowed = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, ...rest } = req.body;

    const existing = await prisma.moneyBorrowed.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ error: "Money borrowed record not found" });

    const diff = amount !== undefined ? amount - existing.amount : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const mb = await tx.moneyBorrowed.update({
        where: { id: parseInt(id) },
        data: { ...rest, amount },
      });

      if (diff !== 0) {
        await applyBalanceChange(existing.borrowerId, diff);
      }

      return mb;
    });

    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update money borrowed", details: err.message });
  }
};

/**
 * Create a loan
 */
const createLoan = async (req, res) => {
  try {
    const {
      userId,
      amount,
      tenureMonths,
      startDate,
      interestRate,
      description,
    } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });
    if (!tenureMonths || tenureMonths <= 0)
      return res.status(400).json({ message: "Invalid tenureMonths" });
    if (!startDate)
      return res.status(400).json({ message: "startDate required" });

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
  } catch (error) {
    res.status(500).json({ message: "Failed to create loan", error });
  }
};

// Update loan details
const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await prisma.loan.update({
      where: { id: parseInt(id) },
      data: req.body,
    });
    res.json(loan);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update loan", details: err.message });
  }
};

// Delete a loan
const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.loan.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Loan deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete loan", details: err.message });
  }
};

// Make a payment on a loan installment
const makeLoanPayment = async (req, res) => {
  try {
    const { loanId, amount } = req.body;

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    if (amount > loan.outstanding) {
      return res
        .status(400)
        .json({ error: "Payment exceeds outstanding amount" });
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
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to make loan payment", details: err.message });
  }
};

// Update a loan payment
const updateLoanPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const existing = await prisma.loanPayment.findUnique({
      where: { id: parseInt(id) },
      include: { loan: true },
    });

    if (!existing) return res.status(404).json({ error: "Payment not found" });

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
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update loan payment", details: err.message });
  }
};

// Delete a loan payment
const deleteLoanPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.loanPayment.findUnique({
      where: { id: parseInt(id) },
      include: { loan: true },
    });

    if (!existing) return res.status(404).json({ error: "Payment not found" });

    await prisma.$transaction(async (tx) => {
      await tx.loanPayment.delete({ where: { id: parseInt(id) } });

      await tx.loan.update({
        where: { id: existing.loanId },
        data: { outstanding: { increment: existing.amount } },
      });

      await applyBalanceChange(existing.loan.userId, existing.amount);
    });

    res.json({ message: "Loan payment deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete loan payment", details: err.message });
  }
};

module.exports = {
  createSplitExpense,
  updateSplitExpense,
  createMoneyLent,
  updateMoneyLent,
  createMoneyBorrowed,
  updateMoneyBorrowed,
  createLoan,
  updateLoan,
  deleteLoan,
  makeLoanPayment,
  updateLoanPayment,
  deleteLoanPayment,
};

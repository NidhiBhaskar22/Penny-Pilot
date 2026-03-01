const prisma = require("../config/prismaClient");
const { applyBalanceChange } = require("../utils/balanceUtils");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");

const getUserId = (req) => req.user?.userId ?? req.user?.id;

/**
 * Create a split expense
 * - Creates the base Expense
 * - Creates SplitExpense records for each participant
 * - Adjusts balances: payer gets credited, others debited
 */
const createSplitExpense = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { amount, tag, spentAt, splits, accountId, categoryId } = req.body;
    if (!amount || !spentAt || !accountId || !categoryId) {
      return res.status(400).json({
        message: "amount, spentAt, accountId, categoryId are required",
      });
    }
    if (!Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ message: "splits are required" });
    }

    const month = monthKeyIST(new Date(spentAt));
    const week = getWeekOfMonth(new Date(spentAt));

    // Transaction: expense + splits + balances
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId,
          amount,
          tag: tag || "General",
          spentAt: new Date(spentAt),
          month,
          week,
          accountId,
          categoryId,
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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { splits } = req.body;

    const expense = await prisma.expense.findFirst({
      where: { id: parseInt(id), userId },
      select: { id: true },
    });
    if (!expense)
      return res.status(404).json({ error: "Split expense not found" });

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
    const lenderId = getUserId(req);
    if (!lenderId) return res.status(401).json({ message: "Unauthorized" });

    const { borrower, amount, purpose, dueDate } = req.body;

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
    const lenderId = getUserId(req);
    if (!lenderId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { amount, ...rest } = req.body;

    const existing = await prisma.moneyLent.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ error: "Money lent record not found" });
    if (existing.lenderId !== lenderId)
      return res.status(403).json({ error: "Forbidden" });

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
    const borrowerId = getUserId(req);
    if (!borrowerId) return res.status(401).json({ message: "Unauthorized" });

    const { lender, amount, purpose, dueDate } = req.body;

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
    const borrowerId = getUserId(req);
    if (!borrowerId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { amount, ...rest } = req.body;

    const existing = await prisma.moneyBorrowed.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ error: "Money borrowed record not found" });
    if (existing.borrowerId !== borrowerId)
      return res.status(403).json({ error: "Forbidden" });

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

module.exports = {
  createSplitExpense,
  updateSplitExpense,
  createMoneyLent,
  updateMoneyLent,
  createMoneyBorrowed,
  updateMoneyBorrowed,
};

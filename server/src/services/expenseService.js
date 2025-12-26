// src/services/expenseService.js
const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");
const { applyBalanceChange } = require("../utils/balanceUtils");

function computeMonth(date) {
  if (typeof monthKeyIST === "function") return monthKeyIST(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function computeWeek(date) {
  if (typeof getWeekOfMonth === "function") return getWeekOfMonth(date);
  // simple fallback: 1–4 based on day
  const day = date.getDate();
  return Math.ceil(day / 7);
}

async function createExpense(userId, payload) {
  const { amount, tag, spentAt, accountId, categoryId } = payload;

  if (!amount || !spentAt || !accountId || !categoryId) {
    throw new ApiError(
      400,
      "amount, spentAt, accountId and categoryId are required"
    );
  }

  const spentDate = new Date(spentAt);
  if (Number.isNaN(spentDate.getTime())) {
    throw new ApiError(400, "Invalid spentAt date");
  }

  const month = computeMonth(spentDate);
  const week = computeWeek(spentDate);

  const expense = await prisma.expense.create({
    data: {
      userId,
      amount,
      tag: tag || "General",
      spentAt: spentDate,
      month,
      week,
      accountId,
      categoryId,
    },
  });

  // Decrease user balance
  await applyBalanceChange(userId, -amount);

  return expense;
}

async function updateExpense(userId, expenseId, payload) {
  const id = Number(expenseId);
  if (!id) throw new ApiError(400, "Invalid expense id");

  const existing = await prisma.expense.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new ApiError(404, "Expense not found");
  }

  const data = { ...payload };

  // handle date change
  if (payload.spentAt) {
    const spentDate = new Date(payload.spentAt);
    if (Number.isNaN(spentDate.getTime())) {
      throw new ApiError(400, "Invalid spentAt date");
    }
    data.spentAt = spentDate;
    data.month = computeMonth(spentDate);
    data.week = computeWeek(spentDate);
  }

  let diff = 0;
  if (payload.amount !== undefined && payload.amount !== null) {
    diff = Number(payload.amount) - Number(existing.amount);
    data.amount = payload.amount;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const exp = await tx.expense.update({
      where: { id: existing.id },
      data,
    });

    if (diff !== 0) {
      // since expense reduces balance, positive diff → subtract more
      await applyBalanceChange(userId, -diff);
    }

    return exp;
  });

  return updated;
}

async function deleteExpense(userId, expenseId) {
  const id = Number(expenseId);
  if (!id) throw new ApiError(400, "Invalid expense id");

  const existing = await prisma.expense.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new ApiError(404, "Expense not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: existing.id } });
    // refund back to balance
    await applyBalanceChange(userId, existing.amount);
  });

  return { message: "Expense deleted successfully" };
}

async function getAllExpenses(userId) {
  return prisma.expense.findMany({
    where: { userId },
    orderBy: { spentAt: "desc" },
    include: {
      account: true,
      category: true,
      splitExpenses: true,
    },
  });
}

async function getExpensesByMonth(userId, month, summaryOnly = false) {
  if (!month) throw new ApiError(400, "month is required");

  const agg = await prisma.expense.aggregate({
    where: { userId, month },
    _sum: { amount: true },
    _avg: { amount: true },
    _count: { _all: true },
  });

  const summary = {
    month,
    total: Number(agg._sum.amount ?? 0),
    count: agg._count?._all ?? 0,
    avg: Number(agg._avg.amount ?? 0),
  };

  if (summaryOnly) return summary;

  const items = await prisma.expense.findMany({
    where: { userId, month },
    orderBy: { spentAt: "desc" },
    include: {
      account: true,
      category: true,
      splitExpenses: true,
    },
  });

  return { ...summary, items };
}

module.exports = {
  createExpense,
  updateExpense,
  deleteExpense,
  getAllExpenses,
  getExpensesByMonth,
};

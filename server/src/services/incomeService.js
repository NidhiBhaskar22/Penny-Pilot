// src/services/incomeService.js
const prisma = require("../config/prismaClient");
const { monthKeyIST } = require("../utils/datKeys"); // you already use this
const { applyBalanceChange } = require("../utils/balanceUtils"); // you already had this
const { ApiError } = require("../middleware/errorMiddleware");

function computeMonth(date) {
  if (typeof monthKeyIST === "function") return monthKeyIST(date);
  // fallback if needed
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function createIncome(userId, payload) {
  const {
    amount,
    source,
    tag,
    creditedAt,
    accountId,
    categoryId,
    salaryBreakdown,
  } = payload;

  if (!amount || !creditedAt || !accountId || !categoryId) {
    throw new ApiError(
      400,
      "amount, creditedAt, accountId and categoryId are required"
    );
  }

  const creditedDate = new Date(creditedAt);
  if (Number.isNaN(creditedDate.getTime())) {
    throw new ApiError(400, "Invalid creditedAt date");
  }

  const month = computeMonth(creditedDate);

  const income = await prisma.income.create({
    data: {
      userId,
      amount,
      source: source || "Other",
      tag: tag || null,
      creditedAt: creditedDate,
      month,
      salaryBreakdown: salaryBreakdown || null,
      accountId,
      categoryId,
    },
  });

  // Increase user balance
  await applyBalanceChange(userId, amount);

  return income;
}

async function updateIncome(userId, incomeId, payload) {
  const id = Number(incomeId);
  if (!id) throw new ApiError(400, "Invalid income id");

  const existing = await prisma.income.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new ApiError(404, "Income not found");
  }

  const data = { ...payload };

  // Handle date/month change if creditedAt is passed
  if (payload.creditedAt) {
    const creditedDate = new Date(payload.creditedAt);
    if (Number.isNaN(creditedDate.getTime())) {
      throw new ApiError(400, "Invalid creditedAt date");
    }
    data.creditedAt = creditedDate;
    data.month = computeMonth(creditedDate);
  }

  let diff = 0;
  if (payload.amount !== undefined && payload.amount !== null) {
    diff = Number(payload.amount) - Number(existing.amount);
    data.amount = payload.amount;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const income = await tx.income.update({
      where: { id: existing.id },
      data,
    });

    if (diff !== 0) {
      // adjust balance by the difference
      await applyBalanceChange(userId, diff);
    }

    return income;
  });

  return updated;
}

async function deleteIncome(userId, incomeId) {
  const id = Number(incomeId);
  if (!id) throw new ApiError(400, "Invalid income id");

  const existing = await prisma.income.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new ApiError(404, "Income not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.income.delete({ where: { id: existing.id } });
    // remove from balance
    await applyBalanceChange(userId, -existing.amount);
  });

  return { message: "Income deleted successfully" };
}

async function getAllIncomes(userId) {
  return prisma.income.findMany({
    where: { userId },
    orderBy: { creditedAt: "desc" },
    include: {
      account: true,
      category: true,
    },
  });
}

async function getIncomesByMonth(userId, month) {
  if (!month) throw new ApiError(400, "month is required");

  return prisma.income.findMany({
    where: { userId, month },
    orderBy: { creditedAt: "desc" },
    include: {
      account: true,
      category: true,
    },
  });
}

module.exports = {
  createIncome,
  updateIncome,
  deleteIncome,
  getAllIncomes,
  getIncomesByMonth,
};

// src/services/expenseService.js
const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");
const { applyBalanceChange } = require("../utils/balanceUtils");

const METHOD_TYPES = new Set(["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"]);

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
}

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

async function ensureAccount(userId) {
  let account = await prisma.account.findFirst({
    where: { userId, isActive: true, type: "BANK", parentId: null },
    orderBy: { createdAt: "asc" },
  });
  if (!account) {
    account = await prisma.account.create({
      data: {
        userId,
        name: "Primary Bank",
        type: "BANK",
        balance: 0,
      },
    });
  }
  return account;
}

async function resolveBankAccount(userId, accountId) {
  const lookupId = accountId != null ? Number(accountId) : null;
  if (!lookupId) return ensureAccount(userId);

  const account = await prisma.account.findFirst({
    where: { id: lookupId, userId, isActive: true },
  });
  if (!account) throw new ApiError(404, "Account not found");
  if (normalizeType(account.type) !== "BANK" || account.parentId != null) {
    throw new ApiError(400, "accountId must be a BANK account");
  }
  return account;
}

async function resolvePaymentMethod(userId, bankAccountId, paymentMethodId) {
  if (paymentMethodId != null) {
    const method = await prisma.account.findFirst({
      where: {
        id: Number(paymentMethodId),
        userId,
        isActive: true,
        parentId: bankAccountId,
      },
    });
    if (!method) throw new ApiError(404, "Payment method not found for selected account");
    if (!METHOD_TYPES.has(normalizeType(method.type))) {
      throw new ApiError(400, "Selected payment method is invalid");
    }
    return method;
  }

  const fallback = await prisma.account.findFirst({
    where: { userId, isActive: true, parentId: bankAccountId },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) {
    throw new ApiError(
      400,
      "No payment method configured for this account. Add UPI/Cash/Card/Net Banking in Accounts page"
    );
  }
  if (!METHOD_TYPES.has(normalizeType(fallback.type))) {
    throw new ApiError(400, "Selected payment method is invalid");
  }
  return fallback;
}

async function ensureCategory(userId, name) {
  const categoryName = name || "General";
  let category = await prisma.category.findFirst({
    where: { userId, name: categoryName },
  });
  if (!category) {
    category = await prisma.category.create({
      data: { userId, name: categoryName, type: "EXPENSE" },
    });
  }
  return category;
}

async function createExpense(userId, payload) {
  const { amount, tag, spentAt, accountId, paymentMethodId, categoryId, paidTo } = payload;

  if (!amount || !spentAt) {
    throw new ApiError(400, "amount and spentAt are required");
  }

  const spentDate = new Date(spentAt);
  if (Number.isNaN(spentDate.getTime())) {
    throw new ApiError(400, "Invalid spentAt date");
  }

  const month = computeMonth(spentDate);
  const week = computeWeek(spentDate);

  const account =
    accountId != null ? await resolveBankAccount(userId, accountId) : await ensureAccount(userId);
  const paymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethodId);

  const category =
    categoryId != null
      ? await prisma.category.findFirst({ where: { id: categoryId, userId } })
      : await ensureCategory(userId, tag);
  if (!category) throw new ApiError(404, "Category not found");

  const expense = await prisma.expense.create({
    data: {
      userId,
      amount,
      tag: tag || "General",
      paidTo: paidTo || null,
      spentAt: spentDate,
      month,
      week,
      accountId: account.id,
      paymentMethodId: paymentMethod.id,
      categoryId: category.id,
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

  if (payload.accountId != null) {
    const account = await resolveBankAccount(userId, payload.accountId);
    data.accountId = account.id;
  }

  const effectiveAccountId = data.accountId || existing.accountId;
  const accountChanged = payload.accountId != null;
  if (payload.paymentMethodId != null || accountChanged) {
    const paymentMethod = await resolvePaymentMethod(
      userId,
      effectiveAccountId,
      payload.paymentMethodId != null ? payload.paymentMethodId : existing.paymentMethodId
    );
    data.paymentMethodId = paymentMethod.id;
  }

  if (payload.categoryId != null) {
    const category = await prisma.category.findFirst({
      where: { id: payload.categoryId, userId },
    });
    if (!category) throw new ApiError(404, "Category not found");
    data.categoryId = category.id;
  }

  if (payload.paidTo !== undefined) {
    data.paidTo = payload.paidTo || null;
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
      paymentMethod: true,
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
      paymentMethod: true,
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

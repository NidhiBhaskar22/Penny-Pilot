// src/services/expenseService.js
const prisma = require("../config/prismaClient");
const { ApiError } = require("../middleware/errorMiddleware");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");
const { applyBalanceChange } = require("../utils/balanceUtils");
const { parsePagination, buildPaginatedResult } = require("../utils/pagination");

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
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!account) {
    account = await prisma.account.create({
      data: {
        userId,
        name: "Primary Bank",
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
  return account;
}

async function resolvePaymentMethod(userId, bankAccountId, paymentMethod) {
  const normalized = normalizeType(paymentMethod);
  if (!METHOD_TYPES.has(normalized)) {
    throw new ApiError(400, "Invalid paymentMethod");
  }
  const enabled = await prisma.accountMethod.findFirst({
    where: {
      accountId: bankAccountId,
      account: { userId, isActive: true },
      method: normalized,
    },
  });
  if (!enabled) throw new ApiError(400, "Selected payment method is not enabled for this account");
  return normalized;
}

async function ensureCategory(userId, name = "General") {
  const categoryName = String(name).trim() || "General";
  let category = await prisma.category.findFirst({
    where: { userId, type: "EXPENSE", name: { equals: categoryName, mode: "insensitive" } },
  });
  if (!category) {
    category = await prisma.category.create({
      data: { userId, name: categoryName, type: "EXPENSE", kakeibo: null },
    });
  }
  return category;
}

async function createExpense(userId, payload) {
  const { amount, spentAt, accountId, paymentMethod, categoryId, paidTo } = payload;

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
  const selectedPaymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethod);

  const category =
    categoryId != null
      ? await prisma.category.findFirst({ where: { id: Number(categoryId), userId, type: "EXPENSE" } })
      : await ensureCategory(userId, "General");
  if (!category) throw new ApiError(404, "Category not found");

  const expense = await prisma.expense.create({
    data: {
      userId,
      amount,
      paidTo: paidTo || null,
      spentAt: spentDate,
      month,
      week,
      accountId: account.id,
      paymentMethod: selectedPaymentMethod,
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
  if (payload.paymentMethod != null || accountChanged) {
    const selectedPaymentMethod = await resolvePaymentMethod(
      userId,
      effectiveAccountId,
      payload.paymentMethod != null ? payload.paymentMethod : existing.paymentMethod
    );
    data.paymentMethod = selectedPaymentMethod;
  }

  if (payload.categoryId != null) {
    const category = await prisma.category.findFirst({
      where: { id: Number(payload.categoryId), userId, type: "EXPENSE" },
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

async function getAllExpenses(userId, query = {}) {
  const month = typeof query.month === "string" ? query.month.trim() : "";
  const paymentMethod = typeof query.paymentMethod === "string" ? normalizeType(query.paymentMethod) : "";
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const accountId = Number(query.accountId);
  const categoryId = Number(query.categoryId);
  const sortOrder = String(query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const sortByRaw = String(query.sortBy || "spentAt");
  const allowedSort = new Set(["spentAt", "amount", "month", "paidTo"]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "spentAt";

  const { page, pageSize, skip, take } = parsePagination(query, {
    defaultPageSize: 10,
    maxPageSize: 100,
  });

  const where = {
    userId,
    ...(month ? { month } : {}),
    ...(Number.isInteger(accountId) && accountId > 0 ? { accountId } : {}),
    ...(Number.isInteger(categoryId) && categoryId > 0 ? { categoryId } : {}),
    ...(METHOD_TYPES.has(paymentMethod) ? { paymentMethod } : {}),
    ...(q
      ? {
          OR: [
            { paidTo: { contains: q, mode: "insensitive" } },
            { category: { name: { contains: q, mode: "insensitive" } } },
            { account: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        account: true,
        category: true,
        splitExpenses: true,
      },
      skip,
      take,
    }),
  ]);
  const aggregate = await prisma.expense.aggregate({
    where,
    _sum: { amount: true },
    _avg: { amount: true },
    _count: { _all: true },
  });

  return buildPaginatedResult({
    items,
    total,
    page,
    pageSize,
    summary: {
      totalAmount: Number(aggregate._sum.amount ?? 0),
      totalCount: Number(aggregate._count?._all ?? total ?? 0),
      averageAmount: Number(aggregate._avg.amount ?? 0),
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

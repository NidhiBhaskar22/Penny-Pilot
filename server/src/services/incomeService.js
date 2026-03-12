// src/services/incomeService.js
const prisma = require("../config/prismaClient");
const { applyBalanceChange } = require("../utils/balanceUtils"); // you already had this
const { ApiError } = require("../middleware/errorMiddleware");
const { parsePagination, buildPaginatedResult } = require("../utils/pagination");

const METHOD_TYPES = new Set(["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"]);

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
}

async function resolveBankAccount(userId, accountId) {
  const lookupId = accountId != null ? Number(accountId) : null;
  let account = null;

  if (lookupId) {
    account = await prisma.account.findFirst({
      where: { id: lookupId, userId, isActive: true },
    });
    if (!account) throw new ApiError(404, "Account not found");
    return account;
  }

  account = await prisma.account.findFirst({
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
  if (!enabled) {
    throw new ApiError(400, "Selected payment method is not enabled for this account");
  }
  return normalized;
}

function getISTDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function computeMonth(date, source) {
  let { year, month, day } = getISTDateParts(date);
  const isSalary = String(source || "").trim().toLowerCase() === "salary";

  // Business rule: Salary credited between 25th-31st belongs to next month.
  if (isSalary && day >= 25) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

async function ensureIncomeAccount(userId) {
  return resolveBankAccount(userId, null);
}

async function createIncome(userId, payload) {
  const {
    amount,
    source,
    tag,
    creditedAt,
    accountId,
    paymentMethod,
    categoryId,
    salaryBreakdown,
  } = payload;

  if (!amount || !creditedAt) {
    throw new ApiError(400, "amount and creditedAt are required");
  }

  const creditedDate = new Date(creditedAt);
  if (Number.isNaN(creditedDate.getTime())) {
    throw new ApiError(400, "Invalid creditedAt date");
  }

  const month = computeMonth(creditedDate, source);

  const account =
    accountId != null ? await resolveBankAccount(userId, accountId) : await ensureIncomeAccount(userId);
  const selectedPaymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethod);

  let resolvedCategoryId = null;
  if (categoryId != null) {
    const category = await prisma.category.findFirst({
      where: { id: Number(categoryId), userId, type: "INCOME" },
    });
    if (!category) throw new ApiError(404, "Category not found");
    resolvedCategoryId = category.id;
  }

  const income = await prisma.income.create({
    data: {
      userId,
      amount,
      source: source || "Other",
      tag: tag ? String(tag).trim() || null : null,
      creditedAt: creditedDate,
      month,
      salaryBreakdown: salaryBreakdown || null,
      accountId: account.id,
      paymentMethod: selectedPaymentMethod,
      categoryId: resolvedCategoryId,
    },
  });

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

  // Recompute month if creditedAt or source changes.
  if (payload.creditedAt || payload.source !== undefined) {
    const creditedDate = payload.creditedAt
      ? new Date(payload.creditedAt)
      : new Date(existing.creditedAt);
    if (Number.isNaN(creditedDate.getTime())) {
      throw new ApiError(400, "Invalid creditedAt date");
    }
    if (payload.creditedAt) {
      data.creditedAt = creditedDate;
    }

    const effectiveSource =
      payload.source !== undefined ? payload.source : existing.source;
    data.month = computeMonth(creditedDate, effectiveSource);
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
      where: { id: Number(payload.categoryId), userId, type: "INCOME" },
    });
    if (!category) throw new ApiError(404, "Category not found");
    data.categoryId = category.id;
  } else if (payload.categoryId === null) {
    data.categoryId = null;
  }

  if (payload.tag !== undefined) {
    data.tag = payload.tag ? String(payload.tag).trim() || null : null;
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

async function getAllIncomes(userId, query = {}) {
  const month = typeof query.month === "string" ? query.month.trim() : "";
  const paymentMethod = typeof query.paymentMethod === "string" ? normalizeType(query.paymentMethod) : "";
  const source = typeof query.source === "string" ? query.source.trim() : "";
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const accountId = Number(query.accountId);
  const categoryId = Number(query.categoryId);
  const sortOrder = String(query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const sortByRaw = String(query.sortBy || "creditedAt");
  const allowedSort = new Set(["creditedAt", "amount", "source", "month"]);
  const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "creditedAt";

  const { page, pageSize, skip, take } = parsePagination(query, {
    defaultPageSize: 10,
    maxPageSize: 100,
  });

  const where = {
    userId,
    ...(month ? { month } : {}),
    ...(source ? { source: { contains: source, mode: "insensitive" } } : {}),
    ...(Number.isInteger(accountId) && accountId > 0 ? { accountId } : {}),
    ...(Number.isInteger(categoryId) && categoryId > 0 ? { categoryId } : {}),
    ...(METHOD_TYPES.has(paymentMethod) ? { paymentMethod } : {}),
    ...(q
      ? {
          OR: [
            { source: { contains: q, mode: "insensitive" } },
            { tag: { contains: q, mode: "insensitive" } },
            { category: { name: { contains: q, mode: "insensitive" } } },
            { account: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.income.count({ where }),
    prisma.income.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        account: true,
        category: true,
      },
      skip,
      take,
    }),
  ]);
  const aggregate = await prisma.income.aggregate({
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

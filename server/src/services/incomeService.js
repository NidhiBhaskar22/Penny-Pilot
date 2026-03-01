// src/services/incomeService.js
const prisma = require("../config/prismaClient");
const { applyBalanceChange } = require("../utils/balanceUtils"); // you already had this
const { ApiError } = require("../middleware/errorMiddleware");

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
    if (normalizeType(account.type) !== "BANK" || account.parentId != null) {
      throw new ApiError(400, "accountId must be a BANK account");
    }
    return account;
  }

  account = await prisma.account.findFirst({
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

async function ensureIncomeCategory(userId, source) {
  const name = String(source || "Income").trim() || "Income";
  let category = await prisma.category.findFirst({
    where: { userId, name, type: "INCOME" },
  });
  if (!category) {
    category = await prisma.category.create({
      data: { userId, name, type: "INCOME" },
    });
  }
  return category;
}

async function createIncome(userId, payload) {
  const {
    amount,
    source,
    tag,
    creditedAt,
    accountId,
    paymentMethodId,
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
  const paymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethodId);

  const category =
    categoryId != null
      ? await prisma.category.findFirst({
          where: { id: Number(categoryId), userId },
        })
      : await ensureIncomeCategory(userId, source);
  if (!category) throw new ApiError(404, "Category not found");

  const income = await prisma.income.create({
    data: {
      userId,
      amount,
      source: source || "Other",
      tag: tag || null,
      creditedAt: creditedDate,
      month,
      salaryBreakdown: salaryBreakdown || null,
      accountId: account.id,
      paymentMethodId: paymentMethod.id,
      categoryId: category.id,
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
      where: { id: Number(payload.categoryId), userId },
    });
    if (!category) throw new ApiError(404, "Category not found");
    data.categoryId = category.id;
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
      paymentMethod: true,
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
      paymentMethod: true,
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

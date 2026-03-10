const prisma = require("../config/prismaClient");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");
const { applyBalanceChange } = require("../utils/balanceUtils");
const { parsePagination, buildPaginatedResult } = require("../utils/pagination");

const METHOD_TYPES = new Set(["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"]);

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
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
  if (accountId == null) return ensureAccount(userId);
  const account = await prisma.account.findFirst({
    where: { id: Number(accountId), userId, isActive: true },
  });
  if (!account) return null;
  return account;
}

async function resolvePaymentMethod(userId, bankAccountId, paymentMethod) {
  const normalized = normalizeType(paymentMethod);
  if (!METHOD_TYPES.has(normalized)) return "INVALID_METHOD";
  const enabled = await prisma.accountMethod.findFirst({
    where: {
      accountId: bankAccountId,
      account: { userId, isActive: true },
      method: normalized,
    },
  });
  if (!enabled) return null;
  return normalized;
}

// Create investment with type, ROI, projections
const createInvestment = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { amount, instrument, type, roi, projections, details, investedAt, accountId, paymentMethod } =
      req.body;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }
    if (!instrument) {
      return res.status(400).json({ message: "instrument is required" });
    }

    const investDate = new Date(investedAt);
    if (Number.isNaN(investDate.getTime())) {
      return res.status(400).json({ message: "investedAt is required and must be valid" });
    }

    const parsedRoi = roi === undefined || roi === null || roi === "" ? 0 : Number(roi);
    if (!Number.isFinite(parsedRoi)) {
      return res.status(400).json({ message: "roi must be a valid number" });
    }
    const month = monthKeyIST(investDate);
    const week = getWeekOfMonth(investDate);

    const account =
      accountId != null ? await resolveBankAccount(userId, accountId) : await ensureAccount(userId);

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    const selectedPaymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethod);
    if (!selectedPaymentMethod) {
      return res.status(400).json({
        message: "Selected payment method is not enabled for this account",
      });
    }
    if (selectedPaymentMethod === "INVALID_METHOD") {
      return res.status(400).json({ message: "Selected payment method is invalid" });
    }

    const investment = await prisma.investment.create({
      data: {
        userId,
        accountId: account.id,
        amount: parsedAmount,
        instrument,
        type,
        roi: parsedRoi,
        projections,
        details: details || null,
        investedAt: investDate,
        month,
        week,
        paymentMethod: selectedPaymentMethod,
      },
    });

    // reduce user balance (money invested leaves wallet)
    await applyBalanceChange(userId, -parsedAmount);

    res.json(investment);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create investment", details: err.message });
  }
};

const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, accountId, paymentMethod, investedAt, ...rest } = req.body;

    const existing = await prisma.investment.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ error: "Investment not found" });
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (existing.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });

    const diff = amount !== undefined ? amount - existing.amount : 0;

    let parsedInvestedAt = undefined;
    if (investedAt !== undefined) {
      parsedInvestedAt = new Date(investedAt);
      if (Number.isNaN(parsedInvestedAt.getTime())) {
        return res.status(400).json({ message: "Invalid investedAt date" });
      }
    }

    let nextAccountId = undefined;
    if (accountId !== undefined) {
      const account = await resolveBankAccount(userId, accountId);
      if (!account) return res.status(404).json({ message: "Account not found" });
      nextAccountId = account.id;
    }

    const effectiveAccountId = nextAccountId ?? existing.accountId;
    let nextPaymentMethod;
    if (paymentMethod !== undefined || nextAccountId !== undefined) {
      const method = await resolvePaymentMethod(
        userId,
        effectiveAccountId,
        paymentMethod !== undefined ? paymentMethod : existing.paymentMethod
      );
      if (!method) {
        return res.status(400).json({
          message: "Selected payment method is not enabled for this account",
        });
      }
      if (method === "INVALID_METHOD") {
        return res.status(400).json({ message: "Selected payment method is invalid" });
      }
      nextPaymentMethod = method;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.investment.update({
        where: { id: parseInt(id) },
        data: {
          ...rest,
          ...(amount !== undefined ? { amount } : {}),
          ...(parsedInvestedAt ? { investedAt: parsedInvestedAt } : {}),
          ...(nextAccountId !== undefined ? { accountId: nextAccountId } : {}),
          ...(nextPaymentMethod !== undefined
            ? { paymentMethod: nextPaymentMethod }
            : {}),
        },
      });

      if (diff !== 0) {
        await applyBalanceChange(existing.userId, -diff);
      }

      return inv;
    });

    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update investment", details: err.message });
  }
};

const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.investment.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ error: "Investment not found" });
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (existing.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });

    await prisma.$transaction(async (tx) => {
      await tx.investment.delete({ where: { id: parseInt(id) } });

      // refund balance when deleting an investment
      await applyBalanceChange(existing.userId, existing.amount);
    });

    res.json({ message: "Investment deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete investment", details: err.message });
  }
};

const getAllInvestments = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const month = typeof req.query.month === "string" ? req.query.month.trim() : "";
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const paymentMethod = typeof req.query.paymentMethod === "string"
      ? normalizeType(req.query.paymentMethod)
      : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const accountId = Number(req.query.accountId);
    const sortOrder = String(req.query.sortOrder || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortByRaw = String(req.query.sortBy || "investedAt");
    const allowedSort = new Set(["investedAt", "amount", "instrument", "month", "roi"]);
    const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "investedAt";

    const { page, pageSize, skip, take } = parsePagination(req.query, {
      defaultPageSize: 10,
      maxPageSize: 100,
    });

    const where = {
      userId,
      ...(month ? { month } : {}),
      ...(type ? { type: { contains: type, mode: "insensitive" } } : {}),
      ...(Number.isInteger(accountId) && accountId > 0 ? { accountId } : {}),
      ...(METHOD_TYPES.has(paymentMethod) ? { paymentMethod } : {}),
      ...(q
        ? {
            OR: [
              { instrument: { contains: q, mode: "insensitive" } },
              { details: { contains: q, mode: "insensitive" } },
              { account: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.investment.count({ where }),
      prisma.investment.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: { account: true },
        skip,
        take,
      }),
    ]);

    res.json(
      buildPaginatedResult({
        items,
        total,
        page,
        pageSize,
      })
    );
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch investments", details: err.message });
  }
};

const getInvestmentsByMonth = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { month } = req.params;
    const investments = await prisma.investment.findMany({
      where: { userId, month },
      include: { account: true },
    });
    res.json(investments);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch investments by month",
      details: err.message,
    });
  }
};

// ROI profit summary
const getProfitSummary = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const investments = await prisma.investment.findMany({
      where: { userId },
      include: { account: true },
    });

    let totalInvested = 0;
    let expectedProfit = 0;

    investments.forEach((inv) => {
      totalInvested += inv.amount;
      if (inv.roi) {
        expectedProfit += inv.amount * (inv.roi / 100);
      }
    });

    res.json({ totalInvested, expectedProfit });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch profit summary", details: err.message });
  }
};

module.exports = {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getAllInvestments,
  getInvestmentsByMonth,
  getProfitSummary,
};

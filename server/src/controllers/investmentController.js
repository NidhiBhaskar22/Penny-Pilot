const prisma = require("../config/prismaClient");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");
const { applyBalanceChange } = require("../utils/balanceUtils");

const METHOD_TYPES = new Set(["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"]);

function normalizeType(type) {
  return String(type || "")
    .trim()
    .toUpperCase();
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
  if (accountId == null) return ensureAccount(userId);
  const account = await prisma.account.findFirst({
    where: { id: Number(accountId), userId, isActive: true },
  });
  if (!account) return null;
  if (normalizeType(account.type) !== "BANK" || account.parentId != null) return "INVALID_BANK";
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
    if (!method) return null;
    if (!METHOD_TYPES.has(normalizeType(method.type))) return "INVALID_METHOD";
    return method;
  }

  const fallback = await prisma.account.findFirst({
    where: { userId, isActive: true, parentId: bankAccountId },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) return null;
  if (!METHOD_TYPES.has(normalizeType(fallback.type))) return "INVALID_METHOD";
  return fallback;
}

// Create investment with type, ROI, projections
const createInvestment = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      amount,
      instrument,
      type,
      roi,
      projections,
      details,
      investedAt,
      accountId,
      paymentMethodId,
    } =
      req.body;

    const investDate = new Date(investedAt);
    if (Number.isNaN(investDate.getTime())) {
      return res.status(400).json({ message: "investedAt is required and must be valid" });
    }
    const month = monthKeyIST(investDate);
    const week = getWeekOfMonth(investDate);

    const account =
      accountId != null ? await resolveBankAccount(userId, accountId) : await ensureAccount(userId);

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    if (account === "INVALID_BANK") {
      return res.status(400).json({ message: "accountId must be a BANK account" });
    }

    const paymentMethod = await resolvePaymentMethod(userId, account.id, paymentMethodId);
    if (!paymentMethod) {
      return res.status(400).json({
        message: "No payment method configured for this account. Add UPI/Cash/Card/Net Banking in Accounts page",
      });
    }
    if (paymentMethod === "INVALID_METHOD") {
      return res.status(400).json({ message: "Selected payment method is invalid" });
    }

    const investment = await prisma.investment.create({
      data: {
        userId,
        accountId: account.id,
        amount,
        instrument,
        type,
        roi,
        projections,
        details,
        investedAt: investDate,
        month,
        week,
        paymentMethodId: paymentMethod.id,
      },
    });

    // reduce user balance (money invested leaves wallet)
    await applyBalanceChange(userId, -amount);

    res.json(investment);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create investment", details: err.message });
  }
};

const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, accountId, paymentMethodId, investedAt, ...rest } = req.body;

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
      if (account === "INVALID_BANK") {
        return res.status(400).json({ message: "accountId must be a BANK account" });
      }
      nextAccountId = account.id;
    }

    const effectiveAccountId = nextAccountId ?? existing.accountId;
    let nextPaymentMethodId;
    if (paymentMethodId !== undefined || nextAccountId !== undefined) {
      const method = await resolvePaymentMethod(
        userId,
        effectiveAccountId,
        paymentMethodId !== undefined ? paymentMethodId : existing.paymentMethodId
      );
      if (!method) {
        return res.status(400).json({
          message: "No payment method configured for this account. Add UPI/Cash/Card/Net Banking in Accounts page",
        });
      }
      if (method === "INVALID_METHOD") {
        return res.status(400).json({ message: "Selected payment method is invalid" });
      }
      nextPaymentMethodId = method.id;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.investment.update({
        where: { id: parseInt(id) },
        data: {
          ...rest,
          ...(amount !== undefined ? { amount } : {}),
          ...(parsedInvestedAt ? { investedAt: parsedInvestedAt } : {}),
          ...(nextAccountId !== undefined ? { accountId: nextAccountId } : {}),
          ...(nextPaymentMethodId !== undefined
            ? { paymentMethodId: nextPaymentMethodId }
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

    const investments = await prisma.investment.findMany({
      where: { userId },
      include: { account: true, paymentMethod: true },
    });
    res.json(investments);
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
      include: { account: true, paymentMethod: true },
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
      include: { account: true, paymentMethod: true },
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

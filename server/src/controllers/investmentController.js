const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");
const {
  adjustUserBalance,
  updateBalance,
  applyBalanceChange,
} = require("../utils/balanceUtils");

// Create investment with type, ROI, projections
const createInvestment = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { amount, instrument, type, roi, projections, details, investedAt } =
      req.body;

    const investDate = new Date(investedAt);
    const month = monthKeyIST(investDate);
    const week = getWeekOfMonth(investDate);

    const investment = await prisma.investment.create({
      data: {
        userId,
        amount,
        instrument,
        type,
        roi,
        projections,
        details,
        investedAt: investDate,
        month,
        week,
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
    const { amount, ...rest } = req.body;

    const existing = await prisma.investment.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing)
      return res.status(404).json({ error: "Investment not found" });

    const diff = amount !== undefined ? amount - existing.amount : 0;

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.investment.update({
        where: { id: parseInt(id) },
        data: { ...rest, amount },
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

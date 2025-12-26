const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { monthKeyIST, getMonthDateRange } = require("../utils/datKeys");

// -------------------- Normal Dashboard --------------------
const getNormalDashboard = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Totals
    const totalIncome = await prisma.income.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const totalExpense = await prisma.expense.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const totalLoanPayments = await prisma.loanPayment.aggregate({
      where: { loan: { userId } },
      _sum: { amount: true },
    });

    const totalInsurance = await prisma.insurance.aggregate({
      where: { userId },
      _sum: { premium: true },
    });

    const totalInvestments = await prisma.investment.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const totalSavings =
      (totalIncome._sum.amount || 0) -
      ((totalExpense._sum.amount || 0) +
        (totalLoanPayments._sum.amount || 0) +
        (totalInsurance._sum.premium || 0));

    // Category-wise spend (month & year graphs)
    const categoryWise = await prisma.expense.groupBy({
      by: ["tag", "month"],
      where: { userId },
      _sum: { amount: true },
    });

    res.json({
      profile: { name: user.name, email: user.email },
      bankBalance: user.balance || 0,
      totalIncome: totalIncome._sum.amount || 0,
      totalExpenses:
        (totalExpense._sum.amount || 0) +
        (totalLoanPayments._sum.amount || 0) +
        (totalInsurance._sum.premium || 0),
      totalSavings,
      totalInvestments: totalInvestments._sum.amount || 0,
      categoryWise,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch normal dashboard",
      details: err.message,
    });
  }
};

// -------------------- Advanced Dashboard --------------------
const getAdvancedDashboard = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // 1) Kakeibo analysis: unexpected/unclassified spends
    const unclassifiedExpenses = await prisma.expense.findMany({
      where: { userId, OR: [{ tag: null }, { tag: "" }] },
    });

    // 2) Deviation alerts (vs Limits)
    const limits = await prisma.limits.findMany({ where: { userId } });
    const expensesByCategory = await prisma.expense.groupBy({
      by: ["tag"],
      where: { userId },
      _sum: { amount: true },
    });

    const deviations = expensesByCategory
      .map((cat) => {
        const limit = limits.find((l) => l.category === cat.tag);
        if (!limit) return null;
        return {
          category: cat.tag,
          spent: cat._sum.amount,
          limit: limit.monthlyLimit,
          deviation: cat._sum.amount - limit.monthlyLimit,
        };
      })
      .filter(Boolean);

    // 3) Tax calculations (latest record)
    const latestTax = await prisma.taxRecord.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    let taxSummary = null;
    if (latestTax) {
      taxSummary = {
        financialYear: latestTax.financialYear,
        taxableIncome: latestTax.taxableIncome,
        exemptions: latestTax.exemptions,
        liability: latestTax.liability,
      };
    }

    // 4) Goal tracking
    const goals = await prisma.goal.findMany({ where: { userId } });

    // 5) Investment summary
    const investments = await prisma.investment.findMany({ where: { userId } });
    const investmentSummary = {
      total: investments.reduce((a, i) => a + i.amount, 0),
      count: investments.length,
    };

    // 6) Future predictions (trend-based)
    const { start, end } = getMonthDateRange(monthKeyIST()); // current month
    const recentIncomes = await prisma.income.findMany({
      where: { userId, creditedAt: { gte: start, lte: end } },
    });
    const recentExpenses = await prisma.expense.findMany({
      where: { userId, spentAt: { gte: start, lte: end } },
    });

    const avgIncome =
      recentIncomes.reduce((a, i) => a + i.amount, 0) /
      (recentIncomes.length || 1);

    const avgExpense =
      recentExpenses.reduce((a, e) => a + e.amount, 0) /
      (recentExpenses.length || 1);

    const predictedSaving = avgIncome - avgExpense;

    res.json({
      kakeibo: unclassifiedExpenses,
      deviations,
      tax: taxSummary,
      goals,
      investmentSummary,
      futurePredictions: {
        avgIncome,
        avgExpense,
        predictedSaving,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch advanced dashboard",
      details: err.message,
    });
  }
};

module.exports = {
  getNormalDashboard,
  getAdvancedDashboard,
};

const prisma = require("../config/prismaClient");
const { monthKeyIST, getMonthDateRange } = require("../utils/datKeys");

const getUserId = (req) => req.user?.userId ?? req.user?.id;
const METHOD_TYPES = new Set(["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"]);

const normalizeType = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const isoWeekToDate = (year, week) => {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const isoWeekStart = simple;
  if (dow <= 4) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }
  return new Date(isoWeekStart.getUTCFullYear(), isoWeekStart.getUTCMonth(), isoWeekStart.getUTCDate());
};

const parseAnchorDate = (timeframe, anchor) => {
  if (!anchor) return new Date();
  if (timeframe === "monthly") {
    const [y, m] = anchor.split("-").map(Number);
    if (y && m) return new Date(y, m - 1, 1);
  }
  if (timeframe === "yearly") {
    const y = Number(anchor);
    if (y) return new Date(y, 0, 1);
  }
  if (timeframe === "weekly" && anchor.includes("W")) {
    const [yStr, wStr] = anchor.split("-W");
    const y = Number(yStr);
    const w = Number(wStr);
    if (y && w) return isoWeekToDate(y, w);
  }
  const d = new Date(anchor);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const getRangeForTimeframe = (timeframe, anchor) => {
  const base = parseAnchorDate(timeframe, anchor);
  const start = new Date(base);
  const end = new Date(base);

  if (timeframe === "daily") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: base.toDateString() };
  }

  if (timeframe === "weekly") {
    const day = start.getDay();
    const diff = (day + 6) % 7; // Monday start
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `Week of ${start.toDateString()}` };
  }

  if (timeframe === "yearly") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: String(start.getFullYear()) };
  }

  // monthly (default)
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  end.setMonth(start.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return {
    start,
    end,
    label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
      2,
      "0"
    )}`,
  };
};

async function getScenarioAccountIds(userId, accountId) {
  if (!accountId) return null;
  const all = await prisma.account.findMany({
    where: { userId, isActive: true },
    select: { id: true, parentId: true },
  });

  const byParent = new Map();
  all.forEach((a) => {
    const pid = a.parentId ?? 0;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(a.id);
  });

  const root = Number(accountId);
  const allowed = new Set();
  const queue = [root];

  while (queue.length) {
    const cur = queue.shift();
    if (allowed.has(cur)) continue;
    allowed.add(cur);
    const kids = byParent.get(cur) || [];
    kids.forEach((k) => queue.push(k));
  }

  return Array.from(allowed);
}

// -------------------- Normal Dashboard --------------------
const getNormalDashboard = async (req, res) => {
  try {
    const userId = getUserId(req);
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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const timeframe = req.query.timeframe || "monthly";
    const anchor = req.query.anchor || undefined;
    const accountId = req.query.accountId ? Number(req.query.accountId) : null;
    const methodTypeRaw = req.query.methodType;
    const methodType = methodTypeRaw ? normalizeType(methodTypeRaw) : null;
    if (methodType && !METHOD_TYPES.has(methodType)) {
      return res.status(400).json({ message: "Invalid methodType filter" });
    }
    const { start, end, label } = getRangeForTimeframe(timeframe, anchor);
    const scenarioAccountIds = await getScenarioAccountIds(userId, accountId);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const totalIncomeAgg = await prisma.income.aggregate({
      where: {
        userId,
        creditedAt: { gte: start, lte: end },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: { is: { type: methodType } } } : {}),
      },
      _sum: { amount: true },
    });
    const totalExpenseAgg = await prisma.expense.aggregate({
      where: {
        userId,
        spentAt: { gte: start, lte: end },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: { is: { type: methodType } } } : {}),
      },
      _sum: { amount: true },
    });
    const totalInvestmentAgg = await prisma.investment.aggregate({
      where: {
        userId,
        investedAt: { gte: start, lte: end },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: { is: { type: methodType } } } : {}),
      },
      _sum: { amount: true },
    });

    const totalIncome = Number(totalIncomeAgg._sum.amount ?? 0);
    const totalExpense = Number(totalExpenseAgg._sum.amount ?? 0);
    const totalInvestment = Number(totalInvestmentAgg._sum.amount ?? 0);

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [lastWeekRecord, lastMonthRecord] = await Promise.all([
      prisma.balance.findFirst({
        where: { userId, updatedAt: { lt: startOfWeek } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.balance.findFirst({
        where: { userId, updatedAt: { lt: startOfMonth } },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const balances = {
      current: Number(user?.balance ?? 0),
      lastWeek: Number(lastWeekRecord?.current ?? 0),
      lastMonth: Number(lastMonthRecord?.current ?? 0),
    };

    // 1) Kakeibo analysis: unexpected/unclassified spends
    const unclassifiedExpenses = await prisma.expense.findMany({
      where: {
        userId,
        OR: [{ tag: "" }],
      },
    });

    // 2) Deviation alerts (vs Monthly Limits)
    const monthKey = monthKeyIST(start);
    const [yearStr, monthStr] = monthKey.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);

    const expensesByCategory = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        month: monthKey,
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: { is: { type: methodType } } } : {}),
      },
      _sum: { amount: true },
    });

    const categoryIds = expensesByCategory
      .map((c) => c.categoryId)
      .filter((id) => id != null);

    const categories = categoryIds.length
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const limits = await prisma.limit.findMany({
      where: {
        userId,
        scope: "MONTHLY",
        month,
        year,
        OR: [{ categoryId: { in: categoryIds } }, { categoryId: null }],
      },
      orderBy: { id: "desc" },
    });

    const deviations = expensesByCategory
      .map((cat) => {
        const specific = limits.find((l) => l.categoryId === cat.categoryId);
        const fallback = limits.find((l) => l.categoryId === null);
        const limit = specific || fallback;
        if (!limit) return null;
        const spent = Number(cat._sum.amount ?? 0);
        const limitAmount = Number(limit.amount ?? 0);
        return {
          categoryId: cat.categoryId,
          category: categoryMap.get(cat.categoryId) || "Uncategorized",
          spent,
          limit: limitAmount,
          deviation: spent - limitAmount,
        };
      })
      .filter(Boolean);

    const expenseDifferenceByCategory = deviations.map((d) => ({
      categoryId: d.categoryId,
      category: d.category,
      difference: d.deviation,
      spent: d.spent,
      limit: d.limit,
    }));

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
    const investments = await prisma.investment.findMany({
      where: {
        userId,
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: { is: { type: methodType } } } : {}),
      },
    });
    const investmentSummary = {
      total: investments.reduce((a, i) => a + i.amount, 0),
      count: investments.length,
    };

    // 6) Future predictions (trend-based)
    const { start: monthStart, end: monthEnd } = getMonthDateRange(monthKey); // current month
    const recentIncomes = await prisma.income.findMany({
      where: {
        userId,
        creditedAt: { gte: monthStart, lte: monthEnd },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: { is: { type: methodType } } } : {}),
      },
    });
    const recentExpenses = await prisma.expense.findMany({
      where: {
        userId,
        spentAt: { gte: monthStart, lte: monthEnd },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: { is: { type: methodType } } } : {}),
      },
    });

    const avgIncome =
      recentIncomes.reduce((a, i) => a + i.amount, 0) /
      (recentIncomes.length || 1);

    const avgExpense =
      recentExpenses.reduce((a, e) => a + e.amount, 0) /
      (recentExpenses.length || 1);

    const predictedSaving = avgIncome - avgExpense;

    res.json({
      label,
      totalIncome,
      totalExpense,
      totalInvestment,
      balances,
      expenseDifferenceByCategory,
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
      accountFilter: scenarioAccountIds ? { rootAccountId: accountId, accountIds: scenarioAccountIds } : null,
      methodFilter: methodType || null,
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

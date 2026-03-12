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

const buildPeriodWhere = ({
  timeframe,
  start,
  end,
  monthField = "month",
  weekField = "week",
  dateField,
}) => {
  if (timeframe === "monthly") {
    return { [monthField]: monthKeyIST(start) };
  }

  if (timeframe === "yearly") {
    const yearPrefix = `${start.getFullYear()}-`;
    return { [monthField]: { startsWith: yearPrefix } };
  }

  if (timeframe === "weekly" || timeframe === "daily") {
    return { [dateField]: { gte: start, lte: end } };
  }

  return { [dateField]: { gte: start, lte: end } };
};

const addMonths = (date, offset) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + offset);
  return d;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const stddev = (values) => {
  if (!values.length) return 0;
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const variance =
    values.reduce((a, v) => a + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
};

const daysDiffInclusive = (start, end) => {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.floor((e - s) / 86400000) + 1);
};

async function buildSpendAnomalyInsights(
  userId,
  currentMonthKey,
  scenarioAccountIds,
  methodType
) {
  const [yearStr, monthStr] = currentMonthKey.split("-");
  const currentMonthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const baselineMonthKeys = [1, 2, 3].map((n) =>
    monthKeyIST(addMonths(currentMonthDate, -n))
  );

  const [currentByCategory, baselineByCategory] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        month: currentMonthKey,
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        month: { in: baselineMonthKeys },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const allCategoryIds = Array.from(
    new Set(
      [...currentByCategory, ...baselineByCategory]
        .map((r) => r.categoryId)
        .filter((v) => v != null)
    )
  );

  const categories = allCategoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: allCategoryIds } },
        select: { id: true, name: true },
      })
    : [];
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));

  const baselineMap = new Map();
  baselineByCategory.forEach((row) => {
    baselineMap.set(row.categoryId, Number(row._sum.amount || 0));
  });

  const anomalies = currentByCategory
    .map((row) => {
      const current = Number(row._sum.amount || 0);
      const baselineAvg =
        Number(baselineMap.get(row.categoryId) || 0) / baselineMonthKeys.length;
      const uplift = current - baselineAvg;
      const upliftPct = baselineAvg > 0 ? (uplift / baselineAvg) * 100 : null;
      const isNewCategorySpike = baselineAvg === 0 && current >= 1000;
      const isAnomaly =
        (baselineAvg > 0 && uplift > 0 && upliftPct >= 25) || isNewCategorySpike;
      if (!isAnomaly) return null;

      return {
        categoryId: row.categoryId,
        category: categoryNameMap.get(row.categoryId) || "Uncategorized",
        current,
        baselineAvg: Number(baselineAvg.toFixed(2)),
        uplift: Number(uplift.toFixed(2)),
        upliftPct: upliftPct == null ? null : Number(upliftPct.toFixed(1)),
        signal: upliftPct == null ? "new_spike" : upliftPct >= 60 ? "high" : "medium",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.uplift - a.uplift)
    .slice(0, 5);

  return {
    month: currentMonthKey,
    baselineMonths: baselineMonthKeys,
    topAnomalies: anomalies,
  };
}

async function buildIncomeStabilityInsights(
  userId,
  anchorDate,
  scenarioAccountIds,
  methodType
) {
  const monthKeys = Array.from({ length: 6 }, (_, idx) =>
    monthKeyIST(addMonths(anchorDate, -idx))
  ).reverse();

  const [monthlyIncomeRows, sourceRows] = await Promise.all([
    prisma.income.groupBy({
      by: ["month"],
      where: {
        userId,
        month: { in: monthKeys },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.income.groupBy({
      by: ["source"],
      where: {
        userId,
        month: { in: monthKeys },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const monthTotalsMap = new Map(
    monthlyIncomeRows.map((row) => [row.month, Number(row._sum.amount || 0)])
  );
  const monthlyTotals = monthKeys.map((m) => ({
    month: m,
    amount: Number(monthTotalsMap.get(m) || 0),
  }));

  const values = monthlyTotals.map((m) => m.amount);
  const mean = values.length ? values.reduce((a, v) => a + v, 0) / values.length : 0;
  const sigma = stddev(values);
  const cv = mean > 0 ? sigma / mean : 1;
  const stabilityScore = Math.round(clamp(100 - cv * 120, 0, 100));

  const totalBySource = sourceRows.map((r) => ({
    source: r.source || "Other",
    amount: Number(r._sum.amount || 0),
  }));
  const totalIncome = totalBySource.reduce((a, s) => a + s.amount, 0);
  totalBySource.sort((a, b) => b.amount - a.amount);
  const topSource = totalBySource[0] || null;
  const topSourceShare =
    topSource && totalIncome > 0 ? Number(((topSource.amount / totalIncome) * 100).toFixed(1)) : 0;

  return {
    monthWindow: monthKeys,
    monthlyTotals,
    average: Number(mean.toFixed(2)),
    stddev: Number(sigma.toFixed(2)),
    coefficientOfVariation: Number(cv.toFixed(3)),
    stabilityScore,
    topSource: topSource ? { ...topSource, sharePct: topSourceShare } : null,
  };
}

async function buildInvestmentHealthInsights(
  userId,
  anchorDate,
  scenarioAccountIds,
  methodType
) {
  const investments = await prisma.investment.findMany({
    where: {
      userId,
      ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
      ...(methodType ? { paymentMethod: methodType } : {}),
    },
    select: {
      instrument: true,
      amount: true,
      roi: true,
      month: true,
    },
  });

  const totalInvested = investments.reduce((a, i) => a + Number(i.amount || 0), 0);
  const byInstrument = new Map();
  investments.forEach((inv) => {
    const key = inv.instrument || "Unknown";
    byInstrument.set(key, (byInstrument.get(key) || 0) + Number(inv.amount || 0));
  });

  const instrumentAllocations = Array.from(byInstrument.entries())
    .map(([instrument, amount]) => ({
      instrument,
      amount: Number(amount.toFixed(2)),
      sharePct:
        totalInvested > 0 ? Number(((amount / totalInvested) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const hhi = instrumentAllocations.reduce((acc, item) => {
    const p = item.sharePct / 100;
    return acc + p * p;
  }, 0);
  const concentrationLevel = hhi >= 0.25 ? "high" : hhi >= 0.15 ? "medium" : "low";

  const monthKeys = Array.from({ length: 6 }, (_, idx) =>
    monthKeyIST(addMonths(anchorDate, -idx))
  ).reverse();
  const monthlyContributions = monthKeys.map((month) => {
    const rows = investments.filter((i) => i.month === month);
    const amount = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
    return {
      month,
      amount: Number(amount.toFixed(2)),
    };
  });

  return {
    totalInvested: Number(totalInvested.toFixed(2)),
    concentration: {
      hhi: Number(hhi.toFixed(3)),
      level: concentrationLevel,
      topHoldings: instrumentAllocations.slice(0, 3),
      topHoldingShare: instrumentAllocations[0]?.sharePct ?? 0,
    },
    monthlyContributions,
  };
}

async function buildRiskForecastInsights(
  userId,
  anchorDate,
  currentBalance,
  scenarioAccountIds,
  methodType
) {
  const monthKey = monthKeyIST(anchorDate);
  const { start: monthStart, end: monthEnd } = getMonthDateRange(monthKey);
  const now = new Date();

  const isPastMonth = monthEnd < now;
  const isCurrentMonth =
    now.getFullYear() === monthStart.getFullYear() &&
    now.getMonth() === monthStart.getMonth();
  const asOfDate = isPastMonth ? monthEnd : isCurrentMonth ? now : monthStart;

  const elapsedDays = daysDiffInclusive(monthStart, asOfDate);
  const totalDays = daysDiffInclusive(monthStart, monthEnd);
  const progress = clamp(elapsedDays / totalDays, 0, 1);

  const [incomeAgg, expenseAgg, limitRows, recentIncomeAgg, recentExpenseAgg] =
    await Promise.all([
      prisma.income.aggregate({
        where: {
          userId,
          month: monthKey,
          ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
          ...(methodType ? { paymentMethod: methodType } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          spentAt: { gte: monthStart, lte: asOfDate },
          ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
          ...(methodType ? { paymentMethod: methodType } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.limit.findMany({
        where: {
          userId,
          scope: "MONTHLY",
          OR: [
            { month: Number(monthKey.split("-")[1]), year: Number(monthKey.split("-")[0]) },
            { month: null, year: null },
          ],
        },
        select: { amount: true },
      }),
      prisma.income.aggregate({
        where: {
          userId,
          creditedAt: { gte: addMonths(now, -1), lte: now },
          ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
          ...(methodType ? { paymentMethod: methodType } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          spentAt: { gte: addMonths(now, -1), lte: now },
          ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
          ...(methodType ? { paymentMethod: methodType } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

  const actualIncome = Number(incomeAgg._sum.amount || 0);
  const actualExpense = Number(expenseAgg._sum.amount || 0);

  // Income is reported by the app's derived month bucket (for example, late salary
  // credits can belong to the next reporting month), so forecasting should use the
  // full assigned month income rather than date-range pacing.
  const projectedIncome = Number(actualIncome.toFixed(2));
  const projectedExpense =
    progress > 0 ? Number((actualExpense / progress).toFixed(2)) : actualExpense;
  const projectedSaving = Number((projectedIncome - projectedExpense).toFixed(2));

  const monthlyLimitTotal = Number(
    limitRows.reduce((a, l) => a + Number(l.amount || 0), 0).toFixed(2)
  );

  const expenseOverrunRisk =
    monthlyLimitTotal > 0 && projectedExpense > monthlyLimitTotal;
  const incomeShortfallRisk = projectedIncome < projectedExpense;

  const recentIncome = Number(recentIncomeAgg._sum.amount || 0);
  const recentExpense = Number(recentExpenseAgg._sum.amount || 0);
  const dailyBurn = Math.max((recentExpense - recentIncome) / 30, 0);
  const runwayDays =
    dailyBurn > 0 ? Number((Number(currentBalance || 0) / dailyBurn).toFixed(1)) : null;

  const confidence = isPastMonth ? "high" : progress >= 0.6 ? "high" : progress >= 0.3 ? "medium" : "low";

  return {
    month: monthKey,
    progress: Number(progress.toFixed(3)),
    confidence,
    actualToDate: {
      income: actualIncome,
      expense: actualExpense,
    },
    monthEndProjection: {
      income: projectedIncome,
      expense: projectedExpense,
      saving: projectedSaving,
    },
    riskSignals: {
      expenseOverrunRisk,
      incomeShortfallRisk,
      monthlyLimitTotal,
    },
    savingsRunway: {
      currentBalance: Number(currentBalance || 0),
      dailyBurn: Number(dailyBurn.toFixed(2)),
      runwayDays,
    },
  };
}

async function getScenarioAccountIds(userId, accountId) {
  if (!accountId) return null;
  const root = Number(accountId);
  const account = await prisma.account.findFirst({
    where: { id: root, userId, isActive: true },
    select: { id: true },
  });
  return account ? [account.id] : [];
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
    const categoryWiseRaw = await prisma.expense.groupBy({
      by: ["categoryId", "month"],
      where: { userId },
      _sum: { amount: true },
    });
    const categoryIds = categoryWiseRaw.map((row) => row.categoryId);
    const categories = categoryIds.length
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const categoryWise = categoryWiseRaw.map((row) => ({
      categoryId: row.categoryId,
      category: categoryMap.get(row.categoryId) || "Uncategorized",
      month: row.month,
      _sum: row._sum,
    }));

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
        ...buildPeriodWhere({
          timeframe,
          start,
          end,
          monthField: "month",
          dateField: "creditedAt",
        }),
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
      _sum: { amount: true },
    });
    const totalExpenseAgg = await prisma.expense.aggregate({
      where: {
        userId,
        ...buildPeriodWhere({
          timeframe,
          start,
          end,
          monthField: "month",
          weekField: "week",
          dateField: "spentAt",
        }),
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
      _sum: { amount: true },
    });
    const totalInvestmentAgg = await prisma.investment.aggregate({
      where: {
        userId,
        ...buildPeriodWhere({
          timeframe,
          start,
          end,
          monthField: "month",
          weekField: "week",
          dateField: "investedAt",
        }),
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
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
        category: {
          OR: [{ kakeibo: null }, { kakeibo: "" }],
        },
      },
      include: { category: true },
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
        ...(methodType ? { paymentMethod: methodType } : {}),
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
        OR: [
          { month, year, categoryId: { in: categoryIds } },
          { month, year, categoryId: null },
          { month: null, year: null, categoryId: { in: categoryIds } },
          { month: null, year: null, categoryId: null },
        ],
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
        ...(methodType ? { paymentMethod: methodType } : {}),
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
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
    });
    const recentExpenses = await prisma.expense.findMany({
      where: {
        userId,
        spentAt: { gte: monthStart, lte: monthEnd },
        ...(scenarioAccountIds ? { accountId: { in: scenarioAccountIds } } : {}),
        ...(methodType ? { paymentMethod: methodType } : {}),
      },
    });

    const avgIncome =
      recentIncomes.reduce((a, i) => a + i.amount, 0) /
      (recentIncomes.length || 1);

    const avgExpense =
      recentExpenses.reduce((a, e) => a + e.amount, 0) /
      (recentExpenses.length || 1);

    const predictedSaving = avgIncome - avgExpense;

    const insightsAnchor = parseAnchorDate(timeframe, anchor);
    const spendAnomalies = await buildSpendAnomalyInsights(
      userId,
      monthKey,
      scenarioAccountIds,
      methodType
    );
    const incomeStability = await buildIncomeStabilityInsights(
      userId,
      insightsAnchor,
      scenarioAccountIds,
      methodType
    );
    const investmentHealth = await buildInvestmentHealthInsights(
      userId,
      insightsAnchor,
      scenarioAccountIds,
      methodType
    );
    const riskForecast = await buildRiskForecastInsights(
      userId,
      insightsAnchor,
      balances.current,
      scenarioAccountIds,
      methodType
    );

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
      insights: {
        spendAnomalies,
        incomeStability,
        investmentHealth,
        riskForecast,
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

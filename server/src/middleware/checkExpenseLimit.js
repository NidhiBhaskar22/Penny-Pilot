const prisma = require("../config/prismaClient");
const { monthKeyIST, getWeekOfMonth } = require("../utils/datKeys");

async function checkExpenseLimit(req, res, next) {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!req.body) return next();
    if (req.method !== "POST") return next();
    const { amount, spentAt, categoryId } = req.body;
    if (amount == null || !spentAt || !categoryId) return next();

    const parsedAmount = Number(amount);
    const parsedCategoryId = Number(categoryId);
    if (Number.isNaN(parsedAmount) || Number.isNaN(parsedCategoryId)) {
      return res.status(400).json({ message: "Invalid amount/categoryId" });
    }

    const expenseDate = new Date(spentAt);
    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({ message: "Invalid spentAt date" });
    }

    const monthKey = monthKeyIST(expenseDate); // YYYY-MM
    const [yearStr, monthStr] = monthKey.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const week = getWeekOfMonth(expenseDate);
    const day = new Date(expenseDate.toISOString().split("T")[0]);

    const limits = await prisma.limit.findMany({
      where: {
        userId,
        AND: [
          { OR: [{ categoryId: parsedCategoryId }, { categoryId: null }] },
          {
            OR: [
              { scope: "MONTHLY", month, year },
              { scope: "MONTHLY", month: null, year: null },
              { scope: "WEEKLY", week, year },
              { scope: "DAILY", day },
            ],
          },
        ],
      },
      orderBy: { id: "desc" },
    });

    const byScope = {
      DAILY: { specific: null, fallback: null },
      WEEKLY: { specific: null, fallback: null },
      MONTHLY: { specific: null, fallback: null },
    };

    for (const limit of limits) {
      const scope = limit.scope;
      if (!byScope[scope]) continue;
      if (limit.categoryId === parsedCategoryId) {
        if (!byScope[scope].specific) byScope[scope].specific = limit;
      } else if (!byScope[scope].fallback) {
        byScope[scope].fallback = limit;
      }
    }

    const dailyLimit = byScope.DAILY.specific || byScope.DAILY.fallback;
    const weeklyLimit = byScope.WEEKLY.specific || byScope.WEEKLY.fallback;
    const monthlyLimit = byScope.MONTHLY.specific || byScope.MONTHLY.fallback;

    const startOfDay = new Date(expenseDate.toISOString().split("T")[0]);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [dailySpent, weeklySpent, monthlySpent] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          userId,
          categoryId: parsedCategoryId,
          spentAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          categoryId: parsedCategoryId,
          month: monthKey,
          week,
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, categoryId: parsedCategoryId, month: monthKey },
        _sum: { amount: true },
      }),
    ]);

    let delta = parsedAmount;
    if (req.method === "PUT" && req.params?.id) {
      const existing = await prisma.expense.findFirst({
        where: { id: Number(req.params.id), userId },
        select: { amount: true },
      });
      if (!existing) return next();
      delta = parsedAmount - Number(existing.amount);
    }

    const shouldCheck = delta > 0;

    const exceedsDaily =
      shouldCheck &&
      dailyLimit &&
      Number(dailySpent._sum.amount ?? 0) + delta >
        Number(dailyLimit.amount);
    const exceedsWeekly =
      shouldCheck &&
      weeklyLimit &&
      Number(weeklySpent._sum.amount ?? 0) + delta >
        Number(weeklyLimit.amount);
    const exceedsMonthly =
      shouldCheck &&
      monthlyLimit &&
      Number(monthlySpent._sum.amount ?? 0) + delta >
        Number(monthlyLimit.amount);

    if (exceedsDaily || exceedsWeekly || exceedsMonthly) {
      return res.status(400).json({
        alert: true,
        message: [
          exceedsDaily ? "Daily limit exceeded!" : null,
          exceedsWeekly ? "Weekly limit exceeded!" : null,
          exceedsMonthly ? "Monthly limit exceeded!" : null,
        ].filter(Boolean),
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking expense limits", error });
    console.log("Check expense limit error:", error);
  }
}

module.exports = checkExpenseLimit;

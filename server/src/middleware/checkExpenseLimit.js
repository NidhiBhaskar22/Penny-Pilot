const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkExpenseLimit(req, res, next) {
    try {
        const userId = req.user.userId;
        const { amount, tag, spentAt } = req.body;
        const expenseDate = spentAt ? new Date(spentAt) : new Date();

        const effectiveMonth = expenseDateDate.toLocaleString("en-US", { month: "2-digit", year: "numeric" });
        const effectiveWeek = Math.ceil(expenseDate.getDate() / 7);

        // Fetch relevant limits
        const limits = await prisma.limits.findMany({
            where: {
                userId,
                OR: [
                    { category: tag },
                    { category: null }
                ],
                effectiveMonth,
            },
            orderBy: { id: 'desc' },

        });

        let dailylimit, weeklyLimit, monthlyLimit;
        limits.forEach(limit => {
            if (limit.category === tag) {
                // Category-specific limits take precedence
                if (limit.dailyLimit) dailylimit = limit.dailyLimit;
                if (limit.weeklyLimit) weeklyLimit = limit.weeklyLimit;
                if (limit.monthlyLimit) monthlyLimit = limit.monthlyLimit;
            }
        });

        const todayStr = expenseDate.toISOString().slice(0, 10);
        const [dailySpent, weeklySpent, monthlySpent] = await Promise.all([
      prisma.expense.aggregate({
        where: { userId, tag, spentAt: { gte: new Date(todayStr), lt: new Date(expenseDate.getTime() + 86400000) } },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { userId, tag, month: effectiveMonth, week: weekOfMonth },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { userId, tag, month: effectiveMonth },
        _sum: { amount: true }
      }),
    ]);

        
        const exceedsDaily = dailyLimit && ((dailySpent._sum.amount ?? 0) + amount > dailyLimit);
    const exceedsWeekly = weeklyLimit && ((weeklySpent._sum.amount ?? 0) + amount > weeklyLimit);
    const exceedsMonthly = monthlyLimit && ((monthlySpent._sum.amount ?? 0) + amount > monthlyLimit);

    // If any limit exceeded, send an alert response (frontend can customize UX)
    if (exceedsDaily || exceedsWeekly || exceedsMonthly) {
      return res.status(400).json({
        alert: true,
        message: [
          exceedsDaily ? "Daily limit exceeded!" : null,
          exceedsWeekly ? "Weekly limit exceeded!" : null,
          exceedsMonthly ? "Monthly limit exceeded!" : null,
        ].filter(Boolean)
      });
    }

    // Otherwise, allow to proceed
    next();
    } catch (error) {
        res.status(500).json({ message: "Error checking expense limits", error });
        console.log("Check expense limit error:", error);
    }
}

module.exports = checkExpenseLimit;
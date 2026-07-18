const prisma = require("../config/prismaClient");
const { asyncHandler, ApiError } = require("../middleware/errorMiddleware");

// Get current balance for the user
const getCurrentBalance = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const balance = await prisma.balance.findFirst({
    where: { userId },
    orderBy: { id: "desc" }, // latest record
  });
  res.json(balance);
});

// Get last month balance
const getLastMonthBalance = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const months = await prisma.balance.findMany({
    where: { userId },
    distinct: ["month"],
    orderBy: { month: "desc" },
    take: 2,
    select: { month: true },
  });

  if (months.length < 2) {
    return res.json(null);
  }

  const balance = await prisma.balance.findFirst({
    where: { userId, month: months[1].month },
    orderBy: { id: "desc" },
  });
  res.json(balance);
});

// Get last week balance
const getLastWeekBalance = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  // Get balance filtered by week field
  const balance = await prisma.balance.findFirst({
    where: { userId, week: { not: null } },
    orderBy: { id: "desc" }, // latest week record
  });
  res.json(balance);
});

// (Optional) Manual update balance
const updateBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { current, lastMonth, lastWeek, month, week } = req.body;
  const userId = req.user.userId;

  const balance = await prisma.balance.updateMany({
    where: { id: Number(id), userId },
    data: { current, lastMonth, lastWeek, month, week },
  });

  if (balance.count === 0) {
    throw new ApiError(404, "Balance not found");
  }
  res.json({ message: "Balance updated" });
});

module.exports = {
  getCurrentBalance,
  getLastMonthBalance,
  getLastWeekBalance,
  updateBalance,
};

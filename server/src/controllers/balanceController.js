const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get current balance for the user
async function getCurrentBalance(req, res) {
  try {
    const userId = req.user.userId;
    const balance = await prisma.balance.findFirst({
      where: { userId },
      orderBy: { id: "desc" }, // latest record
    });
    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch current balance", error });
  }
}

// Get last month balance
async function getLastMonthBalance(req, res) {
  try {
    const userId = req.user.userId;
    // Assuming balances are stored monthly with month field
    const balance = await prisma.balance.findFirst({
      where: { userId },
      orderBy: { month: "desc" },
      skip: 1, // skip latest month to get previous
    });
    res.json(balance);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch last month balance", error });
  }
}

// Get last week balance
async function getLastWeekBalance(req, res) {
  try {
    const userId = req.user.userId;
    // Get balance filtered by week field
    const balance = await prisma.balance.findFirst({
      where: { userId, week: { not: null } },
      orderBy: { id: "desc" }, // latest week record
    });
    res.json(balance);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch last week balance", error });
  }
}

// (Optional) Manual update balance
async function updateBalance(req, res) {
  try {
    const { id } = req.params;
    const { current, lastMonth, lastWeek, month, week } = req.body;
    const userId = req.user.userId;

    const balance = await prisma.balance.updateMany({
      where: { id: Number(id), userId },
      data: { current, lastMonth, lastWeek, month, week },
    });

    if (balance.count === 0) {
      return res.status(404).json({ message: "Balance not found" });
    }
    res.json({ message: "Balance updated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update balance", error });
  }
}

module.exports = {
  getCurrentBalance,
  getLastMonthBalance,
  getLastWeekBalance,
  updateBalance,
};

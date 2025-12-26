// utils/balanceUtils.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { monthKeyIST, getWeekOfMonth } = require("./datKeys");

/**
 * Adjust a user's real-time balance (User.balance).
 * @param {number} userId
 * @param {number} delta
 */
const adjustUserBalance = async (userId, delta) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { balance: { increment: delta } },
  });
};

/**
 * Update or create a Balance snapshot for the given user.
 * Stores current, lastWeek, lastMonth with unified month/week keys.
 * @param {number} userId
 * @param {number} delta
 */
const updateBalance = async (userId, delta) => {
  const now = new Date();
  const month = monthKeyIST(now); // e.g., "Sep-2025"
  const week = getWeekOfMonth(now);

  let balanceRecord = await prisma.balance.findFirst({
    where: { userId, month, week },
    orderBy: { updatedAt: "desc" },
  });

  if (balanceRecord) {
    balanceRecord = await prisma.balance.update({
      where: { id: balanceRecord.id },
      data: {
        current: { increment: delta },
        updatedAt: new Date(),
      },
    });
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    balanceRecord = await prisma.balance.create({
      data: {
        userId,
        current: user?.balance || 0,
        lastWeek: 0,
        lastMonth: 0,
        month,
        week,
      },
    });
  }

  return balanceRecord;
};

/**
 * Convenience helper: adjusts both User.balance and Balance snapshot.
 * @param {number} userId
 * @param {number} delta
 */
const applyBalanceChange = async (userId, delta) => {
  await adjustUserBalance(userId, delta);
  return await updateBalance(userId, delta);
};

module.exports = {
  adjustUserBalance,
  updateBalance,
  applyBalanceChange,
};

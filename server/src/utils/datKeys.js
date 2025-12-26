// utils/dateUtils.js

// Format as "Sep-2025"
const monthKeyIST = (date = new Date()) => {
  const options = { timeZone: "Asia/Kolkata", month: "short", year: "numeric" };
  const parts = date.toLocaleDateString("en-US", options).split(" ");
  return `${parts[0]}-${parts[1]}`;
};

// Week of month (1–5) in IST
const getWeekOfMonth = (date = new Date()) => {
  const tzDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const day = tzDate.getDate();
  return Math.ceil(day / 7);
};

// Get start and end of a month in IST (for dashboard queries, etc.)
const getMonthDateRange = (monthKey) => {
  const [monthStr, yearStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = new Date(`${monthStr} 1, ${year}`).getMonth();

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

  return { start, end };
};

module.exports = { monthKeyIST, getWeekOfMonth, getMonthDateRange };

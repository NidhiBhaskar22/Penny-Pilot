// utils/dateUtils.js

// Format as "YYYY-MM" in IST
const monthKeyIST = (date = new Date()) => {
  const tzDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const y = tzDate.getFullYear();
  const m = String(tzDate.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

// Week of month (1–5) in IST
const getWeekOfMonth = (date = new Date()) => {
  const tzDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const day = tzDate.getDate();
  return Math.ceil(day / 7);
};

// Get start/end (UTC) for a "YYYY-MM" month
const getMonthDateRange = (monthKey = monthKeyIST()) => {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month || month < 1 || month > 12) {
    return { start: null, end: null };
  }

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  return { start, end };
};

module.exports = { monthKeyIST, getWeekOfMonth, getMonthDateRange };

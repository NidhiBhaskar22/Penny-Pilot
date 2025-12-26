// src/utils/monthKey.js
export function monthKeyIST(dateLike) {
  const d = new Date(dateLike);
  const m = d.toLocaleString("en-US", {
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  const y = d.toLocaleString("en-US", {
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return `${m}-${y}`; // e.g., "Sep-2025"
}

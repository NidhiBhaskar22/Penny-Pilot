// src/utils/currency.jsx
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrFormatterWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value, { decimals = true } = {}) {
  const amount = Number(value || 0);
  return decimals ? inrFormatter.format(amount) : inrFormatterWhole.format(amount);
}

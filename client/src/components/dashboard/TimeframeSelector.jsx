import React from "react";

export default function TimeframeSelector({ timeframe, setTimeframe, className = "" }) {
  return (
    <select
      value={timeframe}
      onChange={(e) => setTimeframe(e.target.value)}
      className={`app-filter-control-select h-10 rounded-lg border-[#4f87df]/45 bg-[rgb(var(--pp-panel-rgb)/0.88)] ${className}`}
    >
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </select>
  );
}


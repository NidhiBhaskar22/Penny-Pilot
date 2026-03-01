import React from "react";

export default function TimeframeSelector({ timeframe, setTimeframe, className = "" }) {
  return (
    <select
      value={timeframe}
      onChange={(e) => setTimeframe(e.target.value)}
      className={`h-10 rounded-lg border border-[#4f87df]/45 bg-[rgba(4,12,46,0.88)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none ${className}`}
    >
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </select>
  );
}

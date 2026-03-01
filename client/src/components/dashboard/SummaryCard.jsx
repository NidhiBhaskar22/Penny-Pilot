import React from "react";

const SummaryCard = ({ title, amount, color = "text-mist" }) => {
  return (
    <div className="w-full max-w-[300px] rounded-md border border-teal bg-brand-900 p-6 text-center shadow-sm">
      <div className={`text-base font-semibold ${color}`}>{title}</div>
      <div className="text-2xl font-bold text-mist">{amount.toLocaleString()}</div>
    </div>
  );
};

export default SummaryCard;

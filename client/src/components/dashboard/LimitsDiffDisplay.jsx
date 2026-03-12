import React from "react";

const LimitsDiffDisplayByCategory = ({ differences = [] }) => {
  const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");

  return (
    <div className="max-w-[480px] rounded-md border border-[#4f87df]/40 bg-[rgba(8,20,66,0.78)] p-4 text-mist">
      <div className="mb-3 text-lg font-extrabold text-mist">
        Difference from Limits by Category
      </div>

      <div className="space-y-3">
        {differences.length === 0 ? (
          <div className="text-mist/70">No category differences to display.</div>
        ) : (
          differences.map(({ category, difference, spent, limit, categoryId }) => (
            <div
              key={categoryId ?? category ?? "Uncategorized"}
              className="border-b border-[#4f87df]/30 pb-3"
            >
              <div className="mb-1 font-semibold text-mist/80">
                {category || "Uncategorized"}
              </div>
              <div className="text-mist/70">
                Spent: {fmt(spent)} | Limit: {fmt(limit)}
              </div>
              <div className={(difference ?? 0) > 0 ? "text-rose-300" : "text-cyan-200"}>
                Delta: {fmt(difference)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LimitsDiffDisplayByCategory;

import React from "react";
import { Edit2, Trash2 } from "lucide-react";

export default function IncomeList({ incomes, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)]">
      {(!incomes || incomes.length === 0) && (
        <div className="p-4 text-mist">No incomes added yet.</div>
      )}

      {incomes?.map((inc) => (
        <div
          key={inc.id || inc._id}
          className="flex items-center justify-between border-b border-[#4f87df]/30 px-4 py-4 text-mist"
        >
          <div>
            <div className="font-semibold">{inc.source || "Income"}</div>
            <div className="text-sm text-mist/70">
              Amount: INR {Number(inc.amount || 0).toLocaleString("en-IN")}
            </div>
            <div className="text-sm text-mist/70">
              Date:{" "}
              {inc.creditedAt
                ? new Date(inc.creditedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-"}
            </div>
            <div className="text-sm text-mist/70">
              Account: {inc.account?.name || "-"} | Method: {inc.paymentMethod?.type || "-"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-md p-2 text-mist"
              onClick={() => onEdit(inc)}
              aria-label="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              className="rounded-md bg-red-600/20 p-2 text-red-200"
              onClick={() => onDelete(inc.id || inc._id)}
              aria-label="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


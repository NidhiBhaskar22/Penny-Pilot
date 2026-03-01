import React from "react";
import { Edit2, Trash2 } from "lucide-react";

function fmtDate(inv) {
  const raw = inv?.investedAt ?? inv?.date ?? inv?.createdAt;
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InvestmentList({ investments, onEdit, onDelete }) {
  if (!investments || investments.length === 0) {
    return <div className="p-4 text-mist">No investments yet.</div>;
  }

  return (
    <div className="rounded-xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)]">
      {investments.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between border-b border-[#4f87df]/30 px-4 py-4 text-mist"
        >
          <div>
            <div className="font-semibold">{inv.instrument || inv.name || "Investment"}</div>
            <div className="text-sm text-mist/70">
              Amount: INR {Number(inv.amount || 0).toLocaleString("en-IN")}
            </div>
            <div className="text-sm text-mist/70">Date: {fmtDate(inv)}</div>
            <div className="text-sm text-mist/70">
              Account: {inv.account?.name || "-"} | Method: {inv.paymentMethod?.type || "-"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-md p-2 text-mist"
              onClick={() => onEdit(inv)}
              aria-label="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              className="rounded-md bg-red-600/20 p-2 text-red-200"
              onClick={() => onDelete(inv.id)}
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


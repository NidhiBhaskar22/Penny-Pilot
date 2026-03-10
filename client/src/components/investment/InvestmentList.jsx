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
    <div className="overflow-hidden rounded-lg border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)]">
      <table className="w-full text-left text-sm text-mist">
        <thead className="bg-[rgba(7,18,62,0.95)] uppercase tracking-wider text-xs text-mist">
          <tr>
            <th className="px-4 py-3"> </th>
            <th className="px-4 py-3">Details</th>
            <th className="px-4 py-3">Resource</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {investments.map((inv, index) => (
            <tr
              key={inv.id}
              className={index % 2 === 0 ? "bg-[rgba(7,18,62,0.78)]" : "bg-[rgba(10,25,78,0.78)]"}
            >
              <td className="px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-brand-900 font-semibold">
                  {String(inv.instrument || inv.name || "I")[0].toUpperCase()}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="text-xs text-peach">{fmtDate(inv)}</div>
                <div className="font-semibold text-mist">{inv.instrument || inv.name || "Investment"}</div>
              </td>
              <td className="px-4 py-4 font-semibold text-mist">{inv.details || "-"}</td>
              <td className="px-4 py-4 font-semibold text-mist">
                INR {Number(inv.amount || 0).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-4 font-semibold text-mist">
                {inv.account?.name || "-"}
                <div className="text-xs font-normal text-mist/70">
                  {inv.paymentMethod?.type || inv.paymentMethod || "-"}
                </div>
              </td>
              <td className="px-4 py-4 font-semibold text-peach">{inv.month || "-"}</td>
              <td className="px-4 py-4 text-right">
                <button
                  className="inline-flex items-center justify-center rounded-md p-2 text-mist"
                  onClick={() => onEdit(inv)}
                  aria-label="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="ml-2 inline-flex items-center justify-center rounded-md bg-red-600/20 p-2 text-red-200"
                  onClick={() => onDelete(inv.id)}
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

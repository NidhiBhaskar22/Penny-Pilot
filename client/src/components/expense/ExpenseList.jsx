import React from "react";
import { Edit2, Trash2 } from "lucide-react";

// robust date pick + format (spentAt | date | createdAt)
function fmtDate(exp) {
  const raw = exp?.spentAt ?? exp?.date ?? exp?.createdAt;
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  if (!expenses || expenses.length === 0) {
    return <div className="p-4 text-mist">No expenses added yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)]">
      <table className="w-full text-left text-sm text-mist">
        <thead className="bg-[rgba(7,18,62,0.95)] uppercase tracking-wider text-xs text-mist">
          <tr>
            <th className="px-4 py-3"> </th>
            <th className="px-4 py-3">Details</th>
            <th className="px-4 py-3">Paid To</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp, index) => (
            <tr
              key={exp.id}
              className={index % 2 === 0 ? "bg-[rgba(7,18,62,0.78)]" : "bg-[rgba(10,25,78,0.78)]"}
            >
              <td className="px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-brand-900 font-semibold">
                  {String(exp.category?.name || exp.tag || "E")[0].toUpperCase()}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="text-xs text-peach">{fmtDate(exp)}</div>
                <div className="font-semibold text-mist">
                  {exp.category?.name || exp.tag || "Expense"}
                </div>
                {exp.tag ? (
                  <span className="mt-2 inline-block rounded bg-peach px-2 py-0.5 text-[10px] font-semibold text-brand-900">
                    {exp.tag}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <div className="font-semibold text-mist">{exp.paidTo || "-"}</div>
                {exp.category?.name ? (
                  <div className="text-xs text-peach">
                    Category: {exp.category.name}
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-4 font-semibold text-mist">
                INR {Number(exp.amount || 0).toLocaleString("en-IN")}
              </td>
              <td className="px-4 py-4 font-semibold text-mist">
                {exp.account?.name || "-"}
                <div className="text-xs font-normal text-mist/70">
                  {exp.paymentMethod?.type || "-"}
                </div>
              </td>
              <td className="px-4 py-4 font-semibold text-peach">
                {exp.month || "-"}
              </td>
              <td className="px-4 py-4 text-right">
                <button
                  onClick={() => onEdit(exp)}
                  className="inline-flex items-center justify-center rounded-md p-2 text-mist"
                  aria-label="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(exp.id)}
                  className="ml-2 inline-flex items-center justify-center rounded-md bg-red-600/20 p-2 text-red-200"
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


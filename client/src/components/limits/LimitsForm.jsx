import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const LimitsForm = ({ isOpen, onClose, limits }) => {
  const [scope, setScope] = useState("MONTHLY");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [week, setWeek] = useState("");
  const [day, setDay] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (limits) {
      setScope(limits.scope || "MONTHLY");
      setAmount(limits.amount ?? "");
      setMonth(limits.month ?? "");
      setYear(limits.year ?? "");
      setWeek(limits.week ?? "");
      setDay(limits.day ? limits.day.slice(0, 10) : "");
      setCategoryId(limits.categoryId ?? "");
    } else {
      setScope("MONTHLY");
      setAmount("");
      setMonth("");
      setYear("");
      setWeek("");
      setDay("");
      setCategoryId("");
    }
  }, [limits]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    try {
      const data = {
        scope,
        amount: Number(amount),
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        week: week ? Number(week) : undefined,
        day: day || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      };
      if (limits) {
        await axiosClient.put(`/limits/${limits.id}`, data);
      } else {
        await axiosClient.post("/limits", data);
      }
      onClose();
    } catch (error) {
      setNotice(error?.response?.data?.message || error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-teal bg-brand-900 p-6 text-mist shadow-xl">
        <div className="mb-4 text-lg font-semibold">
          {limits ? "Edit Limits" : "Set Limits"}
        </div>
        {notice ? (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {notice}
          </div>
        ) : null}
        <form id="limits-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="DAILY">Daily</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Amount (INR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
            />
          </div>
          {scope === "MONTHLY" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Month (1-12)</label>
                <input
                  type="number"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  min={1}
                  max={12}
                  placeholder="e.g. 1"
                  className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={2000}
                  max={2100}
                  placeholder="e.g. 2026"
                  className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
                />
              </div>
            </>
          )}

          {scope === "WEEKLY" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">Week (1-5)</label>
                <input
                  type="number"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  min={1}
                  max={5}
                  placeholder="Week number"
                  className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min={2000}
                  max={2100}
                  placeholder="e.g. 2026"
                  className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
                />
              </div>
            </>
          )}

          {scope === "DAILY" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Day</label>
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Category ID (optional)
            </label>
            <input
              type="number"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              min={1}
              placeholder="e.g. 3"
              className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
            />
          </div>
        </form>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mist"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="limits-form"
            className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-mist"
          >
            {limits ? "Update" : "Set"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LimitsForm;


import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const LimitsForm = ({ isOpen, onClose, limits }) => {
  const [scope, setScope] = useState("MONTHLY");
  const [amount, setAmount] = useState("");
  const [monthMode, setMonthMode] = useState("CURRENT");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [week, setWeek] = useState("");
  const [day, setDay] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [notice, setNotice] = useState("");
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  const optionStyle = { backgroundColor: "#0e2a4a", color: "#e8f3ff" };
  const selectedMonthLabel =
    monthOptions.find((m) => Number(month) === m.value)?.label || "Choose month";

  useEffect(() => {
    if (limits) {
      setScope(limits.scope || "MONTHLY");
      setAmount(limits.amount ?? "");
      setMonth(limits.month ?? "");
      setYear(limits.year ?? "");
      setWeek(limits.week ?? "");
      setDay(limits.day ? limits.day.slice(0, 10) : "");
      setCategoryId(limits.categoryId ?? "");
      setShowMonthPicker(false);
      if ((limits.scope || "MONTHLY") === "MONTHLY") {
        if (limits.month == null && limits.year == null) {
          setMonthMode("ALL");
        } else if (Number(limits.month) === currentMonth && Number(limits.year) === currentYear) {
          setMonthMode("CURRENT");
        } else {
          setMonthMode("SELECT");
        }
      }
    } else {
      setScope("MONTHLY");
      setAmount("");
      setMonth(String(currentMonth));
      setYear(String(currentYear));
      setMonthMode("CURRENT");
      setWeek("");
      setDay("");
      setCategoryId("");
      setShowMonthPicker(false);
    }
  }, [limits]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const res = await axiosClient.get("/categories", {
          params: { type: "EXPENSE", sortBy: "name", order: "asc" },
        });
        const rows = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setCategories(rows);
      } catch (error) {
        if (!cancelled) setCategories([]);
      }
    };
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    try {
      if (!categoryId) {
        setNotice("Category is required");
        return;
      }
      let resolvedMonth = month ? Number(month) : undefined;
      let resolvedYear = year ? Number(year) : undefined;
      if (scope === "MONTHLY") {
        if (monthMode === "CURRENT") {
          resolvedMonth = currentMonth;
          resolvedYear = currentYear;
        } else if (monthMode === "ALL") {
          resolvedMonth = null;
          resolvedYear = null;
        } else {
          resolvedMonth = month ? Number(month) : undefined;
          resolvedYear = currentYear;
        }
      }

      const data = {
        scope,
        amount: Number(amount),
        month: resolvedMonth,
        year: resolvedYear,
        week: week ? Number(week) : undefined,
        day: day || undefined,
        categoryId: Number(categoryId),
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

  const createCategory = async () => {
    const name = String(newCategoryName || "").trim();
    if (!name) {
      setNotice("Enter category name");
      return;
    }
    setCreatingCategory(true);
    setNotice("");
    try {
      const res = await axiosClient.post("/categories", { name, type: "EXPENSE" });
      const created = res.data;
      const createdId = String(created?.id || "");
      if (!createdId) throw new Error("Invalid category response");
      setCategories((prev) => {
        const exists = prev.some((c) => String(c.id) === createdId);
        if (exists) return prev;
        return [...prev, created].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      });
      setCategoryId(createdId);
      setNewCategoryName("");
      setShowCategoryModal(false);
    } catch (error) {
      setNotice(error?.response?.data?.message || "Failed to create category");
    } finally {
      setCreatingCategory(false);
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
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "__add_new__") {
                  setShowCategoryModal(true);
                  return;
                }
                setCategoryId(next);
              }}
              className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
            >
              <option style={optionStyle} value="">Select category</option>
              {categories.map((c) => (
                <option style={optionStyle} key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option style={optionStyle} value="__add_new__">+ Add New Category</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
            >
              <option style={optionStyle} value="MONTHLY">Monthly</option>
              <option style={optionStyle} value="WEEKLY">Weekly</option>
              <option style={optionStyle} value="DAILY">Daily</option>
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
                <label className="mb-1 block text-sm font-medium">Month Mode</label>
                <select
                  value={monthMode}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMonthMode(next);
                    setShowMonthPicker(next === "SELECT");
                  }}
                  className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
                >
                  <option style={optionStyle} value="CURRENT">Current Month</option>
                  <option style={optionStyle} value="ALL">All Months</option>
                  <option style={optionStyle} value="SELECT">Select Month</option>
                </select>
              </div>
              {monthMode === "SELECT" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Select Month</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowMonthPicker(true)}
                      className="rounded-lg border border-sand bg-teal/30 px-4 py-2 text-sm font-semibold text-mist hover:border-peach"
                    >
                      Choose Month
                    </button>
                    <span className="text-sm text-mist/80">{selectedMonthLabel}</span>
                  </div>
                </div>
              )}
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
        {showMonthPicker ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-teal bg-brand-900 p-4">
              <div className="mb-3 text-base font-semibold text-mist">Choose Month</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {monthOptions.map((m) => {
                  const active = Number(month) === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMonth(String(m.value));
                        setShowMonthPicker(false);
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "border-cyan-300 bg-cyan-500/25 text-cyan-100"
                          : "border-sand bg-teal/30 text-mist hover:border-peach"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mist"
                  onClick={() => setShowMonthPicker(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {showCategoryModal ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl border border-teal bg-brand-900 p-4">
              <div className="mb-3 text-base font-semibold text-mist">Add Category</div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="w-full rounded-lg border border-sand bg-teal/30 px-3 py-2 text-mist focus:border-peach focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mist"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName("");
                  }}
                  disabled={creatingCategory}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-mist disabled:opacity-60"
                  onClick={createCategory}
                  disabled={creatingCategory}
                >
                  {creatingCategory ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LimitsForm;


import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const ExpenseForm = ({ isOpen, onClose, expense }) => {
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [spentAt, setSpentAt] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount);
      setPaidTo(expense.paidTo || "");
      setSpentAt(
        expense.spentAt
          ? new Date(expense.spentAt).toISOString().split("T")[0]
          : ""
      );
      setAccountId(expense.accountId ? String(expense.accountId) : "");
      setPaymentMethod(expense.paymentMethod || "");
      setCategoryId(expense.categoryId ? String(expense.categoryId) : "");
      setShowCategoryModal(false);
      setNewCategoryName("");
    } else {
      setAmount("");
      setPaidTo("");
      setSpentAt("");
      setAccountId("");
      setPaymentMethod("");
      setCategoryId("");
      setShowCategoryModal(false);
      setNewCategoryName("");
    }
  }, [expense]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadAccounts = async () => {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          axiosClient.get("/accounts"),
          axiosClient.get("/categories", {
            params: { type: "EXPENSE", sortBy: "name", order: "asc" },
          }),
        ]);
        const rows = Array.isArray(accountsRes.data) ? accountsRes.data : [];
        const banks = rows;
        const categoryRows = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
        if (!cancelled) {
          setBankAccounts(banks);
          setCategories(categoryRows);
          if (!expense && !accountId && banks.length === 1) {
            setAccountId(String(banks[0].id));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setBankAccounts([]);
          setCategories([]);
        }
      }
    };
    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [isOpen, expense]);

  useEffect(() => {
    if (!isOpen || !accountId) return;
    const selected = bankAccounts.find((b) => String(b.id) === String(accountId));
    const methodsForBank = selected?.enabledMethods || [];
    if (!methodsForBank.length) {
      setPaymentMethod("");
      return;
    }
    const valid = methodsForBank.includes(paymentMethod);
    if (!valid) {
      setPaymentMethod(methodsForBank[0]);
    }
  }, [isOpen, accountId, bankAccounts, paymentMethod]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!amount || !spentAt) {
      setNotice("Please fill all required fields");
      return;
    }
    if (!accountId) {
      setNotice("Please select account");
      return;
    }
    if (!paymentMethod) {
      setNotice("Please select payment method");
      return;
    }
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId) {
      try {
        const res = await axiosClient.post("/categories", {
          name: "General",
          type: "EXPENSE",
        });
        resolvedCategoryId = String(res.data?.id || "");
      } catch (error) {
        setNotice(error?.response?.data?.message || "Failed to resolve category");
        return;
      }
    }
    const data = {
      amount: Number(amount),
      paidTo,
      spentAt,
      accountId: Number(accountId),
      paymentMethod,
      ...(resolvedCategoryId ? { categoryId: Number(resolvedCategoryId) } : {}),
    };
    try {
      if (expense) {
        await axiosClient.put(`/expenses/${expense.id}`, data);
      } else {
        await axiosClient.post("/expenses", data);
      }
      onClose();
    } catch (error) {
      setNotice(error?.response?.data?.message || error.message);
    }
  };

  const createCategoryFromModal = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setNotice("Enter a category name");
      return;
    }
    setNotice("");
    setCreatingCategory(true);
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
  const methodsForSelectedAccount =
    bankAccounts.find((b) => String(b.id) === String(accountId))?.enabledMethods || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.95)] p-6 text-mist shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div className="mb-4 text-lg font-semibold">
          {expense ? "Edit Expense" : "Add Expense"}
        </div>
        {notice ? (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {notice}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist placeholder:text-mist/70 focus:border-cyan-300 focus:outline-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={categoryId}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "__add_new__") {
                  setShowCategoryModal(true);
                  return;
                }
                setCategoryId(next);
              }}
            >
              <option value="">Choose a Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__add_new__">+ Add New</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Paid To</label>
            <input
              type="text"
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist placeholder:text-mist/70 focus:border-cyan-300 focus:outline-none"
              placeholder="Merchant / Payee"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Account</label>
            <select
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Select account</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Payment Method</label>
            <select
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={!accountId}
            >
              <option value="">Select method</option>
              {methodsForSelectedAccount.map((m) => (
                <option key={m} value={m}>
                  {m.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mist"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#22c0ff] px-4 py-2 text-sm font-semibold text-[#03102e]"
            >
              {expense ? "Update" : "Add"}
            </button>
          </div>
        </form>
        {showCategoryModal ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl border border-[#3a63b5]/45 bg-[rgba(4,12,46,0.98)] p-4">
              <div className="mb-3 text-sm font-semibold text-mist">Create Category</div>
              <input
                type="text"
                className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist placeholder:text-mist/70 focus:border-cyan-300 focus:outline-none"
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-mist"
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
                  className="rounded-lg bg-[#22c0ff] px-3 py-2 text-xs font-semibold text-[#03102e] disabled:opacity-60"
                  onClick={createCategoryFromModal}
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

export default ExpenseForm;

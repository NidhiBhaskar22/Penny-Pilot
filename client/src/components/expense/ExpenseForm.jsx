import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const ExpenseForm = ({ isOpen, onClose, expense }) => {
  const [amount, setAmount] = useState("");
  const [tag, setTag] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [spentAt, setSpentAt] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount);
      setTag(expense.tag || "");
      setPaidTo(expense.paidTo || "");
      setSpentAt(
        expense.spentAt
          ? new Date(expense.spentAt).toISOString().split("T")[0]
          : ""
      );
      setAccountId(expense.accountId ? String(expense.accountId) : "");
      setPaymentMethodId(expense.paymentMethodId ? String(expense.paymentMethodId) : "");
      setCategoryId(expense.categoryId || "");
    } else {
      setAmount("");
      setTag("");
      setPaidTo("");
      setSpentAt("");
      setAccountId("");
      setPaymentMethodId("");
      setCategoryId("");
    }
  }, [expense]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadAccounts = async () => {
      try {
        const res = await axiosClient.get("/accounts");
        const rows = Array.isArray(res.data) ? res.data : [];
        const banks = rows.filter(
          (a) => String(a.type).toUpperCase() === "BANK" && a.parentId == null
        );
        const methods = rows.filter(
          (a) => String(a.type).toUpperCase() !== "BANK" && a.parentId != null
        );
        if (!cancelled) {
          setAccounts(rows);
          setBankAccounts(banks);
          setPaymentMethods(methods);
          if (!expense && !accountId && banks.length === 1) {
            setAccountId(String(banks[0].id));
          }
        }
      } catch (error) {
        if (!cancelled) setAccounts([]);
      }
    };
    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [isOpen, expense]);

  useEffect(() => {
    if (!isOpen || !accountId) return;
    const methodsForBank = paymentMethods.filter((m) => String(m.parentId) === String(accountId));
    if (!methodsForBank.length) {
      setPaymentMethodId("");
      return;
    }
    const valid = methodsForBank.some((m) => String(m.id) === String(paymentMethodId));
    if (!valid) {
      setPaymentMethodId(String(methodsForBank[0].id));
    }
  }, [isOpen, accountId, paymentMethods, paymentMethodId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!amount || !tag || !paidTo || !spentAt) {
      setNotice("Please fill all required fields");
      return;
    }
    if (!accountId) {
      setNotice("Please select account");
      return;
    }
    if (!paymentMethodId) {
      setNotice("Please select payment method");
      return;
    }
    const data = {
      amount: Number(amount),
      tag,
      paidTo,
      spentAt,
      accountId: Number(accountId),
      paymentMethodId: Number(paymentMethodId),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
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

  if (!isOpen) return null;
  const methodsForSelectedAccount = paymentMethods.filter(
    (m) => String(m.parentId) === String(accountId)
  );

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
            <label className="mb-1 block text-sm font-medium">Category Tag</label>
            <select
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              <option value="">Select</option>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Groceries">Groceries</option>
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
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              disabled={!accountId}
            >
              <option value="">Select method</option>
              {methodsForSelectedAccount.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type})
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
      </div>
    </div>
  );
};

export default ExpenseForm;



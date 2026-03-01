import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

// Helper: IST-safe date string for <input type="date">
function toISTDateInputValue(dateLike) {
  const d = new Date(dateLike);
  const dd = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(d)
    .split("/");

  const [DD, MM, YYYY] = dd;
  return `${YYYY}-${MM}-${DD}`;
}

// Helper: build IST midnight timestamp to avoid UTC shift
function istMidnightISO(dateInput) {
  return `${dateInput}T00:00:00+05:30`;
}

const IncomeForm = ({ isOpen, onClose, income }) => {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [creditedAt, setCreditedAt] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (income) {
      setAmount(String(income.amount ?? ""));
      setSource(income.source || "");
      setTag(income.tag || "");
      setAccountId(income.accountId ? String(income.accountId) : "");
      setPaymentMethodId(income.paymentMethodId ? String(income.paymentMethodId) : "");
      setCreditedAt(
        income.creditedAt ? toISTDateInputValue(income.creditedAt) : ""
      );
    } else {
      setAmount("");
      setSource("");
      setTag("");
      setCreditedAt("");
      setAccountId("");
      setPaymentMethodId("");
    }
  }, [income]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const accountsRes = await axiosClient.get("/accounts");
        const allAccounts = Array.isArray(accountsRes.data) ? accountsRes.data : [];
        const accountOptions = allAccounts.filter((a) => a.isActive !== false);
        const banks = accountOptions.filter(
          (a) => String(a.type).toUpperCase() === "BANK" && (a.parentId == null)
        );
        const methods = accountOptions.filter(
          (a) => String(a.type).toUpperCase() !== "BANK" && a.parentId != null
        );

        if (!cancelled) {
          setAccounts(accountOptions);
          setBankAccounts(banks);
          setPaymentMethods(methods);

          if (!income?.id) {
            if (!accountId && banks.length === 1) {
              setAccountId(String(banks[0].id));
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load income form metadata", error);
          setAccounts([]);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    };

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [isOpen, income?.id]);

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

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setNotice("Amount must be a positive number");
      return;
    }
    if (!source) {
      setNotice("Please select a source");
      return;
    }
    if (!creditedAt) {
      setNotice("Please pick a date");
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

    const creditedAtISO = istMidnightISO(creditedAt);
    const data = {
      amount: amt,
      source,
      tag,
      creditedAt: creditedAtISO,
      accountId: Number(accountId),
      paymentMethodId: Number(paymentMethodId),
    };

    try {
      setSubmitting(true);
      if (income?.id) {
        await axiosClient.put(`/incomes/${income.id}`, data);
      } else {
        await axiosClient.post("/incomes", data);
      }
      onClose();
    } catch (error) {
      setNotice(error?.response?.data?.message || error.message);
      console.error("Income form submission error:", error);
    } finally {
      setSubmitting(false);
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
          {income ? "Edit Income" : "Add Income"}
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
              inputMode="decimal"
              step="0.01"
              min="0.01"
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist placeholder:text-mist/70 focus:border-cyan-300 focus:outline-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Source</label>
            <select
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Select source</option>
              <option value="Salary">Salary</option>
              <option value="Gift">Gift</option>
              <option value="External">External</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tag (optional)</label>
            <input
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist placeholder:text-mist/70 focus:border-cyan-300 focus:outline-none"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Bonus, Freelance, etc."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Account</label>
            <select
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={loadingMeta}
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
              disabled={loadingMeta || !accountId}
            >
              <option value="">Select method</option>
              {methodsForSelectedAccount.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>

          {!loadingMeta && !accounts.length ? (
            <p className="mt-2 text-xs text-mist/70">
              No accounts found. Create one in Accounts page first.
            </p>
          ) : null}
          {!loadingMeta && accountId && !methodsForSelectedAccount.length ? (
            <p className="mt-2 text-xs text-mist/70">
              No payment methods found for selected account. Add one in Accounts page.
            </p>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              value={creditedAt}
              onChange={(e) => setCreditedAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mist"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#22c0ff] px-4 py-2 text-sm font-semibold text-[#03102e] disabled:opacity-60"
              disabled={submitting || loadingMeta}
            >
              {income ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeForm;



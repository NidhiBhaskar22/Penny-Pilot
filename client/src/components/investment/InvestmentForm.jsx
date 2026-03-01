import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const InvestmentForm = ({ isOpen, onClose, investment }) => {
  const [amount, setAmount] = useState("");
  const [instrument, setInstrument] = useState("");
  const [investedDate, setInvestedDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (investment) {
      setAmount(investment.amount);
      setInstrument(investment.instrument || "");
      setAccountId(investment.accountId ? String(investment.accountId) : "");
      setPaymentMethodId(investment.paymentMethodId ? String(investment.paymentMethodId) : "");
      setInvestedDate(
        investment.investedAt ? new Date(investment.investedAt).toISOString().split("T")[0] : ""
      );
    } else {
      setAmount("");
      setInstrument("");
      setInvestedDate("");
      setAccountId("");
      setPaymentMethodId("");
    }
  }, [investment]);

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
          if (!investment && !accountId && banks.length === 1) {
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
  }, [isOpen, investment]);

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
    try {
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
        instrument,
        investedAt: investedDate,
        accountId: Number(accountId),
        paymentMethodId: Number(paymentMethodId),
      };
      if (investment) {
        await axiosClient.put(`/investments/${investment.id}`, data);
      } else {
        await axiosClient.post("/investments", data);
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
          {investment ? "Edit Investment" : "Add Investment"}
        </div>
        {notice ? (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {notice}
          </div>
        ) : null}
        <form id="investment-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Amount (INR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Instrument</label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
            >
              <option value="">Select instrument</option>
              <option value="SIP">SIP</option>
              <option value="Stocks">Stocks</option>
              <option value="Lump-sum">Lump-sum</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              value={investedDate}
              onChange={(e) => setInvestedDate(e.target.value)}
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
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
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
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
            form="investment-form"
            className="rounded-lg bg-[#22c0ff] px-4 py-2 text-sm font-semibold text-[#03102e]"
          >
            {investment ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentForm;



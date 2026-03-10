import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";

const DEFAULT_RESOURCES = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "NIFTY50 ETF",
  "GOLD ETF",
  "PPF",
];

const InvestmentForm = ({ isOpen, onClose, investment }) => {
  const [amount, setAmount] = useState("");
  const [instrument, setInstrument] = useState("");
  const [investedDate, setInvestedDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);

  const [resourceOptions, setResourceOptions] = useState(DEFAULT_RESOURCES);
  const [selectedResource, setSelectedResource] = useState("");
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newResourceName, setNewResourceName] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("investment_resources");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const merged = Array.from(
        new Set([...DEFAULT_RESOURCES, ...parsed.map((v) => String(v).trim()).filter(Boolean)])
      ).sort();
      setResourceOptions(merged);
    } catch (_) {
      // ignore malformed localStorage data
    }
  }, []);

  useEffect(() => {
    if (investment) {
      setAmount(investment.amount);
      setInstrument(investment.instrument || "");
      setAccountId(investment.accountId ? String(investment.accountId) : "");
      setPaymentMethod(investment.paymentMethod || "");
      setSelectedResource(String(investment.details || ""));
      setInvestedDate(
        investment.investedAt ? new Date(investment.investedAt).toISOString().split("T")[0] : ""
      );
      setShowResourceModal(false);
      setNewResourceName("");
    } else {
      setAmount("");
      setInstrument("");
      setInvestedDate("");
      setAccountId("");
      setPaymentMethod("");
      setSelectedResource("");
      setShowResourceModal(false);
      setNewResourceName("");
    }
  }, [investment]);

  useEffect(() => {
    if (!selectedResource) return;
    if (resourceOptions.includes(selectedResource)) return;
    setResourceOptions((prev) => Array.from(new Set([...prev, selectedResource])).sort());
  }, [selectedResource, resourceOptions]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadAccounts = async () => {
      try {
        const res = await axiosClient.get("/accounts");
        const rows = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) {
          setBankAccounts(rows);
          if (!investment && !accountId && rows.length === 1) {
            setAccountId(String(rows[0].id));
          }
        }
      } catch (error) {
        if (!cancelled) setBankAccounts([]);
      }
    };
    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [isOpen, investment, accountId]);

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

  const addResourceOption = () => {
    const normalized = String(newResourceName || "").trim().toUpperCase();
    if (!normalized) {
      setNotice("Enter resource name");
      return;
    }
    const next = Array.from(new Set([...resourceOptions, normalized])).sort();
    setResourceOptions(next);
    localStorage.setItem("investment_resources", JSON.stringify(next));
    setSelectedResource(normalized);
    setShowResourceModal(false);
    setNewResourceName("");
    setNotice("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    try {
      if (!amount || Number(amount) <= 0) {
        setNotice("Please enter a valid amount");
        return;
      }
      if (!instrument) {
        setNotice("Please select instrument");
        return;
      }
      if (!investedDate) {
        setNotice("Please select date");
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
      if (!selectedResource) {
        setNotice("Please select resource");
        return;
      }

      const data = {
        amount: Number(amount),
        instrument,
        investedAt: investedDate,
        accountId: Number(accountId),
        paymentMethod,
        details: selectedResource,
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
  const methodsForSelectedAccount =
    bankAccounts.find((b) => String(b.id) === String(accountId))?.enabledMethods || [];

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
            <label className="mb-1 block text-sm font-medium">Resource</label>
            <select
              value={selectedResource}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "__add_new__") {
                  setShowResourceModal(true);
                  return;
                }
                setSelectedResource(next);
              }}
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
            >
              <option value="">Select resource</option>
              {resourceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__add_new__">+ Add New Resource</option>
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
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
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

        {showResourceModal ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl border border-[#3a63b5]/45 bg-[rgba(4,12,46,0.98)] p-4">
              <div className="mb-3 text-sm font-semibold text-mist">Add Resource</div>
              <input
                type="text"
                className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist placeholder:text-mist/70 focus:border-cyan-300 focus:outline-none"
                placeholder="e.g. TATAMOTORS / Smallcap Fund / Gold ETF"
                value={newResourceName}
                onChange={(e) => setNewResourceName(e.target.value)}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-mist"
                  onClick={() => {
                    setShowResourceModal(false);
                    setNewResourceName("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#22c0ff] px-3 py-2 text-xs font-semibold text-[#03102e]"
                  onClick={addResourceOption}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InvestmentForm;

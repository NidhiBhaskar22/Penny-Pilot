import React, { useEffect, useRef, useState } from "react";
import axiosClient from "../api/axiosClient";
import AppShell from "../components/layout/AppShell";
import AnimatedNumber from "../components/dashboard/AnimatedNumber";

const METHOD_LABELS = {
  NET_BANKING: "Net Banking",
  UPI: "UPI",
  CASH: "Cash",
  DEBIT_CARD: "Debit Card",
  CREDIT_CARD: "Credit Card",
};

const SEARCH_MODES = [
  { value: "stock", label: "Indian Stocks / ETFs" },
  { value: "mutual_fund", label: "Indian Mutual Funds" },
];

const CHARGE_PRESETS = [
  {
    value: "CUSTOM",
    label: "Custom / Enter manually",
  },
  {
    value: "ZERO",
    label: "Unknown or ignore for now (₹0)",
  },
  {
    value: "DIRECT_MF",
    label: "Direct mutual fund platforms (usually ₹0 platform charge)",
  },
  {
    value: "ZERODHA_DELIVERY",
    label: "Zerodha equity delivery / ETF buy (brokerage ₹0, taxes excluded)",
  },
  {
    value: "GROWW_DELIVERY",
    label: "Groww equity delivery approx brokerage",
  },
  {
    value: "UPSTOX_DELIVERY",
    label: "Upstox equity delivery approx brokerage",
  },
];

function calculatePresetFee(preset, amount) {
  const tradeAmount = Number(amount || 0);
  if (!(tradeAmount > 0)) return "";

  switch (preset) {
    case "ZERO":
    case "DIRECT_MF":
    case "ZERODHA_DELIVERY":
      return "0";
    case "GROWW_DELIVERY": {
      const brokerage = Math.min(20, tradeAmount * 0.001);
      const minCharge = Math.min(5, tradeAmount * 0.025);
      return String(Number(Math.max(brokerage, minCharge).toFixed(2)));
    }
    case "UPSTOX_DELIVERY":
      return String(Number(Math.min(20, tradeAmount * 0.001).toFixed(2)));
    default:
      return "";
  }
}

function TechCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.46),0_0_20px_rgba(0,170,255,0.12)] ${className}`}
    >
      {children}
    </div>
  );
}

function fmtCurrency(value, currency = "INR") {
  if (value == null || value === "") return "-";
  return `${currency} ${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtSignedPercent(value) {
  if (value == null || value === "") return "-";
  const numeric = Number(value || 0);
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function DataPoint({ label, value, accentClass = "text-mist" }) {
  return (
    <div className="rounded-xl border border-[#3a63b5]/25 bg-[rgba(8,20,66,0.55)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.22em] text-mist/58">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${accentClass}`}>{value}</div>
    </div>
  );
}

function HoldingsTable({ items }) {
  if (!items.length) {
    return (
      <div className="text-sm text-mist/68">
        No holdings yet. Add a buy transaction to create a position.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#3a63b5]/30">
      <table className="w-full text-left text-sm text-mist">
        <thead className="bg-[rgba(7,18,62,0.95)] text-[11px] uppercase tracking-[0.18em] text-mist/80">
          <tr>
            <th className="px-4 py-3">Instrument</th>
            <th className="px-4 py-3">Units</th>
            <th className="px-4 py-3">Invested</th>
            <th className="px-4 py-3">Current</th>
            <th className="px-4 py-3">P/L</th>
            <th className="px-4 py-3">ROI</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const positive = Number(item.unrealizedProfitLoss || 0) >= 0;
            const isMf = item.symbol?.startsWith("AMFI:");
            const hasLiveValue = item.currentValue != null;
            return (
              <tr
                key={item.instrumentId}
                className={index % 2 === 0 ? "bg-[rgba(7,18,62,0.78)]" : "bg-[rgba(10,25,78,0.78)]"}
              >
                <td className="px-4 py-4">
                  <div className="font-semibold text-mist">{isMf ? item.name : item.symbol}</div>
                  <div className="text-xs text-mist/60">{isMf ? "Indian Mutual Fund" : item.name}</div>
                </td>
                <td className="px-4 py-4">{fmtNumber(item.quantity, 4)}</td>
                <td className="px-4 py-4">{fmtCurrency(item.investedAmount)}</td>
                <td className="px-4 py-4">
                  {hasLiveValue ? fmtCurrency(item.currentValue) : "Unavailable"}
                </td>
                <td className={`px-4 py-4 font-semibold ${!hasLiveValue ? "text-mist/70" : positive ? "text-emerald-300" : "text-red-300"}`}>
                  {hasLiveValue ? fmtCurrency(item.unrealizedProfitLoss) : "Unavailable"}
                </td>
                <td className={`px-4 py-4 font-semibold ${!hasLiveValue ? "text-mist/70" : positive ? "text-emerald-300" : "text-red-300"}`}>
                  {hasLiveValue ? fmtSignedPercent(item.roiPercent) : "Unavailable"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTable({ items, onDelete }) {
  if (!items.length) {
    return <div className="text-sm text-mist/68">No transactions recorded yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#3a63b5]/30">
      <table className="w-full text-left text-sm text-mist">
        <thead className="bg-[rgba(7,18,62,0.95)] text-[11px] uppercase tracking-[0.18em] text-mist/80">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Instrument</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Units</th>
            <th className="px-4 py-3">Price / NAV</th>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isMf = item.instrument?.symbol?.startsWith("AMFI:");
            return (
              <tr
                key={item.id}
                className={index % 2 === 0 ? "bg-[rgba(7,18,62,0.78)]" : "bg-[rgba(10,25,78,0.78)]"}
              >
                <td className="px-4 py-4 text-xs text-mist/72">
                  {new Date(item.transactedAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold text-mist">{isMf ? item.instrument?.name : item.instrument?.symbol}</div>
                  <div className="text-xs text-mist/60">{isMf ? "Indian Mutual Fund" : item.instrument?.name}</div>
                </td>
                <td className={`px-4 py-4 font-semibold ${item.transactionType === "BUY" ? "text-cyan-200" : "text-amber-200"}`}>
                  {item.transactionType}
                </td>
                <td className="px-4 py-4">{fmtNumber(item.quantity, 4)}</td>
                <td className="px-4 py-4">{fmtCurrency(item.price)}</td>
                <td className="px-4 py-4">
                  <div>{item.account?.name || "-"}</div>
                  <div className="text-xs text-mist/60">{METHOD_LABELS[item.paymentMethod] || item.paymentMethod}</div>
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-200"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function InvestmentPage() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    currentValue: 0,
    unrealizedProfitLoss: 0,
    realizedProfitLoss: 0,
    roiPercent: 0,
    holdingsCount: 0,
  });
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchMode, setSearchMode] = useState("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [instrumentDetails, setInstrumentDetails] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    transactionType: "BUY",
    amount: "",
    chargePreset: "CUSTOM",
    price: "",
    fees: "",
    transactedAt: new Date().toISOString().split("T")[0],
    accountId: "",
    paymentMethod: "",
    notes: "",
  });

  const selectedAccount = accounts.find((account) => String(account.id) === String(form.accountId));
  const enabledMethods = selectedAccount?.enabledMethods || [];
  const isMutualFundMode = searchMode === "mutual_fund";
  const searchPopoverRef = useRef(null);
  const searchOverlayOpen = searchOpen && (loadingSearch || searchResults.length > 0);

  const loadPortfolio = async () => {
    const [summaryRes, holdingsRes, transactionsRes] = await Promise.all([
      axiosClient.get("/investments/portfolio-summary"),
      axiosClient.get("/investments/holdings"),
      axiosClient.get("/investments/transactions"),
    ]);

    setSummary(summaryRes.data || {});
    setHoldings(Array.isArray(holdingsRes.data?.items) ? holdingsRes.data.items : []);
    setTransactions(Array.isArray(transactionsRes.data?.items) ? transactionsRes.data.items : []);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [accountsRes] = await Promise.all([axiosClient.get("/accounts"), loadPortfolio()]);
        const rows = Array.isArray(accountsRes.data) ? accountsRes.data : [];
        setAccounts(rows);
        if (rows.length === 1) {
          setForm((prev) => ({
            ...prev,
            accountId: String(rows[0].id),
            paymentMethod: rows[0].enabledMethods?.[0] || "",
          }));
        }
      } catch (error) {
        setNotice(error.response?.data?.message || "Failed to load investment workspace");
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    setSearchResults([]);
    setSelectedInstrument(null);
    setInstrumentDetails(null);
    setNotice("");
    setSearchOpen(false);
  }, [searchMode]);

  useEffect(() => {
    if (!searchOverlayOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!searchPopoverRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchOverlayOpen]);

  useEffect(() => {
    if (!form.accountId) return;
    if (!enabledMethods.length) {
      setForm((prev) => ({ ...prev, paymentMethod: "" }));
      return;
    }
    if (!enabledMethods.includes(form.paymentMethod)) {
      setForm((prev) => ({ ...prev, paymentMethod: enabledMethods[0] }));
    }
  }, [enabledMethods, form.accountId, form.paymentMethod]);

  useEffect(() => {
    if (form.chargePreset === "CUSTOM") return;
    setForm((prev) => ({
      ...prev,
      fees: calculatePresetFee(prev.chargePreset, prev.amount),
    }));
  }, [form.amount, form.chargePreset]);

  const handleSearch = async (event) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    try {
      setLoadingSearch(true);
      setSearchOpen(true);
      setNotice("");
      const endpoint = isMutualFundMode ? "/instruments/mutual-funds/search" : "/instruments/search";
      const params = isMutualFundMode ? { q: query } : { q: query, market: "india" };
      const { data } = await axiosClient.get(endpoint, { params });
      const items = Array.isArray(data?.items) ? data.items : [];
      setSearchResults(items);
      if (!items.length) {
        setNotice(
          isMutualFundMode
            ? "No Indian mutual funds found. Try AMC, scheme, or category."
            : "No Indian NSE/BSE stocks or ETFs found. Try a company name or ticker."
        );
      }
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to search instruments");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectInstrument = async (result) => {
    try {
      setSelectedInstrument(result.symbol);
      setSearchOpen(false);
      setLoadingDetails(true);
      setNotice("");
      const endpoint = isMutualFundMode
        ? `/instruments/mutual-funds/${result.schemeCode}/details`
        : `/instruments/${result.symbol}/details`;
      const { data } = await axiosClient.get(endpoint);
      setInstrumentDetails(data);
      const nextPrice =
        data?.quote?.price != null
          ? String(data.quote.price)
          : data?.profile?.price != null
          ? String(data.profile.price)
          : "";
      setForm((prev) => ({ ...prev, price: nextPrice }));
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to load instrument details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateTransaction = async (event) => {
    event.preventDefault();
    if (!instrumentDetails?.instrument?.symbol) {
      setNotice("Select an instrument first");
      return;
    }
    if (!(computedQuantity > 0)) {
      setNotice("Enter a valid amount, price, and charges so quantity can be calculated.");
      return;
    }

    try {
      setSavingTransaction(true);
      setNotice("");
      await axiosClient.post("/investments/transactions", {
        symbol: instrumentDetails.instrument.symbol,
        transactionType: form.transactionType,
        quantity: Number(computedQuantity),
        price: Number(form.price),
        fees: form.fees === "" ? 0 : Number(form.fees),
        transactedAt: form.transactedAt,
        accountId: Number(form.accountId),
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || undefined,
      });

      await loadPortfolio();
      setForm((prev) => ({
        ...prev,
        amount: "",
        chargePreset: prev.chargePreset,
        fees: "",
        notes: "",
        price:
          instrumentDetails?.quote?.price != null
            ? String(instrumentDetails.quote.price)
            : instrumentDetails?.profile?.price != null
            ? String(instrumentDetails.profile.price)
            : "",
      }));
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to save transaction");
    } finally {
      setSavingTransaction(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      setDeletingId(id);
      setNotice("");
      await axiosClient.delete(`/investments/transactions/${id}`);
      await loadPortfolio();
    } catch (error) {
      setNotice(error.response?.data?.message || "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const quote = instrumentDetails?.quote;
  const instrument = instrumentDetails?.instrument;
  const profile = instrumentDetails?.profile;
  const restrictions = instrumentDetails?.restrictions;
  const mfMeta = instrumentDetails?.mfMeta;
  const displayPrice =
    quote?.price != null ? quote.price : profile?.price != null ? profile.price : null;
  const displayChangePercent =
    quote?.changePercent != null
      ? quote.changePercent
      : profile?.changePercentage != null
      ? profile.changePercentage
      : null;
  const instrumentChange = Number(displayChangePercent || 0);
  const parsedAmount = Number(form.amount || 0);
  const parsedPrice = Number(form.price || 0);
  const parsedFees = Number(form.fees || 0);
  const computedQuantity =
    parsedPrice > 0
      ? form.transactionType === "BUY"
        ? Math.max(0, (parsedAmount - parsedFees) / parsedPrice)
        : Math.max(0, (parsedAmount + parsedFees) / parsedPrice)
      : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {notice ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 backdrop-blur-[4px]"
            onClick={() => setNotice("")}
          >
            <div
              className="relative w-full max-w-md rounded-3xl border border-amber-300/25 bg-[linear-gradient(180deg,rgba(56,36,12,0.98),rgba(35,24,10,0.98))] px-5 py-4 text-amber-50 shadow-[0_28px_70px_rgba(0,0,0,0.5)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close notice"
                onClick={() => setNotice("")}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-amber-50 transition hover:bg-white/10"
              >
                ×
              </button>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-amber-100/70">
                    Notice
                  </div>
                  <div className="mt-3 text-sm leading-6 text-amber-50">{notice}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-mist">Investment Workspace</h1>
            <p className="mt-2 text-sm text-mist/70">
              Built for Indian investors: search NSE/BSE instruments or AMFI mutual funds, then record transactions in INR.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <TechCard>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-mist/65">Total Invested</div>
            <div className="mt-3 text-2xl font-bold text-mist">
              <AnimatedNumber value={Number(summary.totalInvested || 0)} />
            </div>
          </TechCard>
          <TechCard>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-mist/65">Current Value</div>
            <div className="mt-3 text-2xl font-bold text-mist">
              {summary.currentValue != null ? <AnimatedNumber value={Number(summary.currentValue || 0)} /> : "Unavailable"}
            </div>
          </TechCard>
          <TechCard>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-mist/65">Unrealized P/L</div>
            <div className={`mt-3 text-2xl font-bold ${summary.unrealizedProfitLoss == null ? "text-mist/70" : Number(summary.unrealizedProfitLoss || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {summary.unrealizedProfitLoss != null ? fmtCurrency(summary.unrealizedProfitLoss) : "Unavailable"}
            </div>
          </TechCard>
          <TechCard>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-mist/65">Portfolio ROI</div>
            <div className={`mt-3 text-2xl font-bold ${summary.roiPercent == null ? "text-mist/70" : Number(summary.roiPercent || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {summary.roiPercent != null ? fmtSignedPercent(summary.roiPercent) : "Unavailable"}
            </div>
          </TechCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <TechCard>
            <div className="mb-4 text-lg font-semibold text-mist">Search Instrument</div>
            <div className="mb-4 flex flex-wrap gap-2">
              {SEARCH_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setSearchMode(mode.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    searchMode === mode.value
                      ? "bg-[#22c0ff] text-[#03102e]"
                      : "border border-[#4f87df]/35 text-mist/85"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div ref={searchPopoverRef} className="relative z-30">
            {searchOverlayOpen ? (
              <button
                type="button"
                aria-label="Close search results"
                onClick={() => setSearchOpen(false)}
                className="fixed inset-0 z-10 bg-slate-950/18 backdrop-blur-[3px]"
              />
            ) : null}
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isMutualFundMode
                    ? "Search by AMC, scheme, or category"
                    : "Search NSE/BSE company or ticker"
                }
                className="flex-1 rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#22c0ff] px-4 py-2 font-semibold text-[#03102e] disabled:opacity-60"
                disabled={loadingSearch}
              >
                {loadingSearch ? "Searching..." : "Search"}
              </button>
            </form>

            <div className={`${searchOverlayOpen ? "absolute" : "hidden"} inset-x-0 top-full z-20 mt-2 rounded-[22px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(7,15,44,0.96),rgba(4,10,32,0.96))] p-2 shadow-[0_22px_60px_rgba(0,0,0,0.52)] backdrop-blur-xl`}>
              <form onSubmit={handleSearch} className="mb-2 flex gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isMutualFundMode
                      ? "Search by AMC, scheme, or category"
                      : "Search NSE/BSE company or ticker"
                  }
                  className="flex-1 rounded-lg border border-[#4f87df]/30 bg-[rgba(8,20,66,0.68)] px-3 py-2 text-mist focus:border-cyan-300 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#22c0ff] px-4 py-2 text-sm font-semibold text-[#03102e] disabled:opacity-60"
                  disabled={loadingSearch}
                >
                  {loadingSearch ? "Searching..." : "Search"}
                </button>
              </form>
              <div className="mb-2 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/55">
                  Matches
                </div>
                <div className="text-[11px] text-mist/55">
                  {loadingSearch ? "Loading..." : `${searchResults.length} found`}
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="grid grid-cols-1 gap-2">
              {searchResults.map((result) => (
                <button
                  type="button"
                  key={result.symbol}
                  onClick={() => handleSelectInstrument(result)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selectedInstrument === result.symbol
                      ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(103,197,255,0.15)]"
                      : "border-[#3a63b5]/18 bg-[rgba(8,20,66,0.5)] hover:border-cyan-300/28 hover:bg-[rgba(10,24,76,0.72)]"
                  }`}
                >
                  <div className="font-semibold text-mist">
                    {isMutualFundMode ? result.name : result.symbol}
                  </div>
                  <div className="mt-1 inline-block text-sm text-mist/70">
                    {isMutualFundMode ? `${result.amc} • ${result.category}` : result.name}
                  </div>
                  <div className="ml-2 inline-block text-[11px] uppercase tracking-[0.16em] text-mist/42">
                    {isMutualFundMode
                      ? `AMFI • NAV ${fmtCurrency(result.nav)} • ${result.navDate}`
                      : `${result.exchange || "INDIA"} • INR`}
                  </div>
                </button>
              ))}
              </div>
              </div>
            </div>
            </div>
          </TechCard>

          <TechCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-semibold text-mist">Instrument Details</div>
              {loadingDetails ? <span className="text-xs text-cyan-200">Loading...</span> : null}
            </div>

            {instrument ? (
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-mist">{instrument.name}</div>
                  <div className="mt-1 text-sm uppercase tracking-[0.22em] text-mist/58">
                    {isMutualFundMode
                      ? `${mfMeta?.schemeCode || ""} • AMFI • INDIA`
                      : `${instrument.symbol} • ${instrument.exchange || "INDIA"}`}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DataPoint
                    label={isMutualFundMode ? "Latest NAV" : "Current Price"}
                    value={fmtCurrency(displayPrice)}
                  />
                  <DataPoint
                    label={isMutualFundMode ? "NAV Date" : "Day Change"}
                    value={isMutualFundMode ? mfMeta?.navDate || "-" : fmtSignedPercent(displayChangePercent)}
                    accentClass={
                      !isMutualFundMode && displayChangePercent != null
                        ? instrumentChange >= 0
                          ? "text-emerald-300"
                          : "text-red-300"
                        : "text-mist"
                    }
                  />
                  <DataPoint
                    label={isMutualFundMode ? "AMC" : "Sector"}
                    value={isMutualFundMode ? mfMeta?.amc || "-" : instrument.sector || "-"}
                  />
                  <DataPoint
                    label={isMutualFundMode ? "Category" : "Industry"}
                    value={isMutualFundMode ? mfMeta?.category || "-" : instrument.industry || instrument.assetType || "-"}
                  />
                  <DataPoint label="Currency" value="INR" />
                  <DataPoint
                    label={isMutualFundMode ? "Source" : "Exchange"}
                    value={isMutualFundMode ? "AMFI" : instrument.exchange || "-"}
                  />
                </div>

                {!isMutualFundMode && (restrictions?.paidPlanRestricted || restrictions?.quoteUnavailable) ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Some live detail fields for this Indian stock or ETF are unavailable on the current FMP free tier. You can still use the instrument and enter transaction prices manually.
                  </div>
                ) : null}

                {instrument.description ? (
                  <div className="rounded-xl border border-[#3a63b5]/25 bg-[rgba(8,20,66,0.55)] px-4 py-3 text-sm leading-6 text-mist/78">
                    {instrument.description}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#3a63b5]/28 bg-[rgba(8,20,66,0.35)] px-4 py-6 text-sm text-mist/65">
                {isMutualFundMode
                  ? "Search and select an Indian mutual fund to load AMFI-backed NAV details."
                  : "Search and select an NSE/BSE stock or ETF to load India-first details."}
              </div>
            )}
          </TechCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <TechCard>
            <div className="mb-4 text-lg font-semibold text-mist">Add Transaction</div>
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-mist">Transaction Type</label>
                  <select
                    value={form.transactionType}
                    onChange={(e) => setForm((prev) => ({ ...prev, transactionType: e.target.value }))}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-mist">Date</label>
                  <input
                    type="date"
                    value={form.transactedAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, transactedAt: e.target.value }))}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-mist">
                    {form.transactionType === "BUY" ? "Amount Invested" : "Amount Received"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-mist">{isMutualFundMode ? "NAV" : "Price"}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-mist">Charges / Fees</label>
                  <select
                    value={form.chargePreset}
                    onChange={(e) => {
                      const nextPreset = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        chargePreset: nextPreset,
                        fees:
                          nextPreset === "CUSTOM"
                            ? prev.fees
                            : calculatePresetFee(nextPreset, prev.amount),
                      }));
                    }}
                    className="mb-2 w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-sm text-mist"
                  >
                    {CHARGE_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={form.fees}
                    onChange={(e) => setForm((prev) => ({ ...prev, fees: e.target.value }))}
                    disabled={form.chargePreset !== "CUSTOM"}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                  />
                  <div className="mt-1 text-xs text-mist/60">
                    Presets are convenience estimates. Broker taxes, STT, stamp duty, and DP charges may still differ.
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-mist">
                    {isMutualFundMode ? "Units" : "Quantity"}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={computedQuantity > 0 ? fmtNumber(computedQuantity, 4) : ""}
                    className="w-full rounded-lg border border-[#4f87df]/30 bg-[rgba(8,20,66,0.55)] px-3 py-2 text-mist/90"
                  />
                  <div className="mt-1 text-xs text-mist/60">
                    {form.transactionType === "BUY"
                      ? "Calculated as (amount invested - charges) / price"
                      : "Calculated as (amount received + charges) / price"}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-mist">Account</label>
                  <select
                    value={form.accountId}
                    onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-mist">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    disabled={!form.accountId}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist disabled:opacity-60"
                  >
                    <option value="">Select method</option>
                    {enabledMethods.map((method) => (
                      <option key={method} value={method}>
                        {METHOD_LABELS[method] || method}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-mist">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingTransaction}
                className="rounded-lg bg-[#22c0ff] px-4 py-2 font-semibold text-[#03102e] disabled:opacity-60"
              >
                {savingTransaction ? "Saving..." : "Save Transaction"}
              </button>
            </form>
          </TechCard>

          <TechCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-semibold text-mist">Portfolio Snapshot</div>
              <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                {summary.holdingsCount || 0} holdings
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DataPoint label="Invested Capital" value={fmtCurrency(summary.totalInvested)} />
              <DataPoint label="Current Market Value" value={fmtCurrency(summary.currentValue)} />
              <DataPoint
                label="Unrealized Profit/Loss"
                value={fmtCurrency(summary.unrealizedProfitLoss)}
                accentClass={Number(summary.unrealizedProfitLoss || 0) >= 0 ? "text-emerald-300" : "text-red-300"}
              />
              <DataPoint
                label="Realized Profit/Loss"
                value={fmtCurrency(summary.realizedProfitLoss)}
                accentClass={Number(summary.realizedProfitLoss || 0) >= 0 ? "text-emerald-300" : "text-red-300"}
              />
            </div>
            {summary.topHolding ? (
              <div className="mt-4 rounded-xl border border-[#3a63b5]/25 bg-[rgba(8,20,66,0.55)] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-mist/58">Top Holding</div>
                <div className="mt-2 text-lg font-semibold text-mist">
                  {summary.topHolding.symbol?.startsWith("AMFI:")
                    ? summary.topHolding.name
                    : summary.topHolding.symbol}
                </div>
                <div className="mt-1 text-sm text-mist/70">{fmtCurrency(summary.topHolding.currentValue)} current value</div>
              </div>
            ) : null}
          </TechCard>
        </div>

        <TechCard>
          <div className="mb-4 text-lg font-semibold text-mist">Holdings</div>
          <HoldingsTable items={holdings} />
        </TechCard>

        <TechCard>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-semibold text-mist">Recent Transactions</div>
            {deletingId ? <span className="text-xs text-red-200">Deleting...</span> : null}
          </div>
          <TransactionsTable items={transactions} onDelete={handleDeleteTransaction} />
        </TechCard>
      </div>
    </AppShell>
  );
}

// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axiosClient from "../api/axiosClient";

import TimeframeSelector from "../components/dashboard/TimeframeSelector";
import LimitsDiffDisplayByCategory from "../components/dashboard/LimitsDiffDisplay";
import AppShell from "../components/layout/AppShell";
import AnimatedNumber from "../components/dashboard/AnimatedNumber";

const MotionBox = motion.div;
const dashboardFade = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65 } },
};
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const pad = (n) => String(n).padStart(2, "0");

function getISOWeekString(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(weekNo)}`;
}

function buildDefaultFilters() {
  const now = new Date();
  return {
    timeframe: "monthly",
    anchorMonth: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
    anchorWeek: getISOWeekString(now),
    anchorDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    anchorYear: String(now.getFullYear()),
    accountId: "",
    methodType: "",
  };
}
const METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CREDIT_CARD", label: "Credit Card" },
];

const KpiCard = ({ label, value, badge }) => (
  <MotionBox
    className="relative overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-8 shadow-[0_16px_42px_rgba(0,0,0,0.48),0_0_24px_rgba(0,170,255,0.12)]"
    variants={dashboardFade}
  >
    <div className="mb-4 flex items-center justify-between">
      <div className="text-xs font-bold uppercase tracking-widest text-mist/80">
        {label}
      </div>
      <span className="rounded-full border border-cyan-300/45 bg-cyan-400/10 px-2 text-[10px] uppercase tracking-wider text-cyan-200">
        {badge}
      </span>
    </div>
    <div className="text-3xl font-bold text-mist">
      <AnimatedNumber value={value} />
    </div>
    <div className="mt-2 text-[10px] uppercase tracking-widest text-mist/60">
      Active Signal
    </div>
  </MotionBox>
);

const StatCard = ({ title, value, unit, accent }) => (
  <div className="relative overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-8 shadow-[0_16px_42px_rgba(0,0,0,0.48),0_0_24px_rgba(0,170,255,0.12)]">
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="text-sm tracking-wider text-mist/80">{title}</div>
        <div className="text-3xl font-bold" style={{ color: accent }}>
          {value}
          {unit ? <span className="ml-1 text-sm opacity-70">{unit}</span> : null}
        </div>
      </div>
      <div
        className="relative h-16 w-16 rounded-full border-[6px]"
        style={{ borderColor: accent, boxShadow: `0 0 18px ${accent}` }}
      >
        <div
          className="absolute inset-2 rounded-full"
          style={{ background: accent, opacity: 0.2 }}
        />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const defaultFilters = React.useMemo(() => buildDefaultFilters(), []);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const buildAnchor = useCallback(() => {
    switch (appliedFilters.timeframe) {
      case "monthly":
        return appliedFilters.anchorMonth || defaultFilters.anchorMonth;
      case "weekly":
        return (
          appliedFilters.anchorWeek ||
          appliedFilters.anchorDate ||
          defaultFilters.anchorDate
        );
      case "daily":
        return appliedFilters.anchorDate || defaultFilters.anchorDate;
      case "yearly":
        return appliedFilters.anchorYear || defaultFilters.anchorYear;
      default:
        return undefined;
    }
  }, [appliedFilters, defaultFilters.anchorDate, defaultFilters.anchorMonth, defaultFilters.anchorYear]);

  useEffect(() => {
    let cancelled = false;
    const loadAccounts = async () => {
      try {
        const { data } = await axiosClient.get("/accounts");
        if (!cancelled) setAccounts(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) setAccounts([]);
      }
    };
    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const anchor = buildAnchor();
        const { data } = await axiosClient.get("/dashboard/advanced", {
          params: {
            timeframe: appliedFilters.timeframe,
            anchor,
            ...(appliedFilters.accountId
              ? { accountId: appliedFilters.accountId }
              : {}),
            ...(appliedFilters.methodType
              ? { methodType: appliedFilters.methodType }
              : {}),
          },
        });

        const merged = {
          ...data,
          label: data?.label || "",
          totalIncome: Number(data?.totalIncome ?? 0),
          totalExpense: Number(data?.totalExpense ?? 0),
          totalInvestment: Number(data?.totalInvestment ?? 0),
        };

        if (!cancelled) setSummary(merged);
      } catch (error) {
        console.error("Failed to load dashboard summary", error);
        if (!cancelled) {
          setSummary(
            (s) =>
              s ?? {
                label: "",
                totalIncome: 0,
                totalExpense: 0,
                totalInvestment: 0,
                balances: { current: 0, lastWeek: 0, lastMonth: 0 },
                expenseDifferenceByCategory: [],
              },
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [buildAnchor, appliedFilters]);

  if (loading || !summary) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center text-mist">
          Loading...
        </div>
      </AppShell>
    );
  }

  const netFlow = summary.totalIncome - summary.totalExpense;

  const bankAccounts = accounts;
  const hasPendingChanges =
    JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const handleResetFilters = () => {
    const fresh = buildDefaultFilters();
    setDraftFilters(fresh);
    setAppliedFilters(fresh);
  };

  const handleCurrentAnchor = () => {
    const fresh = buildDefaultFilters();
    setDraftFilters((prev) => ({
      ...prev,
      anchorMonth: fresh.anchorMonth,
      anchorWeek: fresh.anchorWeek,
      anchorDate: fresh.anchorDate,
      anchorYear: fresh.anchorYear,
    }));
  };

  return (
    <AppShell>
      <div className="relative mx-auto mt-12 max-w-6xl px-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(74,130,255,0.16) 0 1px, transparent 1px 44px)",
          }}
        />

        <MotionBox variants={stagger} initial="hidden" animate="visible">
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-[#3a63b5]/45 bg-gradient-to-br from-[rgba(3,10,40,0.94)] to-[rgba(6,20,68,0.9)] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.56),0_0_30px_rgba(0,190,255,0.2)]">
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(280px 160px at 18% 8%, rgba(0,195,255,0.2), transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="mb-2 text-4xl font-extrabold tracking-wide text-mist">
                Financial Signal Dashboard
              </div>
              <div className="text-sm tracking-wider text-mist/70">
                Live view of your income, expenses, investments, and net flow
              </div>
              {summary.label && (
                <div className="mt-3 inline-flex rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-wider text-cyan-200">
                  Active Window: {summary.label}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Income" value={summary.totalIncome} badge="IN" />
            <KpiCard label="Total Expenses" value={summary.totalExpense} badge="OUT" />
            <KpiCard
              label="Total Investments"
              value={summary.totalInvestment}
              badge="HOLD"
            />
            <KpiCard label="Net Flow" value={netFlow} badge="DELTA" />
          </div>

          <div className="mb-8 rounded-xl border border-[#3a63b5]/30 bg-[rgba(4,12,46,0.6)] p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-7">
              <TimeframeSelector
                timeframe={draftFilters.timeframe}
                setTimeframe={(value) =>
                  setDraftFilters((prev) => ({ ...prev, timeframe: value }))
                }
                className="h-9 rounded-md border-[#4f87df]/35 bg-[rgba(4,12,46,0.7)] text-sm"
              />
              {draftFilters.timeframe === "monthly" && (
                <input
                  type="month"
                  className="h-9 rounded-md border border-[#4f87df]/35 bg-[rgba(4,12,46,0.7)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                  value={draftFilters.anchorMonth}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      anchorMonth: e.target.value,
                    }))
                  }
                />
              )}
              {draftFilters.timeframe === "weekly" && (
                <input
                  type="week"
                  className="h-9 rounded-md border border-[#4f87df]/35 bg-[rgba(4,12,46,0.7)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                  value={draftFilters.anchorWeek}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      anchorWeek: e.target.value,
                    }))
                  }
                />
              )}
              {draftFilters.timeframe === "daily" && (
                <input
                  type="date"
                  className="h-9 rounded-md border border-[#4f87df]/35 bg-[rgba(4,12,46,0.7)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                  value={draftFilters.anchorDate}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      anchorDate: e.target.value,
                    }))
                  }
                />
              )}
              {draftFilters.timeframe === "yearly" && (
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  className="h-9 rounded-md border border-[#4f87df]/35 bg-[rgba(4,12,46,0.7)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                  value={draftFilters.anchorYear}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      anchorYear: e.target.value,
                    }))
                  }
                  placeholder="Year"
                />
              )}
              <select
                className="h-9 rounded-md border border-[#4f87df]/35 bg-[rgba(4,12,46,0.7)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={draftFilters.accountId}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, accountId: e.target.value }))
                }
              >
                <option value="">All Accounts</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-[#4f87df]/35 bg-[rgba(4,12,46,0.7)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={draftFilters.methodType}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, methodType: e.target.value }))
                }
              >
                {METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCurrentAnchor}
                className="h-9 rounded-md border border-[#4f87df]/35 px-3 text-sm text-mist/85"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 rounded-md border border-[#4f87df]/35 px-3 text-sm text-mist/85"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="h-9 rounded-md bg-[#22c0ff] px-4 text-sm font-semibold text-[#03102e] disabled:opacity-50"
                disabled={!hasPendingChanges}
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-0 shadow-[0_16px_42px_rgba(0,0,0,0.48),0_0_24px_rgba(0,170,255,0.12)]">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-2xl font-extrabold tracking-wide text-mist">
                    Balance Overview
                  </div>
                  <span className="rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-wider text-cyan-200">
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <StatCard
                    title="Balance"
                    value={summary.balances.current}
                    accent="rgb(72, 216, 255)"
                  />
                  <StatCard
                    title="Last Week"
                    value={summary.balances.lastWeek}
                    accent="rgb(123, 173, 255)"
                  />
                  <StatCard
                    title="Last Month"
                    value={summary.balances.lastMonth}
                    accent="rgb(153, 135, 255)"
                  />
                  <StatCard
                    title="Net Flow"
                    value={netFlow}
                    accent="rgb(48, 194, 255)"
                  />
                </div>
              </div>
            </div>

            <div className="relative min-h-[225px] overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-8 shadow-[0_16px_42px_rgba(0,0,0,0.48),0_0_24px_rgba(0,170,255,0.12)]">
              <div className="mb-5 text-2xl font-extrabold tracking-wide text-mist">
                Limits Delta Matrix
              </div>
              <LimitsDiffDisplayByCategory
                differences={summary.expenseDifferenceByCategory}
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-8 shadow-[0_16px_42px_rgba(0,0,0,0.48),0_0_24px_rgba(0,170,255,0.12)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-lg font-bold tracking-wide text-mist">
                Category Nodes
              </div>
              <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs text-cyan-200">
                {summary.expenseDifferenceByCategory?.length || 0} Nodes
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summary.expenseDifferenceByCategory?.length ? (
                summary.expenseDifferenceByCategory.map((d) => (
                  <div
                    key={`${d.category}-${d.categoryId}`}
                    className="rounded-xl border border-[#4f87df]/40 bg-[rgba(8,20,66,0.78)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)]"
                  >
                    <div className="text-xs uppercase tracking-wider text-mist/80">
                      {d.category || "Uncategorized"}
                    </div>
                    <div className="text-2xl font-bold text-cyan-200">
                      {Math.round(d.difference || 0)}
                    </div>
                    <div className="text-xs text-mist/60">
                      Limit {Math.round(d.limit || 0)} | Spent{" "}
                      {Math.round(d.spent || 0)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-mist/70">
                  No limit signals yet. Add limits to see node activity.
                </div>
              )}
            </div>
          </div>
        </MotionBox>
      </div>
    </AppShell>
  );
};

export default DashboardPage;

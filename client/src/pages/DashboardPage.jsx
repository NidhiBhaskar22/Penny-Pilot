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
const now = new Date();
const DEFAULT_MONTH = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
const DEFAULT_DATE = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
  now.getDate(),
)}`;
const DEFAULT_YEAR = String(now.getFullYear());
const METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CREDIT_CARD", label: "Credit Card" },
];

const KpiCard = ({ label, value, tag }) => (
  <MotionBox
    className="relative overflow-hidden rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-8 shadow-[0_16px_42px_rgba(0,0,0,0.48),0_0_24px_rgba(0,170,255,0.12)]"
    variants={dashboardFade}
  >
    <div className="mb-4 flex items-center justify-between">
      <div className="text-xs font-bold uppercase tracking-widest text-mist/80">
        {label}
      </div>
      <span className="rounded-full border border-cyan-300/45 bg-cyan-400/10 px-2 text-[10px] uppercase tracking-wider text-cyan-200">
        {tag}
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
  const [timeframe, setTimeframe] = useState("monthly");
  const [anchorMonth, setAnchorMonth] = useState(DEFAULT_MONTH);
  const [anchorWeek, setAnchorWeek] = useState("");
  const [anchorDate, setAnchorDate] = useState(DEFAULT_DATE);
  const [anchorYear, setAnchorYear] = useState(DEFAULT_YEAR);
  const [accountId, setAccountId] = useState("");
  const [methodType, setMethodType] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const buildAnchor = useCallback(() => {
    switch (timeframe) {
      case "monthly":
        return anchorMonth || DEFAULT_MONTH;
      case "weekly":
        return anchorWeek || anchorDate || DEFAULT_DATE;
      case "daily":
        return anchorDate || DEFAULT_DATE;
      case "yearly":
        return anchorYear || DEFAULT_YEAR;
      default:
        return undefined;
    }
  }, [timeframe, anchorMonth, anchorWeek, anchorDate, anchorYear]);

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
            timeframe,
            anchor,
            ...(accountId ? { accountId } : {}),
            ...(methodType ? { methodType } : {}),
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
  }, [buildAnchor, timeframe, accountId, methodType]);

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

  const bankAccounts = accounts.filter(
    (a) => String(a.type).toUpperCase() === "BANK" && a.parentId == null
  );

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

          <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
            <select
              className="h-10 rounded-lg border border-[#4f87df]/45 bg-[rgba(4,12,46,0.88)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">All Accounts</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-lg border border-[#4f87df]/45 bg-[rgba(4,12,46,0.88)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
              value={methodType}
              onChange={(e) => setMethodType(e.target.value)}
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <TimeframeSelector timeframe={timeframe} setTimeframe={setTimeframe} />

            {timeframe === "monthly" && (
              <input
                type="month"
                className="h-10 rounded-lg border border-[#4f87df]/45 bg-[rgba(4,12,46,0.88)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={anchorMonth}
                onChange={(e) => setAnchorMonth(e.target.value)}
              />
            )}

            {timeframe === "weekly" && (
              <input
                type="week"
                className="h-10 rounded-lg border border-[#4f87df]/45 bg-[rgba(4,12,46,0.88)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={anchorWeek}
                onChange={(e) => setAnchorWeek(e.target.value)}
              />
            )}

            {timeframe === "daily" && (
              <input
                type="date"
                className="h-10 rounded-lg border border-[#4f87df]/45 bg-[rgba(4,12,46,0.88)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
              />
            )}

            {timeframe === "yearly" && (
              <input
                type="number"
                min="2000"
                max="2100"
                className="h-10 w-28 rounded-lg border border-[#4f87df]/45 bg-[rgba(4,12,46,0.88)] px-3 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={anchorYear}
                onChange={(e) => setAnchorYear(e.target.value)}
                placeholder="Year"
              />
            )}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total Income" value={summary.totalIncome} tag="IN" />
            <KpiCard label="Total Expenses" value={summary.totalExpense} tag="OUT" />
            <KpiCard
              label="Total Investments"
              value={summary.totalInvestment}
              tag="HOLD"
            />
            <KpiCard label="Net Flow" value={netFlow} tag="DELTA" />
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

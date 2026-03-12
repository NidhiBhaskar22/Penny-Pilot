import React, { useState, useEffect, useCallback } from "react";
import axiosClient from "../api/axiosClient";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import TimeframeSelector from "../components/dashboard/TimeframeSelector";
import AppShell from "../components/layout/AppShell";

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

const CHART_COLORS = ["#22c0ff", "#7bd8ff", "#7bafff", "#4de3c1", "#f7b267"];

const chartTooltipStyle = {
  backgroundColor: "rgba(4, 12, 46, 0.96)",
  border: "1px solid rgba(79, 135, 223, 0.35)",
  borderRadius: 12,
  color: "#edf6ff",
};

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatMonthLabel = (value) => {
  if (!value) return "";
  const [year, month] = String(value).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-IN", { month: "short" });
};

function AnalysisMetric({ label, value, hint, tone = "text-mist" }) {
  return (
    <div className="rounded-xl border border-[#3a63b5]/35 bg-[rgba(4,12,46,0.72)] p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-mist/60">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${tone}`}>{value}</div>
      <div className="mt-2 text-sm text-mist/65">{hint}</div>
    </div>
  );
}

function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#3a63b5]/35 bg-[rgba(4,12,46,0.78)] shadow-[0_16px_42px_rgba(0,0,0,0.34)]">
      <div className="border-b border-[#3a63b5]/20 px-5 py-4">
        <div className="text-lg font-semibold text-mist">{title}</div>
        <div className="mt-1 text-sm text-mist/60">{subtitle}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function AnalysisPage() {
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
      } catch (_) {
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
            ...(appliedFilters.accountId ? { accountId: appliedFilters.accountId } : {}),
            ...(appliedFilters.methodType ? { methodType: appliedFilters.methodType } : {}),
          },
        });
        if (!cancelled) setSummary(data);
      } catch (_) {
        if (!cancelled) {
          setSummary({
            label: "",
            insights: {
              spendAnomalies: { topAnomalies: [] },
              incomeStability: {
                stabilityScore: 0,
                topSource: null,
                average: 0,
                stddev: 0,
                monthlyTotals: [],
              },
              investmentHealth: {
                concentration: { level: "low", topHoldingShare: 0, topHoldings: [] },
                monthlyContributions: [],
              },
              riskForecast: {
                confidence: "low",
                actualToDate: { income: 0, expense: 0 },
                monthEndProjection: { income: 0, expense: 0, saving: 0 },
                riskSignals: {
                  expenseOverrunRisk: false,
                  incomeShortfallRisk: false,
                  monthlyLimitTotal: 0,
                },
                savingsRunway: { currentBalance: 0, dailyBurn: 0, runwayDays: null },
              },
            },
          });
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
        <div className="flex min-h-[60vh] items-center justify-center text-mist">Loading...</div>
      </AppShell>
    );
  }

  const hasPendingChanges =
    JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);

  const handleApplyFilters = () => setAppliedFilters(draftFilters);
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

  const insights = summary.insights || {};
  const topAnomalies = insights.spendAnomalies?.topAnomalies || [];
  const incomeStability = insights.incomeStability || {};
  const investmentHealth = insights.investmentHealth || {};
  const concentration = investmentHealth.concentration || {};
  const riskForecast = insights.riskForecast || {};
  const projection = riskForecast.monthEndProjection || {};
  const riskSignals = riskForecast.riskSignals || {};
  const runway = riskForecast.savingsRunway || {};
  const actualToDate = riskForecast.actualToDate || {};

  const anomalyChartData = topAnomalies.map((item) => ({
    category: item.category,
    current: Number(item.current || 0),
    baseline: Number(item.baselineAvg || 0),
  }));

  const incomeTrendData = (incomeStability.monthlyTotals || []).map((item) => ({
    month: formatMonthLabel(item.month),
    income: Number(item.amount || 0),
  }));

  const holdingsData = (concentration.topHoldings || []).map((item) => ({
    name: item.instrument,
    value: Number(item.amount || 0),
    sharePct: Number(item.sharePct || 0),
  }));

  const contributionTrendData = (investmentHealth.monthlyContributions || []).map((item) => ({
    month: formatMonthLabel(item.month),
    amount: Number(item.amount || 0),
  }));

  const projectionCompareData = [
    {
      stage: "Actual",
      income: Number(actualToDate.income || 0),
      expense: Number(actualToDate.expense || 0),
      limit: Number(riskSignals.monthlyLimitTotal || 0),
    },
    {
      stage: "Projected",
      income: Number(projection.income || 0),
      expense: Number(projection.expense || 0),
      limit: Number(riskSignals.monthlyLimitTotal || 0),
    },
  ];

  return (
    <AppShell>
      <div className="relative mx-auto mt-12 max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-mist">Analysis</h1>
          <div className="mt-1 text-sm text-mist/70">
            Graphs that make spending tradeoffs, income consistency, portfolio concentration, and risk signals easier to read.
          </div>
        </div>

        <div className="mb-8 rounded-lg border border-[#3a63b5]/20 bg-[rgba(4,12,46,0.45)] p-2.5">
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3 xl:grid-cols-7">
            <TimeframeSelector
              timeframe={draftFilters.timeframe}
              setTimeframe={(value) =>
                setDraftFilters((prev) => ({ ...prev, timeframe: value }))
              }
              className="h-8 rounded-md border-[#4f87df]/25 bg-[rgba(4,12,46,0.55)] text-sm"
            />
            {draftFilters.timeframe === "monthly" && (
              <input
                type="month"
                className="h-8 rounded-md border border-[#4f87df]/25 bg-[rgba(4,12,46,0.55)] px-2.5 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={draftFilters.anchorMonth}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, anchorMonth: e.target.value }))
                }
              />
            )}
            {draftFilters.timeframe === "weekly" && (
              <input
                type="week"
                className="h-8 rounded-md border border-[#4f87df]/25 bg-[rgba(4,12,46,0.55)] px-2.5 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={draftFilters.anchorWeek}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, anchorWeek: e.target.value }))
                }
              />
            )}
            {draftFilters.timeframe === "daily" && (
              <input
                type="date"
                className="h-8 rounded-md border border-[#4f87df]/25 bg-[rgba(4,12,46,0.55)] px-2.5 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={draftFilters.anchorDate}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, anchorDate: e.target.value }))
                }
              />
            )}
            {draftFilters.timeframe === "yearly" && (
              <input
                type="number"
                min="2000"
                max="2100"
                className="h-8 rounded-md border border-[#4f87df]/25 bg-[rgba(4,12,46,0.55)] px-2.5 text-sm text-mist focus:border-cyan-300 focus:outline-none"
                value={draftFilters.anchorYear}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, anchorYear: e.target.value }))
                }
                placeholder="Year"
              />
            )}
            <select
              className="h-8 rounded-md border border-[#4f87df]/25 bg-[rgba(4,12,46,0.55)] px-2.5 text-sm text-mist focus:border-cyan-300 focus:outline-none"
              value={draftFilters.accountId}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, accountId: e.target.value }))
              }
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-md border border-[#4f87df]/25 bg-[rgba(4,12,46,0.55)] px-2.5 text-sm text-mist focus:border-cyan-300 focus:outline-none"
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
              className="h-8 rounded-md border border-[#4f87df]/25 px-2.5 text-sm text-mist/80"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8 rounded-md border border-[#4f87df]/25 px-2.5 text-sm text-mist/80"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="h-8 rounded-md bg-[#22c0ff]/95 px-3 text-sm font-semibold text-[#03102e] disabled:opacity-50"
              disabled={!hasPendingChanges}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            title="Expense Tradeoffs"
            subtitle="Current category spend versus the three-month baseline average"
          >
            {anomalyChartData.length ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={anomalyChartData} barGap={8}>
                      <CartesianGrid stroke="rgba(120,160,255,0.12)" vertical={false} />
                      <XAxis dataKey="category" stroke="#9fb0d5" tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#9fb0d5"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatCompactNumber}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: "transparent" }}
                      />
                      <Legend />
                      <Bar dataKey="baseline" name="Baseline Avg" fill="#4569b2" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="current" name="Current" fill="#22c0ff" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {topAnomalies.slice(0, 3).map((item) => (
                    <div
                      key={`${item.categoryId}-${item.category}`}
                      className="flex items-center justify-between rounded-xl border border-[#3a63b5]/25 bg-[rgba(7,18,60,0.65)] px-3 py-2 text-sm"
                    >
                      <span className="text-mist">{item.category}</span>
                      <span className="font-semibold text-cyan-200">
                        {item.upliftPct == null ? "New category spike" : `+${item.upliftPct}% above normal`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[#3a63b5]/30 bg-[rgba(7,18,60,0.45)] p-6 text-sm text-mist/70">
                No clear spend anomalies in the selected window.
              </div>
            )}
          </ChartPanel>

          <ChartPanel
            title="Income Stability Curve"
            subtitle="Monthly income trend against the six-month average"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incomeTrendData}>
                  <defs>
                    <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c0ff" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#22c0ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(120,160,255,0.12)" vertical={false} />
                  <XAxis dataKey="month" stroke="#9fb0d5" tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9fb0d5"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactNumber}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={false} />
                  <ReferenceLine
                    y={Number(incomeStability.average || 0)}
                    stroke="#f7b267"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#22c0ff"
                    strokeWidth={2.5}
                    fill="url(#incomeArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[#3a63b5]/25 bg-[rgba(7,18,60,0.65)] px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">Average</div>
                <div className="mt-1 text-lg font-semibold text-mist">
                  {formatCompactNumber(incomeStability.average || 0)}
                </div>
              </div>
              <div className="rounded-xl border border-[#3a63b5]/25 bg-[rgba(7,18,60,0.65)] px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">Volatility</div>
                <div className="mt-1 text-lg font-semibold text-mist">
                  {Number(incomeStability.stddev || 0).toFixed(1)}
                </div>
              </div>
              <div className="rounded-xl border border-[#3a63b5]/25 bg-[rgba(7,18,60,0.65)] px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">Top Source</div>
                <div className="mt-1 text-lg font-semibold text-mist">
                  {incomeStability.topSource?.source || "N/A"}
                </div>
              </div>
            </div>
          </ChartPanel>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartPanel
            title="Portfolio Concentration"
            subtitle="Tradeoff between diversification and exposure to top holdings"
          >
            {holdingsData.length ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={holdingsData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={96}
                        paddingAngle={3}
                      >
                        {holdingsData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value, _name, item) => [
                          `${formatCompactNumber(value)} (${item.payload.sharePct}%)`,
                          item.payload.name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {holdingsData.map((item, index) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-[#3a63b5]/25 bg-[rgba(7,18,60,0.65)] px-3 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="text-sm text-mist">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-cyan-200">{item.sharePct}%</span>
                      </div>
                      <div className="mt-2 text-xs text-mist/60">
                        Allocated: {formatCompactNumber(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#3a63b5]/30 bg-[rgba(7,18,60,0.45)] p-6 text-sm text-mist/70">
                No investment allocation data in the selected window.
              </div>
            )}
          </ChartPanel>

          <ChartPanel
            title="Investment Contributions"
            subtitle="How much capital was added into investments across recent months"
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={contributionTrendData}>
                  <defs>
                    <linearGradient id="contributionArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7bd8ff" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#7bd8ff" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(120,160,255,0.12)" vertical={false} />
                  <XAxis dataKey="month" stroke="#9fb0d5" tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9fb0d5"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactNumber}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#7bd8ff"
                    strokeWidth={2.5}
                    fill="url(#contributionArea)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#3a63b5]/25 bg-[rgba(7,18,60,0.65)] px-4 py-3 text-sm">
              <span className="text-mist/70">Six-month invested total</span>
              <span className="font-semibold text-mist">
                {formatCompactNumber(investmentHealth.totalInvested || 0)}
              </span>
            </div>
          </ChartPanel>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ChartPanel
            title="Projection vs Limit"
            subtitle="Current pace against month-end projection and monthly limit"
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectionCompareData} barGap={10}>
                  <CartesianGrid stroke="rgba(120,160,255,0.12)" vertical={false} />
                  <XAxis dataKey="stage" stroke="#9fb0d5" tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9fb0d5"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactNumber}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "transparent" }} />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#4de3c1"
                    radius={[6, 6, 0, 0]}
                    activeBar={false}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="#22c0ff"
                    radius={[6, 6, 0, 0]}
                    activeBar={false}
                  />
                  <Bar
                    dataKey="limit"
                    name="Monthly Limit"
                    fill="#f7b267"
                    radius={[6, 6, 0, 0]}
                    activeBar={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          <div className="grid grid-cols-1 gap-4">
            <AnalysisMetric
              label="Expense Overrun Risk"
              value={riskSignals.expenseOverrunRisk ? "HIGH" : "LOW"}
              hint={`Limit base: ${formatCompactNumber(riskSignals.monthlyLimitTotal || 0)}`}
              tone={riskSignals.expenseOverrunRisk ? "text-red-300" : "text-emerald-300"}
            />
            <AnalysisMetric
              label="Income Shortfall Risk"
              value={riskSignals.incomeShortfallRisk ? "HIGH" : "LOW"}
              hint={`Projected income: ${formatCompactNumber(projection.income || 0)}`}
              tone={riskSignals.incomeShortfallRisk ? "text-red-300" : "text-emerald-300"}
            />
            <AnalysisMetric
              label="Current Balance"
              value={formatCompactNumber(runway.currentBalance || 0)}
              hint="Used to estimate how long the current burn rate stays sustainable"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

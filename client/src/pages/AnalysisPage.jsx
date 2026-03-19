import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  ReceiptIndianRupee,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import axiosClient from "../api/axiosClient";
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
    anchorYear: String(now.getFullYear()),
    accountId: "",
    methodType: "",
  };
}

function buildEmptySummary() {
  return {
    label: "",
    balances: { current: 0 },
    analysis: {
      spending: {
        topCategories: [],
        habits: {
          totalSpent: 0,
          transactionCount: 0,
          averageTicket: 0,
          topMethod: null,
        },
        limitViolations: [],
        topPurchases: [],
      },
      investment: {
        portfolio: {
          investedAmount: 0,
          currentValue: 0,
          profitLoss: 0,
          roiPct: 0,
          profitableAssets: 0,
          losingAssets: 0,
        },
        bestPerformers: [],
        worstPerformers: [],
      },
      netWorth: {
        savings: 0,
        investments: 0,
        total: 0,
      },
      cumulativeTrend: {
        timeframe: "monthly",
        points: [],
      },
    },
    insights: {
      spendAnomalies: { topAnomalies: [] },
      riskForecast: {
        monthEndProjection: { income: 0, expense: 0, saving: 0 },
        riskSignals: {
          expenseOverrunRisk: false,
          incomeShortfallRisk: false,
          monthlyLimitTotal: 0,
        },
        savingsRunway: { currentBalance: 0, dailyBurn: 0, runwayDays: null },
      },
    },
  };
}

function buildEmptyPortfolioSummary() {
  return {
    totalInvested: 0,
    currentValue: 0,
    unrealizedProfitLoss: 0,
    realizedProfitLoss: 0,
    roiPercent: 0,
    holdingsCount: 0,
    topHolding: null,
  };
}

function formatMonthLabel(value) {
  if (!value) return "Select month";
  const [year, month] = String(value).split("-").map(Number);
  if (!year || !month) return "Select month";
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

const METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CREDIT_CARD", label: "Credit Card" },
];

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const SERIES_META = {
  income: { label: "Income", color: "#7ef7c9" },
  expense: { label: "Expense", color: "#ff8a80" },
  investment: { label: "Investment", color: "#f7c66f" },
};

const SAVINGS_SERIES_META = { label: "Savings", color: "#6fd3ff" };

const chartTooltipStyle = {
  backgroundColor: "rgba(11, 15, 34, 0.96)",
  border: "1px solid rgba(103, 197, 255, 0.24)",
  borderRadius: 16,
  color: "#f8fafc",
};

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const filterControlClassName =
  "h-9 min-w-[140px] rounded-xl border border-white/10 bg-[#0b1127] px-3 text-sm text-slate-200 outline-none transition [color-scheme:dark] focus:border-sky-300/50 focus:bg-[#0b1127] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert";

function SectionCard({ className = "", children }) {
  return (
    <section
      className={`analysis-reveal relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,17,39,0.94),rgba(7,11,26,0.92))] shadow-[0_20px_70px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(86,191,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,194,102,0.08),transparent_28%)]" />
      <div className="relative p-6">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description, aside }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-[0.28em] text-sky-200/70">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{description}</p> : null}
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}

function StatChip({ icon: Icon, label, value, tone = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`mt-2 text-xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function EmptyPanel({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

const AnalysisHeroSection = React.memo(function AnalysisHeroSection() {
  return (
    <SectionCard className="mb-6">
      <SectionHeader
        title={"Analysis Summary"}
        description="A concise summary of your financial health and key insights for the selected period."
      />
    </SectionCard>
  );
});

const SpendingSection = React.memo(function SpendingSection({ spending, topAnomalies }) {
  return (
    <SectionCard>
      <SectionHeader
        eyebrow="Spending Radar"
        title="Top expenditure categories"
        description="The three categories pulling the most money in the selected period, plus how your spending behavior is shaping up."
      />
      {spending.topCategories?.length ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {spending.topCategories.map((item, index) => (
            <div
              key={`${item.categoryId}-${item.category}`}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    #{index + 1}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">{item.category}</div>
                </div>
                <div className="rounded-full border border-sky-200/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                  {item.sharePct}%
                </div>
              </div>
              <div className="mt-8 text-3xl font-semibold text-white">
                {formatCurrency(item.spent)}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {item.purchases} purchases in this window
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyPanel text="No expense categories available for the selected window." />
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <StatChip
          icon={ReceiptIndianRupee}
          label="Average Ticket"
          value={formatCurrency(spending.habits?.averageTicket)}
        />
        <StatChip
          icon={ArrowUpRight}
          label="Purchase Count"
          value={String(spending.habits?.transactionCount || 0)}
        />
        <StatChip
          icon={WalletCards}
          label="Dominant Method"
          value={
            spending.habits?.topMethod
              ? `${spending.habits.topMethod.method.replaceAll("_", " ")} ${spending.habits.topMethod.sharePct}%`
              : "No dominant method"
          }
        />
      </div>

      {topAnomalies.length ? (
        <div className="mt-6 rounded-[24px] border border-amber-200/10 bg-amber-300/[0.06] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-amber-100/70">
            Spending habits
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {topAnomalies.slice(0, 3).map((item) => (
              <div
                key={`${item.categoryId}-${item.category}`}
                className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3"
              >
                <div className="text-sm font-medium text-white">{item.category}</div>
                <div className="mt-1 text-sm text-slate-300">
                  {item.upliftPct == null
                    ? "New spike detected in this category."
                    : `${item.upliftPct}% above the recent baseline.`}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
});

const NetWorthSection = React.memo(function NetWorthSection({ netWorth }) {
  return (
    <SectionCard>
      <SectionHeader
        eyebrow="Net Worth"
        title="Savings plus investments"
        description="Net worth here is calculated from your current savings base and the current estimated value of your investment portfolio."
      />
      <div className="mt-6 grid gap-3">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-sm text-slate-400">Savings</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatCurrency(netWorth.savings)}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-sm text-slate-400">Investment value</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatCurrency(netWorth.investments)}
          </div>
        </div>
        <div className="rounded-[24px] border border-sky-200/20 bg-sky-300/[0.08] p-5">
          <div className="text-sm text-sky-100/70">Net worth</div>
          <div className="mt-3 text-4xl font-semibold text-sky-100">
            {formatCurrency(netWorth.total)}
          </div>
        </div>
      </div>
    </SectionCard>
  );
});

const GuardrailsSection = React.memo(function GuardrailsSection({ limitViolations }) {
  return (
    <SectionCard>
      <SectionHeader
        eyebrow="Guardrails"
        title="Category limit violations"
        description="Categories currently overshooting their configured monthly limit."
      />
      <div className="mt-6 space-y-3">
        {limitViolations?.length ? (
          limitViolations.map((item) => (
            <div
              key={`${item.categoryId}-${item.category}`}
              className="rounded-2xl border border-red-200/10 bg-red-300/[0.05] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-medium text-white">{item.category}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Limit {formatCurrency(item.limit)} | Spent {formatCurrency(item.spent)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.22em] text-red-100/70">
                    Over by
                  </div>
                  <div className="mt-1 text-xl font-semibold text-red-200">
                    {formatCurrency(item.overBy)}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyPanel text="No category limit violations for this window." />
        )}
      </div>
    </SectionCard>
  );
});

const PurchasesSection = React.memo(function PurchasesSection({ topPurchases }) {
  return (
    <SectionCard>
      <SectionHeader
        eyebrow="Purchase Stack"
        title="Top purchases"
        description="The highest-value purchases inside the current analysis window."
      />
      <div className="mt-6 grid gap-3">
        {topPurchases?.length ? (
          topPurchases.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="text-base font-medium text-white">{item.paidTo}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {item.category} | {formatDate(item.spentAt)}
                </div>
              </div>
              <div className="text-right text-xl font-semibold text-white">
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))
        ) : (
          <EmptyPanel text="No purchases found in the selected window." />
        )}
      </div>
    </SectionCard>
  );
});

const PortfolioSection = React.memo(function PortfolioSection({ portfolio, investment }) {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Investment Pulse" title="Current portfolio" description={null} />
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatChip icon={Landmark} label="Invested" value={formatCurrency(portfolio.investedAmount)} />
        <StatChip
          icon={portfolio.profitLoss >= 0 ? TrendingUp : TrendingDown}
          label="P&L"
          value={formatCurrency(portfolio.profitLoss)}
          tone={portfolio.profitLoss >= 0 ? "text-emerald-300" : "text-red-300"}
        />
        <StatChip
          icon={portfolio.roiPct >= 0 ? ArrowUpRight : ArrowDownRight}
          label="Weighted ROI"
          value={`${Number(portfolio.roiPct || 0).toFixed(2)}%`}
          tone={portfolio.roiPct >= 0 ? "text-emerald-300" : "text-red-300"}
        />
        <StatChip
          icon={WalletCards}
          label="Current Value"
          value={formatCurrency(portfolio.currentValue)}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <StatChip
          icon={TrendingUp}
          label="Realized P&L"
          value={formatCurrency(portfolio.realizedProfitLoss)}
          tone={portfolio.realizedProfitLoss >= 0 ? "text-emerald-300" : "text-red-300"}
        />
        <StatChip icon={WalletCards} label="Holdings" value={String(portfolio.holdingsCount || 0)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-emerald-200/10 bg-emerald-300/[0.05] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/70">
            Best performing assets
          </div>
          <div className="mt-4 space-y-3">
            {investment.bestPerformers?.length ? (
              investment.bestPerformers.map((item) => (
                <div key={item.instrument} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white">{item.instrument}</div>
                    <div className="text-emerald-300">{item.roiPct}%</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Value {formatCurrency(item.currentValue)} | P&L {formatCurrency(item.profitLoss)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanel text="No investment winners yet." />
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-red-200/10 bg-red-300/[0.05] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-red-100/70">
            Worst performing assets
          </div>
          <div className="mt-4 space-y-3">
            {investment.worstPerformers?.length ? (
              investment.worstPerformers.map((item) => (
                <div key={item.instrument} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white">{item.instrument}</div>
                    <div className="text-red-300">{item.roiPct}%</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Value {formatCurrency(item.currentValue)} | P&L {formatCurrency(item.profitLoss)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanel text="No investment laggards yet." />
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
});

const AISection = React.memo(function AISection({
  llmLoading,
  riskSignals,
  runway,
  llmInsights,
  projection,
}) {
  return (
    <SectionCard>
      <SectionHeader
        eyebrow="AI Guidance"
        title="Next actions and risks"
        description="AI suggestions are shown here without repeating the long summary already present on the dashboard."
        aside={
          llmLoading ? (
            <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-sky-100">
              Analyzing
            </span>
          ) : null
        }
      />
      <div className="mt-6 grid gap-3">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
            Core risks
          </div>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
              <span className="text-slate-300">Expense overrun risk</span>
              <span className={riskSignals.expenseOverrunRisk ? "text-red-300" : "text-emerald-300"}>
                {riskSignals.expenseOverrunRisk ? "High" : "Low"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
              <span className="text-slate-300">Income shortfall risk</span>
              <span className={riskSignals.incomeShortfallRisk ? "text-red-300" : "text-emerald-300"}>
                {riskSignals.incomeShortfallRisk ? "High" : "Low"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
              <span className="text-slate-300">Savings runway</span>
              <span className="text-white">
                {runway.runwayDays == null ? "Stable" : `${runway.runwayDays} days`}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-amber-200/10 bg-amber-300/[0.05] p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-100/70">
            <AlertTriangle className="h-4 w-4" />
            AI risk read
          </div>
          <div className="mt-3 text-sm leading-7 text-slate-200">
            {llmInsights?.riskInsight ||
              "AI suggestions are unavailable until the configured LLM provider responds. The rule-based risk metrics above are still active."}
          </div>
        </div>

        <div className="grid gap-3">
          {(llmInsights?.actions || []).length ? (
            llmInsights.actions.map((action, index) => (
              <div
                key={`${index}-${action}`}
                className="rounded-2xl border border-sky-200/12 bg-sky-300/[0.05] px-4 py-4 text-sm leading-6 text-sky-50"
              >
                {action}
              </div>
            ))
          ) : (
            <EmptyPanel text="No AI actions available right now." />
          )}
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
            Projection snapshot
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-sm text-slate-400">Income</div>
              <div className="mt-1 text-xl font-semibold text-white">{formatCurrency(projection.income)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Expense</div>
              <div className="mt-1 text-xl font-semibold text-white">{formatCurrency(projection.expense)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Saving</div>
              <div className="mt-1 text-xl font-semibold text-white">{formatCurrency(projection.saving)}</div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
});

const TrendSection = React.memo(function TrendSection({ trend, visibleSeries, onToggleSeries }) {
  return (
    <SectionCard className="mt-6">
      <SectionHeader
        eyebrow="Trend Studio"
        title="Period movement and savings curve"
        description="Income, expense, and investment are shown as period-wise values for the selected week, month, or year. Savings is shown separately as a cumulative line."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(SERIES_META).map(([key, meta]) => {
          const active = visibleSeries.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleSeries(key)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-transparent text-slate-950"
                  : "border-white/10 bg-white/[0.03] text-slate-300"
              }`}
              style={active ? { backgroundColor: meta.color } : undefined}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 h-[360px] rounded-[24px] border border-white/8 bg-[#070b18]/80 p-3">
        {trend.points?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.11)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactNumber}
              />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
              {visibleSeries.map((seriesKey) => (
                <Line
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={SERIES_META[seriesKey].color}
                  strokeWidth={2.8}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyPanel text="No income, expense, or investment trend data available for the selected period." />
          </div>
        )}
      </div>

      <div className="mt-8">
        <SectionHeader
          eyebrow="Savings Curve"
          title="Cumulative savings"
          description="This line accumulates net savings across the selected period."
        />
      </div>

      <div className="mt-6 h-[320px] rounded-[24px] border border-white/8 bg-[#070b18]/80 p-3">
        {trend.points?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.11)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactNumber}
              />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatCurrency(value)} />
              <Line
                type="monotone"
                dataKey="savings"
                stroke={SAVINGS_SERIES_META.color}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <EmptyPanel text="No cumulative savings data available for the selected period." />
          </div>
        )}
      </div>
    </SectionCard>
  );
});

const AnalysisContent = React.memo(function AnalysisContent({ appliedFilters }) {
  const emptySummary = useMemo(() => buildEmptySummary(), []);
  const defaultFilters = useMemo(() => buildDefaultFilters(), []);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [portfolioSummary, setPortfolioSummary] = useState(() => buildEmptyPortfolioSummary());
  const [holdings, setHoldings] = useState([]);
  const [llmInsights, setLlmInsights] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [visibleSeries, setVisibleSeries] = useState(["income", "expense", "investment"]);
  const rootRef = useRef(null);

  const buildAnchor = useCallback(() => {
    switch (appliedFilters.timeframe) {
      case "weekly":
        return appliedFilters.anchorWeek || defaultFilters.anchorWeek;
      case "yearly":
        return appliedFilters.anchorYear || defaultFilters.anchorYear;
      case "monthly":
      default:
        return appliedFilters.anchorMonth || defaultFilters.anchorMonth;
    }
  }, [appliedFilters, defaultFilters.anchorMonth, defaultFilters.anchorWeek, defaultFilters.anchorYear]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetchSummary = async () => {
      try {
        const { data } = await axiosClient.get("/dashboard/advanced", {
          params: {
            timeframe: appliedFilters.timeframe,
            anchor: buildAnchor(),
            ...(appliedFilters.accountId ? { accountId: appliedFilters.accountId } : {}),
            ...(appliedFilters.methodType ? { methodType: appliedFilters.methodType } : {}),
          },
        });
        if (!cancelled) {
          setSummary({ ...emptySummary, ...data });
        }
      } catch (_) {
        if (!cancelled) {
          setSummary(emptySummary);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [appliedFilters, buildAnchor, emptySummary]);

  useEffect(() => {
    let cancelled = false;
    const fetchPortfolio = async () => {
      try {
        const [summaryRes, holdingsRes] = await Promise.all([
          axiosClient.get("/investments/portfolio-summary"),
          axiosClient.get("/investments/holdings"),
        ]);

        if (!cancelled) {
          setPortfolioSummary(summaryRes.data || buildEmptyPortfolioSummary());
          setHoldings(Array.isArray(holdingsRes.data?.items) ? holdingsRes.data.items : []);
        }
      } catch (_) {
        if (!cancelled) {
          setPortfolioSummary(buildEmptyPortfolioSummary());
          setHoldings([]);
        }
      }
    };

    fetchPortfolio();
    return () => {
      cancelled = true;
    };
  }, []);

  const investment = useMemo(() => {
    const holdingComparisons = holdings.map((item) => ({
      instrument: item.symbol?.startsWith("AMFI:") ? item.name : item.symbol,
      currentValue: Number(item.currentValue || 0),
      profitLoss: Number(item.unrealizedProfitLoss || 0),
      roiPct: Number(item.roiPercent || 0),
    }));
    const bestPerformers = holdingComparisons
      .filter((item) => item.profitLoss > 0 || item.roiPct > 0)
      .sort((a, b) => {
        if (b.roiPct !== a.roiPct) return b.roiPct - a.roiPct;
        return b.profitLoss - a.profitLoss;
      });
    const worstPerformers = holdingComparisons
      .filter((item) => item.profitLoss < 0 || item.roiPct < 0)
      .sort((a, b) => {
        if (a.roiPct !== b.roiPct) return a.roiPct - b.roiPct;
        return a.profitLoss - b.profitLoss;
      });

    return {
      portfolio: {
        investedAmount: Number(portfolioSummary.totalInvested || 0),
        currentValue: Number(portfolioSummary.currentValue || 0),
        profitLoss: Number(portfolioSummary.unrealizedProfitLoss || 0),
        roiPct: Number(portfolioSummary.roiPercent || 0),
        profitableAssets: holdings.filter((item) => Number(item.unrealizedProfitLoss || 0) > 0).length,
        losingAssets: holdings.filter((item) => Number(item.unrealizedProfitLoss || 0) < 0).length,
        realizedProfitLoss: Number(portfolioSummary.realizedProfitLoss || 0),
        holdingsCount: Number(portfolioSummary.holdingsCount || 0),
      },
      bestPerformers,
      worstPerformers,
    };
  }, [holdings, portfolioSummary]);

  useEffect(() => {
    if (!summary) return;
    let cancelled = false;
    const fetchInsights = async () => {
      setLlmLoading(true);
      try {
        const enrichedSummary = {
          ...summary,
          analysis: {
            ...summary.analysis,
            investment,
            netWorth: {
              ...summary.analysis?.netWorth,
              investments: Number(portfolioSummary.currentValue || 0),
              total:
                Number(summary.balances?.current || 0) + Number(portfolioSummary.currentValue || 0),
            },
          },
        };
        const { data } = await axiosClient.post("/analysis/summary", { summary: enrichedSummary });
        if (!cancelled) setLlmInsights(data?.insights || null);
      } catch (_) {
        if (!cancelled) setLlmInsights(null);
      } finally {
        if (!cancelled) setLlmLoading(false);
      }
    };
    fetchInsights();
    return () => {
      cancelled = true;
    };
  }, [investment, portfolioSummary.currentValue, summary]);

  useLayoutEffect(() => {
    if (!summary || !rootRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".analysis-reveal",
        { autoAlpha: 0, y: 32, scale: 0.985 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.72,
          ease: "power3.out",
          stagger: 0.08,
          clearProps: "all",
        }
      );
    }, rootRef);
    return () => ctx.revert();
  }, [summary, appliedFilters]);

  const toggleSeries = useCallback((seriesKey) => {
    setVisibleSeries((current) => {
      if (current.includes(seriesKey)) {
        return current.length === 1 ? current : current.filter((item) => item !== seriesKey);
      }
      return [...current, seriesKey];
    });
  }, []);

  const spending = useMemo(
    () => summary?.analysis?.spending || emptySummary.analysis.spending,
    [summary, emptySummary]
  );
  const netWorth = useMemo(
    () => ({
      savings: Number(summary?.balances?.current || 0),
      investments: Number(portfolioSummary.currentValue || 0),
      total: Number(summary?.balances?.current || 0) + Number(portfolioSummary.currentValue || 0),
    }),
    [portfolioSummary.currentValue, summary]
  );
  const trend = useMemo(
    () => summary?.analysis?.cumulativeTrend || emptySummary.analysis.cumulativeTrend,
    [summary, emptySummary]
  );
  const topAnomalies = useMemo(
    () => summary?.insights?.spendAnomalies?.topAnomalies || [],
    [summary]
  );
  const riskForecast = useMemo(
    () => summary?.insights?.riskForecast || emptySummary.insights.riskForecast,
    [summary, emptySummary]
  );
  const riskSignals = useMemo(() => riskForecast.riskSignals || {}, [riskForecast]);
  const runway = useMemo(() => riskForecast.savingsRunway || {}, [riskForecast]);
  const projection = useMemo(() => riskForecast.monthEndProjection || {}, [riskForecast]);
  const portfolio = useMemo(() => investment.portfolio, [investment]);

  if (loading || !summary) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-200">
        Loading analysis...
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <AnalysisHeroSection />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SpendingSection spending={spending} topAnomalies={topAnomalies} />
        <NetWorthSection netWorth={netWorth} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <GuardrailsSection limitViolations={spending.limitViolations} />
        <PurchasesSection topPurchases={spending.topPurchases} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <PortfolioSection portfolio={portfolio} investment={investment} />
        <AISection
          llmLoading={llmLoading}
          riskSignals={riskSignals}
          runway={runway}
          llmInsights={llmInsights}
          projection={projection}
        />
      </div>

      <TrendSection
        trend={trend}
        visibleSeries={visibleSeries}
        onToggleSeries={toggleSeries}
      />
    </div>
  );
});

export default function AnalysisPage() {
  const defaultFilters = useMemo(() => buildDefaultFilters(), []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const yearOptions = useMemo(
    () => Array.from({ length: 21 }, (_, index) => String(currentYear - 10 + index)),
    [currentYear]
  );
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [accounts, setAccounts] = useState([]);

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

  const hasPendingChanges = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const [draftMonthYear, draftMonthNumber] = String(draftFilters.anchorMonth || "").split("-");
  const selectedPeriodLabel =
    draftFilters.timeframe === "yearly"
      ? draftFilters.anchorYear || "Select year"
      : formatMonthLabel(draftFilters.anchorMonth);

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
      anchorYear: fresh.anchorYear,
    }));
  };

  return (
    <AppShell>
      <div className="relative mx-auto mt-8 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <SectionCard className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setDraftFilters((prev) => ({ ...prev, timeframe: option.value }))
                  }
                  className={`h-9 rounded-full px-4 text-sm transition ${
                    draftFilters.timeframe === option.value
                      ? "bg-sky-300 text-slate-950"
                      : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-sky-200/40"
                  }`}
                >
                  {option.label}
                </button>
              ))}

              <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  Selected Period
                </div>
                <div className="mt-1 text-sm font-medium text-white">{selectedPeriodLabel}</div>
              </div>

              {draftFilters.timeframe === "monthly" ? (
                <div className="flex flex-wrap gap-2">
                  <label className="flex min-w-[180px] flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                      Choose Month
                    </span>
                    <select
                      value={draftMonthNumber || MONTH_OPTIONS[0].value}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          anchorMonth: `${draftMonthYear || currentYear}-${e.target.value}`,
                        }))
                      }
                      className={`${filterControlClassName} min-w-[180px]`}
                    >
                      {MONTH_OPTIONS.map((month) => (
                        <option
                          key={month.value}
                          value={month.value}
                          className="bg-[#0b1127] text-slate-200"
                        >
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex min-w-[140px] flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                      Choose Year
                    </span>
                    <select
                      value={draftMonthYear || String(currentYear)}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          anchorMonth: `${e.target.value}-${draftMonthNumber || MONTH_OPTIONS[0].value}`,
                        }))
                      }
                      className={`${filterControlClassName} min-w-[140px]`}
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year} className="bg-[#0b1127] text-slate-200">
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {draftFilters.timeframe === "yearly" ? (
                <label className="flex min-w-[160px] flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Choose Year
                  </span>
                  <select
                    value={draftFilters.anchorYear}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, anchorYear: e.target.value }))
                    }
                    className={`${filterControlClassName} min-w-[160px]`}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year} className="bg-[#0b1127] text-slate-200">
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {accounts.length > 1 ? (
                <select
                  value={draftFilters.accountId}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, accountId: e.target.value }))
                  }
                  className={`${filterControlClassName} min-w-[150px]`}
                >
                  <option value="" className="bg-[#0b1127] text-slate-200">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-[#0b1127] text-slate-200">
                      {account.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCurrentAnchor}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-300 transition hover:border-sky-200/40"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-300 transition hover:border-sky-200/40"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={!hasPendingChanges}
                className="h-9 rounded-xl bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </SectionCard>

        <AnalysisContent appliedFilters={appliedFilters} />
      </div>
    </AppShell>
  );
}

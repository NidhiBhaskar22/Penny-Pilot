import { Link as RouterLink } from "react-router-dom";

export default function AnalysisSection() {
  return (
    <section className="mx-auto grid max-w-[1200px] gap-6 px-6 pb-20 md:px-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[28px] border border-[#3a63b5]/35 bg-[rgba(4,12,46,0.85)] p-8">
        <div className="text-sm font-bold uppercase tracking-[0.28em] text-peach">
          Analysis
        </div>
        <h2 className="mt-4 text-3xl font-black text-mist md:text-4xl">
          See the pattern behind the totals.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-mist/72">
          Monthly comparisons, category-heavy periods, and account-level signals
          help you understand what changed and why. The goal is not just
          reporting. It is better decisions next month.
        </p>
        <RouterLink
          to="/analysis"
          className="mt-8 inline-flex rounded-xl bg-peach px-6 py-3 text-sm font-bold text-brand-900 shadow-[0_16px_34px_rgba(248,191,118,0.28)]"
        >
          Explore Analysis
        </RouterLink>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-[#3a63b5]/35 bg-[rgba(7,18,60,0.62)] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">
            What you can read fast
          </div>
          <div className="mt-3 text-lg font-bold text-mist">
            Spending spikes, income consistency, investment direction
          </div>
        </div>
        <div className="rounded-2xl border border-[#3a63b5]/35 bg-[rgba(7,18,60,0.62)] p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-mist/55">
            Why it matters
          </div>
          <div className="mt-3 text-lg font-bold text-mist">
            You stop reacting late to trends that were visible all along
          </div>
        </div>
      </div>
    </section>
  );
}

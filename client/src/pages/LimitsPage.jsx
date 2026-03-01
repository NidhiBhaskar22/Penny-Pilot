import React, { useEffect, useMemo, useState } from "react";
import { useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import axiosClient from "../api/axiosClient";

import LimitsForm from "../components/limits/LimitsForm";
import AppShell from "../components/layout/AppShell";

function TechCard({ children, ...props }) {
  return (
    <div
      className="rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.46),0_0_20px_rgba(0,170,255,0.12)]"
      {...props}
    >
      {children}
    </div>
  );
}

function AnimatedNumber({ value = 0, fmt = (v) => v.toLocaleString() }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 20, stiffness: 120 });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    mv.set(Number(value || 0));
  }, [value, mv]);

  useMotionValueEvent(spring, "change", (v) => {
    setDisplay(Math.round(v));
  });

  return <>{fmt(display)}</>;
}

const LimitsPage = () => {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState(null);

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/limits");
      setLimits(Array.isArray(response.data) ? response.data : response.data?.limits || []);
    } catch (error) {
      console.error("Failed to load limits", error);
      setLimits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  const onEdit = (limit) => {
    setSelectedLimit(limit);
    setIsOpen(true);
  };

  const onFormClose = () => {
    setIsOpen(false);
    setSelectedLimit(null);
    fetchLimits();
  };

  const totalCategories = limits.length;
  const totalMonthly = useMemo(
    () => limits.filter((l) => l.scope === "MONTHLY").reduce((s, l) => s + Number(l.amount || 0), 0),
    [limits]
  );
  const totalWeekly = useMemo(
    () => limits.filter((l) => l.scope === "WEEKLY").reduce((s, l) => s + Number(l.amount || 0), 0),
    [limits]
  );
  const totalDaily = useMemo(
    () => limits.filter((l) => l.scope === "DAILY").reduce((s, l) => s + Number(l.amount || 0), 0),
    [limits]
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center text-mist">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold text-mist">Expenditure Limits</h1>
          <button
            onClick={() => onEdit(null)}
            className="rounded-lg bg-[#22c0ff] px-4 py-2 font-semibold text-[#03102e]"
          >
            {limits.length ? "Add New Limit" : "Set Limits"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Categories</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={totalCategories} />
            </div>
            <div className="mt-2 text-sm text-mist/70">With configured limits</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Total Monthly</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={totalMonthly} />
            </div>
            <div className="mt-2 text-sm text-mist/70">INR across all categories</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Total Weekly</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={totalWeekly} />
            </div>
            <div className="mt-2 text-sm text-mist/70">INR across all categories</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Total Daily</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={totalDaily} />
            </div>
            <div className="mt-2 text-sm text-mist/70">INR across all categories</div>
          </TechCard>
        </div>

        {limits.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {limits.map((limit) => (
              <TechCard
                key={
                  limit.id || limit._id || `${limit.category?.name || "general"}-${limit.scope}-${limit.amount}`
                }
              >
                <div className="mb-2 text-lg font-semibold text-mist">{limit.category?.name || "General"}</div>
                <div className="mb-4 text-sm text-mist/70">
                  <div>
                    <span className="font-semibold">Scope:</span> {limit.scope}
                  </div>
                  <div>
                    <span className="font-semibold">Amount:</span> INR {Number(limit.amount || 0).toLocaleString()}
                  </div>
                  {limit.scope === "MONTHLY" && (
                    <div>
                      <span className="font-semibold">Month/Year:</span> {limit.month}/{limit.year}
                    </div>
                  )}
                  {limit.scope === "WEEKLY" && (
                    <div>
                      <span className="font-semibold">Week/Year:</span> {limit.week}/{limit.year}
                    </div>
                  )}
                  {limit.scope === "DAILY" && (
                    <div>
                      <span className="font-semibold">Day:</span> {limit.day ? limit.day.slice(0, 10) : "-"}
                    </div>
                  )}
                </div>
                <button
                  className="rounded-lg bg-[#22c0ff] px-3 py-2 text-sm font-semibold text-[#03102e]"
                  onClick={() => onEdit(limit)}
                >
                  Edit
                </button>
              </TechCard>
            ))}
          </div>
        ) : (
          <TechCard>
            <div className="text-mist/70">No limits set yet. Click "Set Limits".</div>
          </TechCard>
        )}

        {isOpen && <LimitsForm isOpen={isOpen} onClose={onFormClose} limits={selectedLimit} />}
      </div>
    </AppShell>
  );
};

export default LimitsPage;

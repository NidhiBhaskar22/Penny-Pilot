import React, { useEffect, useMemo, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";
import axiosClient from "../api/axiosClient";

import InvestmentList from "../components/investment/InvestmentList";
import InvestmentForm from "../components/investment/InvestmentForm";
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
  const rounded = useTransform(spring, (v) => Math.round(v));
  useEffect(() => {
    mv.set(Number(value || 0));
  }, [value, mv]);
  return <>{fmt(Number(rounded.get() || 0))}</>;
}

const InvestmentPage = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/investments");
      const rows = Array.isArray(res.data) ? res.data : res.data?.investments || [];
      setInvestments(rows);
    } catch (e) {
      console.error("Failed to load investments", e);
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const onEdit = (investment) => {
    setSelectedInvestment(investment);
    setIsOpen(true);
  };
  const onAddNew = () => {
    setSelectedInvestment(null);
    setIsOpen(true);
  };
  const onFormClose = () => {
    setIsOpen(false);
    fetchInvestments();
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/investments/${id}`);
      fetchInvestments();
    } catch (err) {
      console.error("Failed to delete investment", err.response?.status, err.response?.data || err.message);
    }
  };

  const total = useMemo(() => investments.reduce((s, i) => s + Number(i.amount || 0), 0), [investments]);
  const count = investments.length;
  const avg = count ? Math.round(total / count) : 0;

  return (
    <AppShell>
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold text-mist">Investments</h1>
          <button
            className="rounded-lg bg-[#22c0ff] px-4 py-2 font-semibold text-[#03102e]"
            onClick={onAddNew}
          >
            Add Investment
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Total Invested</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={total} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Sum of all positions</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Positions</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={count} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Total items</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Average Size</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={avg} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Per position</div>
          </TechCard>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-mist">Loading...</div>
        ) : (
          <TechCard>
            <InvestmentList investments={investments} onEdit={onEdit} onDelete={handleDelete} />
          </TechCard>
        )}

        {isOpen && (
          <InvestmentForm isOpen={isOpen} onClose={onFormClose} investment={selectedInvestment} />
        )}
      </div>
    </AppShell>
  );
};

export default InvestmentPage;

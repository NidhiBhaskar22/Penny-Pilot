import React, { useEffect, useMemo, useState } from "react";
import { useMotionValue, useSpring, useTransform } from "framer-motion";
import axiosClient from "../api/axiosClient";

import ExpenseList from "../components/expense/ExpenseList";
import ExpenseForm from "../components/expense/ExpenseForm";
import AppShell from "../components/layout/AppShell";
import AnimatedNumber from "../components/dashboard/AnimatedNumber";

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

function AnimatedNumberLocal({ value = 0, fmt = (v) => v.toLocaleString() }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 20, stiffness: 120 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  useEffect(() => {
    mv.set(Number(value || 0));
  }, [value, mv]);
  return <>{fmt(Number(rounded.get() || 0))}</>;
}

const ExpensePage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/expenses");
      const rows = Array.isArray(response.data) ? response.data : response.data?.expenses || [];
      setExpenses(rows);
    } catch (error) {
      console.error("Failed to load expenses", error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const onEdit = (expense) => {
    setSelectedExpense(expense);
    setIsOpen(true);
  };

  const onAddNew = () => {
    setSelectedExpense(null);
    setIsOpen(true);
  };

  const onFormClose = () => {
    setIsOpen(false);
    fetchExpenses();
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      console.error("Failed to delete expense", err.response?.status, err.response?.data || err.message);
    }
  };

  const total = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
  const count = expenses.length;
  const avg = count ? Math.round(total / count) : 0;

  return (
    <AppShell>
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold text-mist">Expenses</h1>
          <button
            className="rounded-lg bg-[#22c0ff] px-4 py-2 font-semibold text-[#03102e]"
            onClick={onAddNew}
          >
            Add Expense
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Total Expenses</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={total} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Sum of all entries</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Entries</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumberLocal value={count} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Total items</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Average</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumberLocal value={avg} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Per entry</div>
          </TechCard>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-mist">Loading...</div>
        ) : (
          <TechCard>
            <ExpenseList expenses={expenses} onEdit={onEdit} onDelete={handleDelete} />
          </TechCard>
        )}

        {isOpen && <ExpenseForm isOpen={isOpen} onClose={onFormClose} expense={selectedExpense} />}
      </div>
    </AppShell>
  );
};

export default ExpensePage;

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

const ExpensePage = () => {
  const DEFAULT_PAGE_SIZE = 10;
  const METHOD_OPTIONS = ["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"];
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sortBy, setSortBy] = useState("spentAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  });
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalCount: 0,
    averageAmount: 0,
  });

  const fetchExpenses = async (targetPage = page) => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/expenses", {
        params: {
          page: targetPage,
          pageSize,
          q: q || undefined,
          month: month || undefined,
          accountId: accountId || undefined,
          categoryId: categoryId || undefined,
          paymentMethod: paymentMethod || undefined,
          sortBy,
          sortOrder,
        },
      });
      const payload = response.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
        ? payload.items
        : response.data?.expenses || [];

      const nextPagination = {
        total: Number(payload?.total ?? rows.length),
        page: Number(payload?.page ?? targetPage),
        pageSize: Number(payload?.pageSize ?? pageSize),
        totalPages: Number(payload?.totalPages ?? (rows.length ? 1 : 0)),
      };

      if (nextPagination.totalPages > 0 && nextPagination.page > nextPagination.totalPages) {
        setPage(nextPagination.totalPages);
        return;
      }

      const fallbackTotalAmount = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const fallbackTotalCount = Number(nextPagination.total ?? rows.length);
      const fallbackAverageAmount = fallbackTotalCount
        ? fallbackTotalAmount / fallbackTotalCount
        : 0;

      setExpenses(rows);
      setPagination(nextPagination);
      setSummary({
        totalAmount: Number(payload?.summary?.totalAmount ?? fallbackTotalAmount),
        totalCount: Number(payload?.summary?.totalCount ?? fallbackTotalCount),
        averageAmount: Number(payload?.summary?.averageAmount ?? fallbackAverageAmount),
      });
    } catch (error) {
      console.error("Failed to load expenses", error);
      setExpenses([]);
      setPagination({ total: 0, page: targetPage, pageSize, totalPages: 0 });
      setSummary({ totalAmount: 0, totalCount: 0, averageAmount: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(page);
  }, [page, pageSize, q, month, accountId, categoryId, paymentMethod, sortBy, sortOrder]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          axiosClient.get("/accounts"),
          axiosClient.get("/categories", { params: { type: "EXPENSE" } }),
        ]);
        setAccounts(Array.isArray(accRes.data) ? accRes.data : []);
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      } catch (error) {
        console.error("Failed to load expense filters", error);
      }
    };
    loadFilterOptions();
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
    fetchExpenses(page);
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/expenses/${id}`);
      fetchExpenses(page);
    } catch (err) {
      console.error("Failed to delete expense", err.response?.status, err.response?.data || err.message);
    }
  };

  const total = useMemo(() => Number(summary.totalAmount || 0), [summary.totalAmount]);
  const count = useMemo(() => Number(summary.totalCount || 0), [summary.totalCount]);
  const avg = useMemo(() => Math.round(Number(summary.averageAmount || 0)), [summary.averageAmount]);

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
              <AnimatedNumber value={count} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Total items</div>
          </TechCard>

          <TechCard>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-sand">Average</div>
            <div className="text-2xl font-bold text-mist">
              <AnimatedNumber value={avg} />
            </div>
            <div className="mt-2 text-sm text-mist/70">Per entry</div>
          </TechCard>
        </div>

        <div className="mb-6 rounded-xl border border-[#3a63b5]/30 bg-[rgba(4,12,46,0.55)] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/70">Filters</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-8">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            />
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            />
            <select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value="">Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value="">Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value="">Method</option>
              {METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {method.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value="spentAt">Date</option>
              <option value="amount">Amount</option>
              <option value="month">Month</option>
              <option value="paidTo">Paid To</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <div className="flex gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setMonth("");
                  setAccountId("");
                  setCategoryId("");
                  setPaymentMethod("");
                  setSortBy("spentAt");
                  setSortOrder("desc");
                  setPageSize(DEFAULT_PAGE_SIZE);
                  setPage(1);
                }}
                className="rounded-md border border-[#4f87df]/40 px-3 py-2 text-sm font-semibold text-mist/90"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-mist">Loading...</div>
        ) : (
          <>
            <TechCard>
              <ExpenseList expenses={expenses} onEdit={onEdit} onDelete={handleDelete} />
            </TechCard>
            <div className="mt-4 flex items-center justify-between text-sm text-mist/80">
              <div>
                Page {pagination.page} of {pagination.totalPages || 1} • Total {pagination.total} entries
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[#4f87df]/40 px-3 py-1.5 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[#4f87df]/40 px-3 py-1.5 disabled:opacity-50"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={pagination.totalPages === 0 || page >= pagination.totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {isOpen && <ExpenseForm isOpen={isOpen} onClose={onFormClose} expense={selectedExpense} />}
      </div>
    </AppShell>
  );
};

export default ExpensePage;

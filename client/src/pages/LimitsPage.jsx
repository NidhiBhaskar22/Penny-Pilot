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

function formatLimitWindow(limit) {
  if (limit.scope === "MONTHLY") {
    return limit.month == null && limit.year == null ? "All months" : `${limit.month}/${limit.year}`;
  }
  if (limit.scope === "WEEKLY") {
    return limit.week && limit.year ? `${limit.week}/${limit.year}` : "-";
  }
  if (limit.scope === "DAILY") {
    return limit.day ? String(limit.day).slice(0, 10) : "-";
  }
  return "-";
}

const LimitsPage = () => {
  const DEFAULT_PAGE_SIZE = 10;
  const [limits, setLimits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  });

  const fetchLimits = async (targetPage = page) => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/limits", {
        params: {
          page: targetPage,
          pageSize,
          q: q || undefined,
          scope: scope || undefined,
          categoryId: categoryId || undefined,
          sortBy,
          sortOrder,
        },
      });
      const payload = response.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
        ? payload.items
        : response.data?.limits || [];

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

      setLimits(rows);
      setPagination(nextPagination);
    } catch (error) {
      console.error("Failed to load limits", error);
      setLimits([]);
      setPagination({ total: 0, page: targetPage, pageSize, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits(page);
  }, [page, pageSize, q, scope, categoryId, sortBy, sortOrder]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await axiosClient.get("/categories", { params: { type: "EXPENSE" } });
        setCategories(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Failed to load limit categories", error);
      }
    };
    loadCategories();
  }, []);

  const onEdit = (limit) => {
    setSelectedLimit(limit);
    setIsOpen(true);
  };

  const onFormClose = () => {
    setIsOpen(false);
    setSelectedLimit(null);
    fetchLimits(page);
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

        <div className="mb-6 rounded-xl border border-[#3a63b5]/30 bg-[rgba(4,12,46,0.55)] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-mist/70">Filters</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-7">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            />
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value="">Scope</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
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
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value="id">Latest</option>
              <option value="amount">Amount</option>
              <option value="scope">Scope</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
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
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] px-3 py-2 text-sm text-mist"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setScope("");
                setCategoryId("");
                setSortBy("id");
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

        {limits.length > 0 ? (
          <div>
            <div className="overflow-hidden rounded-lg border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)]">
              <table className="w-full text-left text-sm text-mist">
                <thead className="bg-[rgba(7,18,62,0.95)] uppercase tracking-wider text-xs text-mist">
                  <tr>
                    <th className="px-4 py-3"> </th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Window</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map((limit, index) => (
                    <tr
                      key={limit.id || limit._id || `${limit.category?.name || "general"}-${limit.scope}-${limit.amount}`}
                      className={index % 2 === 0 ? "bg-[rgba(7,18,62,0.78)]" : "bg-[rgba(10,25,78,0.78)]"}
                    >
                      <td className="px-4 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-brand-900 font-semibold">
                          {String(limit.category?.name || "G")[0].toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-mist">{limit.category?.name || "General"}</td>
                      <td className="px-4 py-4 font-semibold text-peach">{limit.scope || "-"}</td>
                      <td className="px-4 py-4 font-semibold text-mist">
                        INR {Number(limit.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-4 font-semibold text-mist">{formatLimitWindow(limit)}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          className="rounded-md bg-[#22c0ff] px-3 py-1.5 text-xs font-semibold text-[#03102e]"
                          onClick={() => onEdit(limit)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

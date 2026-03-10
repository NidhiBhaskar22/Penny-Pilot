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
  const DEFAULT_PAGE_SIZE = 10;
  const METHOD_OPTIONS = ["NET_BANKING", "UPI", "CASH", "DEBIT_CARD", "CREDIT_CARD"];
  const [investments, setInvestments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("");
  const [type, setType] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sortBy, setSortBy] = useState("investedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  });

  const fetchInvestments = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/investments", {
        params: {
          page: targetPage,
          pageSize,
          q: q || undefined,
          month: month || undefined,
          type: type || undefined,
          accountId: accountId || undefined,
          paymentMethod: paymentMethod || undefined,
          sortBy,
          sortOrder,
        },
      });
      const payload = res.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
        ? payload.items
        : res.data?.investments || [];

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

      setInvestments(rows);
      setPagination(nextPagination);
    } catch (e) {
      console.error("Failed to load investments", e);
      setInvestments([]);
      setPagination({ total: 0, page: targetPage, pageSize, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments(page);
  }, [page, pageSize, q, month, type, accountId, paymentMethod, sortBy, sortOrder]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const accRes = await axiosClient.get("/accounts");
        setAccounts(Array.isArray(accRes.data) ? accRes.data : []);
      } catch (error) {
        console.error("Failed to load investment filters", error);
      }
    };
    loadFilterOptions();
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
    fetchInvestments(page);
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/investments/${id}`);
      fetchInvestments(page);
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
            <input
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              placeholder="Type"
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
              <option value="investedAt">Date</option>
              <option value="amount">Amount</option>
              <option value="instrument">Instrument</option>
              <option value="month">Month</option>
              <option value="roi">ROI</option>
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
                  setType("");
                  setAccountId("");
                  setPaymentMethod("");
                  setSortBy("investedAt");
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
              <InvestmentList investments={investments} onEdit={onEdit} onDelete={handleDelete} />
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

        {isOpen && (
          <InvestmentForm isOpen={isOpen} onClose={onFormClose} investment={selectedInvestment} />
        )}
      </div>
    </AppShell>
  );
};

export default InvestmentPage;

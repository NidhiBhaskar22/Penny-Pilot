import React, { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import axiosClient from "../api/axiosClient";

const METHOD_OPTIONS = [
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "UPI", label: "UPI" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CASH", label: "Cash" },
];

function TreeNode({ node, onDelete, level = 0 }) {
  return (
    <div className="space-y-3">
      <div
        className="flex items-center justify-between rounded-xl border border-[#4f87df]/35 bg-[rgba(8,20,66,0.75)] px-4 py-3"
        style={{ marginLeft: `${level * 16}px` }}
      >
        <div>
          <div className="text-sm font-semibold text-mist">{node.name}</div>
          <div className="text-xs text-mist/70">
            {node.type}
            {node.identifier ? ` | ${node.identifier}` : ""}
            {node.balance != null ? ` | Balance: ${Number(node.balance).toLocaleString("en-IN")}` : ""}
          </div>
        </div>
        <button
          type="button"
          className="rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-200"
          onClick={() => onDelete(node.id)}
        >
          Remove
        </button>
      </div>
      {node.children?.map((child) => (
        <TreeNode key={child.id} node={child} level={level + 1} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function AccountsPage() {
  const [tree, setTree] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMethod, setSavingMethod] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedBankId, setSelectedBankId] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [bankIdentifier, setBankIdentifier] = useState("");

  const load = async () => {
    setLoading(true);
    setNotice("");
    try {
      const [treeRes, allRes] = await Promise.all([
        axiosClient.get("/accounts", { params: { tree: true } }),
        axiosClient.get("/accounts"),
      ]);
      const all = Array.isArray(allRes.data) ? allRes.data : [];
      const bankRoots = all.filter(
        (a) => String(a.type).toUpperCase() === "BANK" && a.parentId == null
      );
      setAllAccounts(all);
      setTree(Array.isArray(treeRes.data) ? treeRes.data : []);
      setBanks(bankRoots);
      if (!selectedBankId && bankRoots[0]?.id) {
        setSelectedBankId(String(bankRoots[0].id));
      }
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedBank = useMemo(
    () => banks.find((b) => String(b.id) === String(selectedBankId)) || null,
    [banks, selectedBankId]
  );

  const enabledMethods = useMemo(
    () =>
      allAccounts.filter(
        (a) => a.parentId != null && String(a.parentId) === String(selectedBankId)
      ),
    [allAccounts, selectedBankId]
  );

  const isMethodEnabled = (type) =>
    enabledMethods.some((m) => String(m.type).toUpperCase() === String(type).toUpperCase());

  const onCreate = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!name.trim()) {
      setNotice("Name is required");
      return;
    }

    try {
      setSaving(true);
      await axiosClient.post("/accounts", {
        type: "BANK",
        name: name.trim(),
        identifier: bankIdentifier.trim() || null,
        parentId: null,
        balance: openingBalance ? Number(openingBalance) : 0,
      });
      setName("");
      setBankIdentifier("");
      setOpeningBalance("");
      await load();
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  const toggleMethod = async (methodType, enabled) => {
    if (!selectedBank) {
      setNotice("Select a bank account first");
      return;
    }

    const existing = enabledMethods.find(
      (m) => String(m.type).toUpperCase() === methodType.toUpperCase()
    );
    setNotice("");
    setSavingMethod(methodType);
    try {
      if (enabled && !existing) {
        const label = METHOD_OPTIONS.find((x) => x.value === methodType)?.label || methodType;
        await axiosClient.post("/accounts", {
          type: methodType,
          name: `${selectedBank.name} ${label}`,
          parentId: Number(selectedBank.id),
          balance: 0,
        });
      }

      if (!enabled && existing) {
        await axiosClient.delete(`/accounts/${existing.id}`);
      }
      await load();
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to update payment method");
    } finally {
      setSavingMethod("");
    }
  };

  const onDelete = async (id) => {
    try {
      await axiosClient.delete(`/accounts/${id}`);
      await load();
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to remove account");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto mt-12 max-w-6xl space-y-6 px-4">
        <div className="rounded-2xl border border-[#3a63b5]/45 bg-[rgba(4,12,46,0.9)] p-6">
          <h1 className="text-3xl font-extrabold text-mist">Funds & Accounts</h1>
          <p className="mt-2 text-sm text-mist/70">
            Add bank accounts, then enable payment methods per bank.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={onCreate}
            className="rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-6 space-y-4"
          >
            <div className="text-lg font-semibold text-mist">Add Bank Account</div>

            <div>
              <label className="mb-1 block text-sm text-mist">Name</label>
              <input
                className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                placeholder="HDFC Savings"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-mist">Identifier (optional)</label>
              <input
                className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                placeholder="Last 4 / note"
                value={bankIdentifier}
                onChange={(e) => setBankIdentifier(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-mist">Opening Balance (optional)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </div>

            {notice ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              className="rounded-lg bg-[#22c0ff] px-4 py-2 font-semibold text-[#03102e] disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving..." : "Add Bank"}
            </button>
          </form>

          <div className="rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-6">
            <div className="mb-4 text-lg font-semibold text-mist">Payment Methods by Bank</div>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-mist">Select Bank</label>
              <select
                className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
              >
                <option value="">Select bank</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBank ? (
              <div className="space-y-3 rounded-xl border border-[#4f87df]/30 bg-[rgba(8,20,66,0.6)] p-4">
                <div className="text-sm font-semibold text-mist">{selectedBank.name}</div>
                {METHOD_OPTIONS.map((opt) => {
                  const enabled = isMethodEnabled(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex items-center justify-between rounded-md border border-[#4f87df]/25 bg-[rgba(8,20,66,0.5)] px-3 py-2 text-sm text-mist"
                    >
                      <span>{opt.label}</span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={savingMethod === opt.value}
                        onChange={(e) => toggleMethod(opt.value, e.target.checked)}
                      />
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-mist/70">Add/select a bank account to enable methods.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)] p-6">
          <div className="mb-4 text-lg font-semibold text-mist">Configured Structure</div>
          {loading ? (
            <div className="text-mist/70">Loading...</div>
          ) : tree.length ? (
            <div className="space-y-3">
              {tree
                .filter((node) => String(node.type).toUpperCase() === "BANK")
                .map((node) => (
                  <TreeNode key={node.id} node={node} onDelete={onDelete} />
                ))}
            </div>
          ) : (
            <div className="text-mist/70">No accounts yet.</div>
          )}
        </div>

        <div className="text-xs text-mist/60">
          Note: Disabling a method removes it only if it has no linked transactions.
        </div>
      </div>
    </AppShell>
  );
}

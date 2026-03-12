import React, { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import axiosClient from "../api/axiosClient";

const METHOD_OPTIONS = [
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "UPI", label: "UPI" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CASH", label: "Cash" },
];

export default function AccountsPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [bankIdentifier, setBankIdentifier] = useState("");
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editIdentifier, setEditIdentifier] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editMethods, setEditMethods] = useState([]);

  const load = async () => {
    setLoading(true);
    setNotice("");
    try {
      const allRes = await axiosClient.get("/accounts");
      const all = Array.isArray(allRes.data) ? allRes.data : [];
      setBanks(all);
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (bank) => {
    setEditingId(bank.id);
    setEditName(bank.name || "");
    setEditIdentifier(bank.identifier || "");
    setEditBalance(bank.balance != null ? String(bank.balance) : "0");
    setEditMethods(Array.isArray(bank.enabledMethods) ? bank.enabledMethods : []);
    setNotice("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditIdentifier("");
    setEditBalance("");
    setEditMethods([]);
  };

  const onCreate = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!name.trim()) {
      setNotice("Name is required");
      return;
    }
    if (!selectedMethods.length) {
      setNotice("Enable at least one payment method while creating the account");
      return;
    }

    try {
      setSaving(true);
      await axiosClient.post("/accounts", {
        name: name.trim(),
        identifier: bankIdentifier.trim() || null,
        balance: openingBalance ? Number(openingBalance) : 0,
        methods: selectedMethods,
      });
      setName("");
      setBankIdentifier("");
      setOpeningBalance("");
      setSelectedMethods([]);
      await load();
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  const toggleEditMethod = (methodType, enabled) => {
    setEditMethods((prev) => {
      if (enabled) return Array.from(new Set([...prev, methodType]));
      return prev.filter((m) => m !== methodType);
    });
  };

  const toggleCreateMethod = (methodType, enabled) => {
    setSelectedMethods((prev) => {
      if (enabled) return Array.from(new Set([...prev, methodType]));
      return prev.filter((m) => m !== methodType);
    });
  };

  const onSaveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim()) {
      setNotice("Name is required");
      return;
    }
    setSavingEdit(true);
    setNotice("");
    try {
      await Promise.all([
        axiosClient.put(`/accounts/${editingId}`, {
          name: editName.trim(),
          identifier: editIdentifier.trim() || null,
          balance: editBalance === "" ? 0 : Number(editBalance),
        }),
        axiosClient.put(`/accounts/${editingId}/methods`, { methods: editMethods }),
      ]);
      cancelEdit();
      await load();
    } catch (err) {
      setNotice(err.response?.data?.message || "Failed to update account");
    } finally {
      setSavingEdit(false);
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
            Add bank accounts and enable the payment methods they support at creation time.
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

            <div>
              <div className="mb-2 block text-sm text-mist">Enable Payment Methods</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {METHOD_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center justify-between rounded-md border border-[#4f87df]/25 bg-[rgba(8,20,66,0.5)] px-3 py-2 text-sm text-mist"
                  >
                    <span>{opt.label}</span>
                    <input
                      type="checkbox"
                      checked={selectedMethods.includes(opt.value)}
                      onChange={(e) => toggleCreateMethod(opt.value, e.target.checked)}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs text-mist/60">
                Select the methods this account should allow for future transactions.
              </div>
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
            <div className="mb-4 text-lg font-semibold text-mist">Configured Accounts</div>
            {loading ? (
              <div className="text-mist/70">Loading...</div>
            ) : banks.length ? (
              <div className="overflow-hidden rounded-lg border border-[#3a63b5]/40 bg-[rgba(4,12,46,0.88)]">
                <table className="w-full text-left text-sm text-mist">
                  <thead className="bg-[rgba(7,18,62,0.95)] uppercase tracking-wider text-xs text-mist">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Identifier</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Methods</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banks.map((bank, index) => {
                      const isEditing = editingId === bank.id;
                      const rowClass =
                        index % 2 === 0 ? "bg-[rgba(7,18,62,0.78)]" : "bg-[rgba(10,25,78,0.78)]";
                      return (
                        <React.Fragment key={bank.id}>
                          <tr className={rowClass}>
                            <td className="px-4 py-4 font-semibold text-mist">{bank.name}</td>
                            <td className="px-4 py-4 text-mist/80">{bank.identifier || "-"}</td>
                            <td className="px-4 py-4 font-semibold text-mist">
                              INR {Number(bank.balance || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-4 text-mist/80">
                              {(bank.enabledMethods || []).length
                                ? bank.enabledMethods.map((m) => m.replaceAll("_", " ")).join(", ")
                                : "No methods enabled"}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                className="rounded-md border border-[#4f87df]/45 px-3 py-1.5 text-xs font-semibold text-cyan-200"
                                onClick={() => startEdit(bank)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ml-2 rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-200"
                                onClick={() => onDelete(bank.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                          {isEditing ? (
                            <tr className="bg-[rgba(5,14,52,0.92)]">
                              <td className="px-4 py-4" colSpan={5}>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <input
                                      className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      placeholder="Account name"
                                    />
                                    <input
                                      className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                                      value={editIdentifier}
                                      onChange={(e) => setEditIdentifier(e.target.value)}
                                      placeholder="Identifier (optional)"
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg border border-[#4f87df]/40 bg-[rgba(8,20,66,0.82)] px-3 py-2 text-mist"
                                      value={editBalance}
                                      onChange={(e) => setEditBalance(e.target.value)}
                                      placeholder="Balance"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {METHOD_OPTIONS.map((opt) => (
                                      <label
                                        key={opt.value}
                                        className="flex items-center justify-between rounded-md border border-[#4f87df]/25 bg-[rgba(8,20,66,0.5)] px-3 py-2 text-sm text-mist"
                                      >
                                        <span>{opt.label}</span>
                                        <input
                                          type="checkbox"
                                          checked={editMethods.includes(opt.value)}
                                          onChange={(e) => toggleEditMethod(opt.value, e.target.checked)}
                                        />
                                      </label>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      className="rounded-lg bg-[#22c0ff] px-3 py-2 text-sm font-semibold text-[#03102e] disabled:opacity-60"
                                      onClick={onSaveEdit}
                                      disabled={savingEdit}
                                    >
                                      {savingEdit ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-mist"
                                      onClick={cancelEdit}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-mist/70">
                No accounts yet. Create one and enable its payment methods to get started.
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-mist/60">
          Note: Disabling a method removes it only if it has no linked transactions.
        </div>
      </div>
    </AppShell>
  );
}

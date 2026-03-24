import React, { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title = "Confirm action",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgb(var(--pp-ink-rgb)/0.42)] px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" aria-hidden="true" onClick={loading ? undefined : onCancel} />
      <div className="app-modal relative w-full max-w-md overflow-hidden rounded-[24px]">
        <div className="relative p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[rgb(var(--pp-brand-400-rgb)/0.64)]">
            Confirmation
          </div>
          <h2 className="mt-2 text-xl font-semibold text-mist">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-mist/62">{message}</p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border border-[rgb(var(--pp-border-rgb)/0.24)] px-4 py-2 text-sm font-semibold text-mist disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="app-danger-button rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
